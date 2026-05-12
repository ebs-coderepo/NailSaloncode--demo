import { z } from 'zod';
import { Prisma } from '@prisma/client';
import {
  findTenantBySlug,
  findTenantById,
  findPublicServices,
  findPublicStaff,
  findEligibleStaff,
  findScheduleOverride,
  findAppointmentsForDay,
  findBlockedTimesForDay,
  findOrCreateCustomer,
  findServiceById,
  findStaffById,
  createPublicAppointment,
  findAppointmentByCancelToken,
  cancelAppointmentByToken,
  rescheduleAppointment,
  findAppointmentForReview,
  createReview,
  findPublicReviews,
} from './public.repository';
import { AppError } from '../../shared/utils/AppError';
import { ErrorCode } from '../../shared/types/api.types';

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const AvailabilityQuerySchema = z.object({
  serviceId: z.string().min(1),
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  staffId:   z.string().optional(),
});

export const BookingSchema = z.object({
  serviceId: z.string().min(1),
  staffId:   z.string().min(1),
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time:      z.string().regex(/^\d{2}:\d{2}$/),
  customer: z.object({
    name:  z.string().min(1).max(100),
    phone: z.string().min(7).max(30),
    email: z.string().email().optional().nullable(),
  }),
  notes: z.string().max(500).optional().nullable(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Timezone utility — converts local salon time to UTC
// Uses the sv-SE locale trick: it returns "YYYY-MM-DD HH:MM:SS" reliably.
// ─────────────────────────────────────────────────────────────────────────────

function localToUTC(dateStr: string, timeStr: string, timezone: string): Date {
  // Step 1: create a Date treating the input as UTC
  const naiveUTC = new Date(`${dateStr}T${timeStr}:00Z`);

  // Step 2: find what that UTC moment looks like in the target timezone
  const displayedLocal = naiveUTC.toLocaleString('sv-SE', { timeZone: timezone }); // "YYYY-MM-DD HH:MM:SS"
  const displayedUTC   = new Date(displayedLocal.replace(' ', 'T') + 'Z');

  // Step 3: the offset = what timezone displays - what we fed in as "UTC"
  const offset = displayedUTC.getTime() - naiveUTC.getTime();

  // Step 4: subtract offset → real UTC equivalent of the local time
  return new Date(naiveUTC.getTime() - offset);
}

// Parse "HH:MM" into minutes since midnight
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Format minutes since midnight back to "HH:MM"
function fromMinutes(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Business-hours helper
// ─────────────────────────────────────────────────────────────────────────────

type DayHours = { open: string; close: string } | null;

function getSalonDayHours(businessHours: Prisma.JsonValue | null, dayOfWeek: number): DayHours {
  if (!businessHours || typeof businessHours !== 'object' || Array.isArray(businessHours)) return null;
  const bh = businessHours as Record<string, unknown>;
  const entry = bh[String(dayOfWeek)];
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
  const e = entry as Record<string, unknown>;
  if (typeof e['open'] !== 'string' || typeof e['close'] !== 'string') return null;
  return { open: e['open'], close: e['close'] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Availability engine
// ─────────────────────────────────────────────────────────────────────────────

export type SlotResult = {
  time:  string;           // "HH:MM" in salon local time
  staff: { id: string; name: string }[];
};

export async function getAvailability(
  slug: string,
  query: z.infer<typeof AvailabilityQuerySchema>,
): Promise<SlotResult[]> {
  const tenant = await findTenantBySlug(slug);
  if (!tenant) throw new AppError('Salon not found', 404, ErrorCode.TENANT_NOT_FOUND);
  if (!tenant.bookingEnabled) throw new AppError('Online booking is not available', 400, ErrorCode.VALIDATION_ERROR);

  // Parse the requested date
  const [yr, mo, dy] = query.date.split('-').map(Number);
  const dayOfWeek = new Date(yr, mo - 1, dy).getDay(); // local — safe for day-of-week

  // Check salon is open that day
  const salonDay = getSalonDayHours(tenant.businessHours, dayOfWeek);
  if (!salonDay) return []; // Salon closed

  const salonOpenMin  = toMinutes(salonDay.open);
  const salonCloseMin = toMinutes(salonDay.close);

  // Get eligible staff
  const eligibleStaff = await findEligibleStaff(tenant.id, query.serviceId);
  if (eligibleStaff.length === 0) return [];

  // Get service duration
  const service = await findServiceById(tenant.id, query.serviceId);
  if (!service) return [];
  const durationMins = service.duration;

  // Day boundaries in UTC (for DB queries)
  const dayStartUTC = localToUTC(query.date, '00:00', tenant.timezone);
  const dayEndUTC   = new Date(dayStartUTC.getTime() + 24 * 60 * 60 * 1000);

  // Lead-time cutoff — can't book in the past or within lead window
  const cutoffUTC = new Date(Date.now() + tenant.bookingLeadMinutes * 60 * 1000);

  // Collect slots per time → available staff
  const slotMap = new Map<string, { id: string; name: string }[]>();

  for (const staff of eligibleStaff) {
    // Filter to specific staff if requested
    if (query.staffId && staff.id !== query.staffId) continue;

    // Find staff working hours for this day
    const workHours = staff.workingHours.find((wh) => wh.dayOfWeek === dayOfWeek);
    if (!workHours || !workHours.isWorking) continue;

    // Check schedule override
    const override = await findScheduleOverride(staff.id, new Date(`${query.date}T00:00:00Z`));
    if (override && !override.isWorking) continue;

    const staffOpenMin  = override?.startTime ? toMinutes(override.startTime) : toMinutes(workHours.startTime);
    const staffCloseMin = override?.endTime   ? toMinutes(override.endTime)   : toMinutes(workHours.endTime);

    // Effective window = intersection of staff hours and salon hours
    const windowStart = Math.max(staffOpenMin, salonOpenMin);
    const windowEnd   = Math.min(staffCloseMin, salonCloseMin);
    if (windowStart >= windowEnd) continue;

    // Fetch busy intervals
    const [appts, blocks] = await Promise.all([
      findAppointmentsForDay(tenant.id, staff.id, dayStartUTC, dayEndUTC),
      findBlockedTimesForDay(tenant.id, staff.id, dayStartUTC, dayEndUTC),
    ]);

    // Convert busy intervals to local minutes
    const busyIntervals: { start: number; end: number }[] = [
      ...appts.map((a) => ({
        start: minutesFromUTC(a.startTime, tenant.timezone, query.date),
        end:   minutesFromUTC(a.endTime,   tenant.timezone, query.date),
      })),
      ...blocks.map((b) => ({
        start: minutesFromUTC(b.startTime, tenant.timezone, query.date),
        end:   minutesFromUTC(b.endTime,   tenant.timezone, query.date),
      })),
    ];

    // Generate 30-minute slots
    for (let slotStart = windowStart; slotStart + durationMins <= windowEnd; slotStart += 30) {
      const slotEnd = slotStart + durationMins;

      // Skip if in the past / within lead time
      const slotUTC = localToUTC(query.date, fromMinutes(slotStart), tenant.timezone);
      if (slotUTC < cutoffUTC) continue;

      // Skip if overlaps any busy interval
      const busy = busyIntervals.some((b) => slotStart < b.end && slotEnd > b.start);
      if (busy) continue;

      const key = fromMinutes(slotStart);
      if (!slotMap.has(key)) slotMap.set(key, []);
      slotMap.get(key)!.push({ id: staff.id, name: staff.name });
    }
  }

  // Sort by time and return
  return Array.from(slotMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, staff]) => ({ time, staff }));
}

// Convert a UTC Date to minutes-since-midnight in the salon's local timezone
function minutesFromUTC(utcDate: Date, timezone: string, _dateStr: string): number {
  const localStr = utcDate.toLocaleString('sv-SE', { timeZone: timezone }); // "YYYY-MM-DD HH:MM:SS"
  const [, timePart] = localStr.split(' ');
  return toMinutes(timePart.substring(0, 5));
}

// ─────────────────────────────────────────────────────────────────────────────
// Salon info
// ─────────────────────────────────────────────────────────────────────────────

export async function getSalonInfo(slug: string) {
  const tenant = await findTenantBySlug(slug);
  if (!tenant) throw new AppError('Salon not found', 404, ErrorCode.TENANT_NOT_FOUND);

  const [services, staffList, reviews] = await Promise.all([
    findPublicServices(tenant.id),
    findPublicStaff(tenant.id),
    tenant.reviewsEnabled ? findPublicReviews(tenant.id) : Promise.resolve([]),
  ]);

  return {
    salon: {
      name:             tenant.name,
      slug:             tenant.slug,
      tagline:          tenant.tagline,
      phone:            tenant.phone,
      email:            tenant.email,
      address:          tenant.address,
      timezone:         tenant.timezone,
      logoUrl:          tenant.logoUrl,
      coverImageUrl:    tenant.coverImageUrl,
      primaryColor:     tenant.primaryColor,
      theme:            tenant.theme,
      socialInstagram:  tenant.socialInstagram,
      socialFacebook:   tenant.socialFacebook,
      socialWebsite:    tenant.socialWebsite,
      businessHours:    tenant.businessHours,
      bookingEnabled:   tenant.bookingEnabled,
      bookingNotesEnabled: tenant.bookingNotesEnabled,
      bookingLeadMinutes:  tenant.bookingLeadMinutes,
      bookingMaxDaysAhead: tenant.bookingMaxDaysAhead,
      siteEnabled:         tenant.siteEnabled,
      galleryImages:       tenant.galleryImages,
      reviewsEnabled:      tenant.reviewsEnabled,
      reviewsShowRating:   tenant.reviewsShowRating,
    },
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      duration: s.duration,
      durationDisplay: formatDuration(s.duration),
      price: formatCurrency(parseFloat(s.price.toString())),
    })),
    staff: staffList.map((s) => ({
      id: s.id,
      name: s.name,
      bio: s.bio,
      experienceYears: s.experienceYears,
      specialties: s.specialties,
      averageRating: s.averageRating ? parseFloat(s.averageRating.toString()) : null,
      ratingCount: s.ratingCount,
      serviceIds: s.staffServices.map((ss) => ss.serviceId),
    })),
    reviews: reviews.map((r) => ({
      id:           r.id,
      rating:       r.rating,
      comment:      r.comment,
      customerName: r.customerName,
      staffName:    r.staff.name,
      createdAt:    r.createdAt.toISOString(),
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Booking creation
// ─────────────────────────────────────────────────────────────────────────────

export async function createBooking(slug: string, input: z.infer<typeof BookingSchema>) {
  const tenant = await findTenantBySlug(slug);
  if (!tenant) throw new AppError('Salon not found', 404, ErrorCode.TENANT_NOT_FOUND);
  if (!tenant.bookingEnabled) throw new AppError('Online booking is not available', 400, ErrorCode.VALIDATION_ERROR);

  const service = await findServiceById(tenant.id, input.serviceId);
  if (!service) throw new AppError('Service not found', 404, ErrorCode.SERVICE_NOT_FOUND);

  const staff = await findStaffById(tenant.id, input.staffId);
  if (!staff) throw new AppError('Staff not found', 404, ErrorCode.STAFF_NOT_FOUND);

  // Verify slot is still available (prevent double booking)
  const available = await getAvailability(slug, {
    serviceId: input.serviceId,
    date:      input.date,
    staffId:   input.staffId,
  });
  const slotOk = available.some((slot) => slot.time === input.time);
  if (!slotOk) throw new AppError('This time slot is no longer available', 409, ErrorCode.SLOT_TAKEN);

  const startUTC = localToUTC(input.date, input.time, tenant.timezone);
  const endUTC   = new Date(startUTC.getTime() + service.duration * 60 * 1000);

  const customer = await findOrCreateCustomer(tenant.id, {
    name:  input.customer.name,
    phone: input.customer.phone,
    email: input.customer.email,
  });

  const appt = await createPublicAppointment({
    tenantId:   tenant.id,
    customerId: customer.id,
    staffId:    input.staffId,
    serviceId:  input.serviceId,
    startTime:  startUTC,
    endTime:    endUTC,
    notes:      input.notes,
  });

  return {
    id:        appt.id,
    status:    appt.status,
    startTime: appt.startTime.toISOString(),
    endTime:   appt.endTime.toISOString(),
    customer:  appt.customer,
    staff:     appt.staff,
    service: {
      name:     appt.service.name,
      duration: appt.service.duration,
      price:    formatCurrency(parseFloat(appt.service.price.toString())),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Cancel appointment
// ─────────────────────────────────────────────────────────────────────────────

export const CancelSchema = z.object({
  reason: z.string().max(300).optional().nullable(),
});

export async function getAppointmentByToken(cancelToken: string) {
  const appt = await findAppointmentByCancelToken(cancelToken);
  if (!appt) throw new AppError('Appointment not found', 404, ErrorCode.NOT_FOUND);
  return {
    id: appt.id,
    status: appt.status,
    startTime: appt.startTime.toISOString(),
    endTime:   appt.endTime.toISOString(),
    customer:  appt.customer,
    staff:     appt.staff,
    service: {
      name:     appt.service.name,
      duration: appt.service.duration,
      price:    formatCurrency(parseFloat((appt.service.price as any).toString())),
    },
  };
}

export async function cancelAppointment(cancelToken: string, reason?: string | null) {
  const appt = await findAppointmentByCancelToken(cancelToken);
  if (!appt) throw new AppError('Appointment not found', 404, ErrorCode.NOT_FOUND);
  if (appt.status === 'CANCELLED') throw new AppError('Appointment is already cancelled', 400, ErrorCode.VALIDATION_ERROR);
  if (appt.status === 'COMPLETED') throw new AppError('Cannot cancel a completed appointment', 400, ErrorCode.VALIDATION_ERROR);
  return cancelAppointmentByToken(cancelToken, reason);
}

// ─────────────────────────────────────────────────────────────────────────────
// Reschedule appointment
// ─────────────────────────────────────────────────────────────────────────────

export const RescheduleSchema = z.object({
  date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time:    z.string().regex(/^\d{2}:\d{2}$/),
  staffId: z.string().min(1),
});

export async function rescheduleByToken(cancelToken: string, input: z.infer<typeof RescheduleSchema>) {
  const appt = await findAppointmentByCancelToken(cancelToken);
  if (!appt) throw new AppError('Appointment not found', 404, ErrorCode.NOT_FOUND);
  if (appt.status === 'CANCELLED') throw new AppError('Cannot reschedule a cancelled appointment', 400, ErrorCode.VALIDATION_ERROR);
  if (appt.status === 'COMPLETED') throw new AppError('Cannot reschedule a completed appointment', 400, ErrorCode.VALIDATION_ERROR);

  const tenantRecord = await findTenantById(appt.tenantId);
  if (!tenantRecord) throw new AppError('Salon not found', 404, ErrorCode.TENANT_NOT_FOUND);

  // Validate slot is available
  const available = await getAvailability(tenantRecord.slug, {
    serviceId: (appt.service as any).id,
    date:      input.date,
    staffId:   input.staffId,
  });
  const slotOk = available.some((s) => s.time === input.time);
  if (!slotOk) throw new AppError('This time slot is no longer available', 409, ErrorCode.SLOT_TAKEN);

  const startUTC = localToUTC(input.date, input.time, tenantRecord.timezone);
  const endUTC   = new Date(startUTC.getTime() + appt.service.duration * 60 * 1000);

  const newAppt = await rescheduleAppointment(appt.id, {
    tenantId:   appt.tenantId,
    customerId: appt.customer.id,
    staffId:    input.staffId,
    serviceId:  appt.service.id,
    startTime:  startUTC,
    endTime:    endUTC,
  });

  return {
    id:          newAppt.id,
    status:      newAppt.status,
    cancelToken: newAppt.cancelToken,
    startTime:   newAppt.startTime.toISOString(),
    endTime:     newAppt.endTime.toISOString(),
    customer:    newAppt.customer,
    staff:       newAppt.staff,
    service: {
      name:     newAppt.service.name,
      duration: newAppt.service.duration,
      price:    formatCurrency(parseFloat((newAppt.service.price as any).toString())),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Review submission
// ─────────────────────────────────────────────────────────────────────────────

export const ReviewSubmitSchema = z.object({
  rating:  z.number().int().min(1).max(5),
  comment: z.string().max(800).optional().nullable(),
});

export async function getAppointmentForReview(cancelToken: string) {
  const appt = await findAppointmentForReview(cancelToken);
  if (!appt) throw new AppError('Appointment not found', 404, ErrorCode.NOT_FOUND);
  return {
    alreadyReviewed: !!appt.review,
    status:   appt.status,
    customer: appt.customer.name,
    staff:    appt.staff.name,
    service:  appt.service.name,
  };
}

export async function submitReview(cancelToken: string, input: z.infer<typeof ReviewSubmitSchema>) {
  const appt = await findAppointmentForReview(cancelToken);
  if (!appt) throw new AppError('Appointment not found', 404, ErrorCode.NOT_FOUND);
  if (appt.status !== 'COMPLETED') throw new AppError('You can only review a completed appointment', 400, ErrorCode.VALIDATION_ERROR);
  if (appt.review) throw new AppError('You have already submitted a review for this appointment', 409, ErrorCode.VALIDATION_ERROR);

  return createReview({
    tenantId:      appt.tenantId,
    appointmentId: appt.id,
    customerId:    appt.customerId,
    staffId:       appt.staffId,
    rating:        input.rating,
    comment:       input.comment,
    customerName:  appt.customer.name,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Public reviews (for landing page)
// ─────────────────────────────────────────────────────────────────────────────

export async function getPublicReviews(slug: string) {
  const tenant = await findTenantBySlug(slug);
  if (!tenant) throw new AppError('Salon not found', 404, ErrorCode.TENANT_NOT_FOUND);
  const reviews = await findPublicReviews(tenant.id);
  return reviews.map((r) => ({
    id:           r.id,
    rating:       r.rating,
    comment:      r.comment,
    customerName: r.customerName,
    staffName:    r.staff.name,
    createdAt:    r.createdAt.toISOString(),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────────────

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

import { prisma } from '../../shared/db/prismaClient';
import { Prisma } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Public Repository — no auth; scoped by slug only.
// NEVER returns sensitive fields (apiKey, passwordHash, etc.)
// ─────────────────────────────────────────────────────────────────────────────

const TENANT_SELECT = {
  id: true, name: true, slug: true, phone: true, email: true,
  address: true, timezone: true, tagline: true, logoUrl: true,
  coverImageUrl: true, primaryColor: true, theme: true,
  socialInstagram: true, socialFacebook: true, socialWebsite: true,
  businessHours: true, bookingEnabled: true, bookingNotesEnabled: true,
  bookingLeadMinutes: true, bookingMaxDaysAhead: true,
  siteEnabled: true, galleryImages: true,
  reviewsEnabled: true, reviewsAutoApprove: true, reviewsShowRating: true,
} as const;

export type PublicTenant = {
  id: string; name: string; slug: string; phone: string | null; email: string | null;
  address: string | null; timezone: string; tagline: string | null; logoUrl: string | null;
  coverImageUrl: string | null; primaryColor: string; theme: string;
  socialInstagram: string | null; socialFacebook: string | null; socialWebsite: string | null;
  businessHours: Prisma.JsonValue | null; bookingEnabled: boolean; bookingNotesEnabled: boolean;
  bookingLeadMinutes: number; bookingMaxDaysAhead: number;
  siteEnabled: boolean; galleryImages: Prisma.JsonValue | null;
  reviewsEnabled: boolean; reviewsAutoApprove: boolean; reviewsShowRating: boolean;
};

export async function findTenantById(id: string): Promise<PublicTenant | null> {
  return prisma.tenant.findFirst({ where: { id, isActive: true }, select: TENANT_SELECT });
}

export async function findTenantBySlug(slug: string): Promise<PublicTenant | null> {
  return prisma.tenant.findUnique({ where: { slug, isActive: true }, select: TENANT_SELECT });
}

export async function findPublicServices(tenantId: string) {
  return prisma.service.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true, description: true, duration: true, price: true },
    orderBy: { name: 'asc' },
  });
}

export async function findPublicStaff(tenantId: string) {
  return prisma.staff.findMany({
    where: { tenantId, isActive: true },
    select: {
      id: true, name: true, bio: true,
      experienceYears: true, specialties: true,
      averageRating: true, ratingCount: true,
      staffServices: { select: { serviceId: true } },
    },
    orderBy: { name: 'asc' },
  });
}

// For availability: staff who can perform a given service
export async function findEligibleStaff(tenantId: string, serviceId: string) {
  return prisma.staff.findMany({
    where: {
      tenantId,
      isActive: true,
      staffServices: { some: { serviceId } },
    },
    select: {
      id: true,
      name: true,
      workingHours: { select: { dayOfWeek: true, startTime: true, endTime: true, isWorking: true } },
    },
  });
}

export async function findScheduleOverride(staffId: string, date: Date) {
  return prisma.scheduleOverride.findFirst({
    where: { staffId, date },
    select: { isWorking: true, startTime: true, endTime: true },
  });
}

export async function findAppointmentsForDay(tenantId: string, staffId: string, dayStart: Date, dayEnd: Date) {
  return prisma.appointment.findMany({
    where: {
      tenantId,
      staffId,
      status: { in: ['CONFIRMED', 'PENDING'] },
      startTime: { gte: dayStart, lt: dayEnd },
    },
    select: { startTime: true, endTime: true },
  });
}

export async function findBlockedTimesForDay(tenantId: string, staffId: string, dayStart: Date, dayEnd: Date) {
  return prisma.blockedTime.findMany({
    where: {
      tenantId,
      staffId,
      startTime: { gte: dayStart, lt: dayEnd },
    },
    select: { startTime: true, endTime: true },
  });
}

// Find or create a customer by phone within a tenant
export async function findOrCreateCustomer(tenantId: string, data: {
  name: string;
  phone: string;
  email?: string | null;
}) {
  const existing = await prisma.customer.findFirst({ where: { tenantId, phone: data.phone } });
  if (existing) return existing;
  return prisma.customer.create({
    data: { tenantId, name: data.name, phone: data.phone, email: data.email ?? null },
  });
}

export async function findServiceById(tenantId: string, serviceId: string) {
  return prisma.service.findFirst({
    where: { tenantId, id: serviceId, isActive: true },
    select: { id: true, name: true, duration: true, price: true },
  });
}

export async function findStaffById(tenantId: string, staffId: string) {
  return prisma.staff.findFirst({
    where: { tenantId, id: staffId, isActive: true },
    select: { id: true, name: true },
  });
}

// ── Cancel / Reschedule ───────────────────────────────────────────────────────

export async function findAppointmentByCancelToken(cancelToken: string) {
  return prisma.appointment.findUnique({
    where: { cancelToken },
    select: {
      id: true, tenantId: true, status: true,
      startTime: true, endTime: true,
      cancelToken: true,
      customer: { select: { id: true, name: true, phone: true } },
      staff:    { select: { id: true, name: true } },
      service:  { select: { id: true, name: true, duration: true, price: true } },
    },
  });
}

export async function cancelAppointmentByToken(cancelToken: string, reason?: string | null) {
  return prisma.appointment.update({
    where: { cancelToken },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelReason: reason ?? null,
    },
    select: { id: true, status: true },
  });
}

export async function rescheduleAppointment(
  oldId: string,
  data: {
    tenantId: string;
    customerId: string;
    staffId: string;
    serviceId: string;
    startTime: Date;
    endTime: Date;
    notes?: string | null;
  },
) {
  // Cancel the old one and create a new appointment linked to it
  const [, newAppt] = await prisma.$transaction([
    prisma.appointment.update({
      where: { id: oldId },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: 'Rescheduled by customer' },
    }),
    prisma.appointment.create({
      data: {
        tenantId:         data.tenantId,
        customerId:       data.customerId,
        staffId:          data.staffId,
        serviceId:        data.serviceId,
        startTime:        data.startTime,
        endTime:          data.endTime,
        status:           'CONFIRMED',
        bookedVia:        'web',
        notes:            data.notes ?? null,
        rescheduledFromId: oldId,
      },
      select: {
        id: true, startTime: true, endTime: true, status: true, cancelToken: true,
        customer: { select: { name: true, phone: true } },
        staff:    { select: { name: true } },
        service:  { select: { name: true, duration: true, price: true } },
      },
    }),
  ]);
  return newAppt;
}

// ── Review submission ────────────────────────────────────────────────────────

export async function findAppointmentForReview(cancelToken: string) {
  return prisma.appointment.findUnique({
    where: { cancelToken },
    select: {
      id: true, tenantId: true, status: true,
      customerId: true, staffId: true, serviceId: true,
      review: { select: { id: true } },
      customer: { select: { name: true } },
      staff:    { select: { name: true } },
      service:  { select: { name: true } },
    },
  });
}

export async function createReview(data: {
  tenantId: string;
  appointmentId: string;
  customerId: string;
  staffId: string;
  rating: number;
  comment?: string | null;
  customerName: string;
}) {
  const review = await prisma.review.create({
    data: {
      tenantId:     data.tenantId,
      appointmentId: data.appointmentId,
      customerId:   data.customerId,
      staffId:      data.staffId,
      rating:       data.rating,
      comment:      data.comment ?? null,
      customerName: data.customerName,
    },
    select: { id: true, rating: true, comment: true, customerName: true, createdAt: true },
  });

  // Update cached average rating on the staff member
  const allStaffReviews = await prisma.review.findMany({
    where: { staffId: data.staffId, isVisible: true },
    select: { rating: true },
  });
  const avg = allStaffReviews.reduce((sum, r) => sum + r.rating, 0) / allStaffReviews.length;
  await prisma.staff.update({
    where: { id: data.staffId },
    data: {
      averageRating: parseFloat(avg.toFixed(2)),
      ratingCount: allStaffReviews.length,
    },
  });

  return review;
}

export async function findPublicReviews(tenantId: string) {
  return prisma.review.findMany({
    where: { tenantId, isVisible: true },
    select: {
      id: true, rating: true, comment: true, customerName: true, createdAt: true,
      staff: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}

export async function createPublicAppointment(data: {
  tenantId: string;
  customerId: string;
  staffId: string;
  serviceId: string;
  startTime: Date;
  endTime: Date;
  notes?: string | null;
}) {
  return prisma.appointment.create({
    data: {
      tenantId:   data.tenantId,
      customerId: data.customerId,
      staffId:    data.staffId,
      serviceId:  data.serviceId,
      startTime:  data.startTime,
      endTime:    data.endTime,
      status:     'CONFIRMED',
      bookedVia:  'web',
      notes:      data.notes ?? null,
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      customer: { select: { name: true, phone: true } },
      staff:    { select: { name: true } },
      service:  { select: { name: true, duration: true, price: true } },
    },
  });
}

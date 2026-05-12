import { z } from 'zod';
import { findTenantById, updateTenant, TenantRow } from './settings.repository';
import { AppError } from '../../../shared/utils/AppError';
import { ErrorCode } from '../../../shared/types/api.types';

// ─────────────────────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────────────────────

const DayHoursSchema = z.object({
  open:  z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
}).nullable();

const BusinessHoursSchema = z.object({
  '0': DayHoursSchema,
  '1': DayHoursSchema,
  '2': DayHoursSchema,
  '3': DayHoursSchema,
  '4': DayHoursSchema,
  '5': DayHoursSchema,
  '6': DayHoursSchema,
}).partial();

export const UpdateSettingsSchema = z.object({
  // Salon Info
  name:     z.string().min(1).max(100).optional(),
  phone:    z.string().max(30).nullable().optional(),
  email:    z.string().email().nullable().optional(),
  address:  z.string().max(300).nullable().optional(),
  timezone: z.string().max(60).optional(),

  // Branding
  tagline:        z.string().max(200).nullable().optional(),
  logoUrl:        z.string().url().nullable().optional(),
  coverImageUrl:  z.string().url().nullable().optional(),
  primaryColor:   z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  theme:          z.enum(['light', 'dark']).optional(),

  // Social
  socialInstagram: z.string().url().nullable().optional(),
  socialFacebook:  z.string().url().nullable().optional(),
  socialWebsite:   z.string().url().nullable().optional(),

  // Business hours
  businessHours: BusinessHoursSchema.optional(),

  // Booking config
  bookingEnabled:       z.boolean().optional(),
  bookingNotesEnabled:  z.boolean().optional(),
  bookingLeadMinutes:   z.number().int().min(0).max(1440).optional(),
  bookingMaxDaysAhead:  z.number().int().min(1).max(365).optional(),

  // Site
  siteEnabled: z.boolean().optional(),
  galleryImages: z.array(z.object({
    url:     z.string().url(),
    caption: z.string().max(200).optional().default(''),
    order:   z.number().int().min(0).optional().default(0),
  })).optional(),

  // Reviews
  reviewsEnabled:      z.boolean().optional(),
  reviewsAutoApprove:  z.boolean().optional(),
  reviewsShowRating:   z.boolean().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// DTO
// ─────────────────────────────────────────────────────────────────────────────

function toDto(row: TenantRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    phone: row.phone,
    email: row.email,
    address: row.address,
    timezone: row.timezone,
    tagline: row.tagline,
    logoUrl: row.logoUrl,
    coverImageUrl: row.coverImageUrl,
    primaryColor: row.primaryColor,
    theme: row.theme,
    socialInstagram: row.socialInstagram,
    socialFacebook: row.socialFacebook,
    socialWebsite: row.socialWebsite,
    businessHours: row.businessHours,
    bookingEnabled: row.bookingEnabled,
    bookingNotesEnabled: row.bookingNotesEnabled,
    bookingLeadMinutes: row.bookingLeadMinutes,
    bookingMaxDaysAhead: row.bookingMaxDaysAhead,
    siteEnabled: row.siteEnabled,
    galleryImages: row.galleryImages,
    reviewsEnabled: row.reviewsEnabled,
    reviewsAutoApprove: row.reviewsAutoApprove,
    reviewsShowRating: row.reviewsShowRating,
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service functions
// ─────────────────────────────────────────────────────────────────────────────

export async function getSettings(tenantId: string) {
  const row = await findTenantById(tenantId);
  if (!row) throw new AppError('Tenant not found', 404, ErrorCode.NOT_FOUND);
  return toDto(row);
}

export async function saveSettings(tenantId: string, input: z.infer<typeof UpdateSettingsSchema>) {
  const row = await updateTenant(tenantId, input as any);
  return toDto(row);
}

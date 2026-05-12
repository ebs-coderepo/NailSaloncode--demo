import { prisma } from '../../../shared/db/prismaClient';
import { Prisma } from '@prisma/client';

const TENANT_SELECT = {
  id: true, name: true, slug: true, phone: true, email: true,
  address: true, timezone: true, isActive: true,
  tagline: true, logoUrl: true, coverImageUrl: true,
  primaryColor: true, theme: true,
  socialInstagram: true, socialFacebook: true, socialWebsite: true,
  businessHours: true,
  bookingEnabled: true, bookingNotesEnabled: true,
  bookingLeadMinutes: true, bookingMaxDaysAhead: true,
  siteEnabled: true, galleryImages: true,
  reviewsEnabled: true, reviewsAutoApprove: true, reviewsShowRating: true,
  createdAt: true, updatedAt: true,
} as const;

export type TenantRow = {
  id: string; name: string; slug: string;
  phone: string | null; email: string | null;
  address: string | null; timezone: string; isActive: boolean;
  tagline: string | null; logoUrl: string | null; coverImageUrl: string | null;
  primaryColor: string; theme: string;
  socialInstagram: string | null; socialFacebook: string | null; socialWebsite: string | null;
  businessHours: Prisma.JsonValue | null;
  bookingEnabled: boolean; bookingNotesEnabled: boolean;
  bookingLeadMinutes: number; bookingMaxDaysAhead: number;
  siteEnabled: boolean; galleryImages: Prisma.JsonValue | null;
  reviewsEnabled: boolean; reviewsAutoApprove: boolean; reviewsShowRating: boolean;
  createdAt: Date; updatedAt: Date;
};

export async function findTenantById(id: string): Promise<TenantRow | null> {
  return prisma.tenant.findFirst({ where: { id }, select: TENANT_SELECT });
}

export type UpdateTenantInput = Partial<{
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  timezone: string;
  tagline: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  primaryColor: string;
  theme: string;
  socialInstagram: string | null;
  socialFacebook: string | null;
  socialWebsite: string | null;
  businessHours: Prisma.InputJsonValue;
  bookingEnabled: boolean;
  bookingNotesEnabled: boolean;
  bookingLeadMinutes: number;
  bookingMaxDaysAhead: number;
  siteEnabled: boolean;
  galleryImages: Prisma.InputJsonValue;
  reviewsEnabled: boolean;
  reviewsAutoApprove: boolean;
  reviewsShowRating: boolean;
}>;

export async function updateTenant(id: string, input: UpdateTenantInput): Promise<TenantRow> {
  const data: Prisma.TenantUpdateInput = {};
  if (input.name              !== undefined) data.name              = input.name!;
  if (input.phone             !== undefined) data.phone             = input.phone;
  if (input.email             !== undefined) data.email             = input.email;
  if (input.address           !== undefined) data.address           = input.address;
  if (input.timezone          !== undefined) data.timezone          = input.timezone!;
  if (input.tagline           !== undefined) data.tagline           = input.tagline;
  if (input.logoUrl           !== undefined) data.logoUrl           = input.logoUrl;
  if (input.coverImageUrl     !== undefined) data.coverImageUrl     = input.coverImageUrl;
  if (input.primaryColor      !== undefined) data.primaryColor      = input.primaryColor!;
  if (input.theme             !== undefined) data.theme             = input.theme!;
  if (input.socialInstagram   !== undefined) data.socialInstagram   = input.socialInstagram;
  if (input.socialFacebook    !== undefined) data.socialFacebook    = input.socialFacebook;
  if (input.socialWebsite     !== undefined) data.socialWebsite     = input.socialWebsite;
  if (input.businessHours     !== undefined) data.businessHours     = input.businessHours!;
  if (input.bookingEnabled    !== undefined) data.bookingEnabled    = input.bookingEnabled!;
  if (input.bookingNotesEnabled !== undefined) data.bookingNotesEnabled = input.bookingNotesEnabled!;
  if (input.bookingLeadMinutes  !== undefined) data.bookingLeadMinutes  = input.bookingLeadMinutes!;
  if (input.bookingMaxDaysAhead !== undefined) data.bookingMaxDaysAhead = input.bookingMaxDaysAhead!;
  if (input.siteEnabled         !== undefined) data.siteEnabled         = input.siteEnabled!;
  if (input.galleryImages       !== undefined) data.galleryImages       = input.galleryImages!;
  if (input.reviewsEnabled      !== undefined) data.reviewsEnabled      = input.reviewsEnabled!;
  if (input.reviewsAutoApprove  !== undefined) data.reviewsAutoApprove  = input.reviewsAutoApprove!;
  if (input.reviewsShowRating   !== undefined) data.reviewsShowRating   = input.reviewsShowRating!;

  return prisma.tenant.update({ where: { id }, data, select: TENANT_SELECT });
}

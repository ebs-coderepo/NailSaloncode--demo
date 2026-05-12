import { prisma } from '../../../shared/db/prismaClient';

const STAFF_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  bio: true,
  experienceYears: true,
  specialties: true,
  averageRating: true,
  ratingCount: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  staffServices: {
    select: {
      service: {
        select: { id: true, name: true, isActive: true },
      },
    },
  },
} as const;

export type StaffRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  experienceYears: number | null;
  specialties: string | null;
  averageRating: any | null;
  ratingCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  staffServices: { service: { id: string; name: string; isActive: boolean } }[];
};

export async function findAllStaffByTenant(tenantId: string): Promise<StaffRow[]> {
  return prisma.staff.findMany({
    where: { tenantId },
    select: STAFF_SELECT,
    orderBy: { name: 'asc' },
  });
}

export async function findStaffById(tenantId: string, id: string): Promise<StaffRow | null> {
  return prisma.staff.findFirst({
    where: { id, tenantId },
    select: STAFF_SELECT,
  });
}

export type CreateStaffInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  bio?: string | null;
  experienceYears?: number | null;
  specialties?: string | null;
  serviceIds?: string[];
};

export async function createStaff(tenantId: string, input: CreateStaffInput): Promise<StaffRow> {
  return prisma.staff.create({
    data: {
      tenantId,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      bio: input.bio ?? null,
      experienceYears: input.experienceYears ?? null,
      specialties: input.specialties ?? null,
      staffServices: input.serviceIds?.length
        ? { create: input.serviceIds.map((serviceId) => ({ serviceId })) }
        : undefined,
    },
    select: STAFF_SELECT,
  });
}

export type UpdateStaffInput = Partial<{
  name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  experienceYears: number | null;
  specialties: string | null;
  isActive: boolean;
  serviceIds: string[];
}>;

export async function updateStaff(
  tenantId: string,
  id: string,
  input: UpdateStaffInput,
): Promise<StaffRow | null> {
  const existing = await findStaffById(tenantId, id);
  if (!existing) return null;

  // If serviceIds provided, replace existing assignments
  const serviceOps =
    input.serviceIds !== undefined
      ? {
          deleteMany: {},
          create: input.serviceIds.map((serviceId) => ({ serviceId })),
        }
      : undefined;

  return prisma.staff.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.bio !== undefined && { bio: input.bio }),
      ...(input.experienceYears !== undefined && { experienceYears: input.experienceYears }),
      ...(input.specialties !== undefined && { specialties: input.specialties }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(serviceOps && { staffServices: serviceOps }),
    },
    select: STAFF_SELECT,
  });
}

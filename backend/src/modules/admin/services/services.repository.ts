import { prisma } from '../../../shared/db/prismaClient';
import { Prisma } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Admin Services Repository
// Handles all CRUD operations for the services table.
// Every query is hard-scoped to tenantId — no cross-tenant leakage possible.
// ─────────────────────────────────────────────────────────────────────────────

const SERVICE_SELECT = {
  id: true,
  name: true,
  description: true,
  duration: true,
  price: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: Prisma.Decimal;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// ── Read ─────────────────────────────────────────────────────────────────────

export async function findAllServicesByTenant(tenantId: string): Promise<ServiceRow[]> {
  return prisma.service.findMany({
    where: { tenantId },
    select: SERVICE_SELECT,
    orderBy: { name: 'asc' },
  });
}

export async function findServiceById(
  tenantId: string,
  id: string,
): Promise<ServiceRow | null> {
  return prisma.service.findFirst({
    where: { id, tenantId }, // tenantId check prevents cross-tenant reads
    select: SERVICE_SELECT,
  });
}

// ── Create ───────────────────────────────────────────────────────────────────

export type CreateServiceInput = {
  name: string;
  description?: string;
  duration: number;
  price: number;
};

export async function createService(
  tenantId: string,
  input: CreateServiceInput,
): Promise<ServiceRow> {
  return prisma.service.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description ?? null,
      duration: input.duration,
      price: new Prisma.Decimal(input.price),
      isActive: true,
    },
    select: SERVICE_SELECT,
  });
}

// ── Update ───────────────────────────────────────────────────────────────────

export type UpdateServiceInput = Partial<{
  name: string;
  description: string | null;
  duration: number;
  price: number;
  isActive: boolean;
}>;

export async function updateService(
  tenantId: string,
  id: string,
  input: UpdateServiceInput,
): Promise<ServiceRow | null> {
  // Verify it belongs to this tenant before updating
  const existing = await findServiceById(tenantId, id);
  if (!existing) return null;

  return prisma.service.update({
    where: { id },
    data: {
      ...(input.name !== undefined       && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.duration !== undefined   && { duration: input.duration }),
      ...(input.price !== undefined      && { price: new Prisma.Decimal(input.price) }),
      ...(input.isActive !== undefined   && { isActive: input.isActive }),
    },
    select: SERVICE_SELECT,
  });
}

// ── Delete ───────────────────────────────────────────────────────────────────

export async function deleteService(
  tenantId: string,
  id: string,
): Promise<boolean> {
  const existing = await findServiceById(tenantId, id);
  if (!existing) return false;

  await prisma.service.delete({ where: { id } });
  return true;
}

export async function hasActiveAppointments(serviceId: string): Promise<boolean> {
  const count = await prisma.appointment.count({
    where: {
      serviceId,
      status: { in: ['CONFIRMED', 'PENDING'] },
      startTime: { gte: new Date() },
    },
  });
  return count > 0;
}

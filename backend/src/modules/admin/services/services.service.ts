import { z } from 'zod';
import {
  findAllServicesByTenant,
  findServiceById,
  createService,
  updateService,
  deleteService,
  hasActiveAppointments,
  ServiceRow,
} from './services.repository';
import { AppError } from '../../../shared/utils/AppError';
import { ErrorCode } from '../../../shared/types/api.types';

// ─────────────────────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────────────────────

export const CreateServiceSchema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  duration:    z.number().int().min(5).max(480), // 5 min – 8 hrs
  price:       z.number().min(0).max(10000),
});

export const UpdateServiceSchema = z.object({
  name:        z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  duration:    z.number().int().min(5).max(480).optional(),
  price:       z.number().min(0).max(10000).optional(),
  isActive:    z.boolean().optional(),
});

export type CreateServiceDto = z.infer<typeof CreateServiceSchema>;
export type UpdateServiceDto = z.infer<typeof UpdateServiceSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Service DTO — normalised shape sent to the frontend
// ─────────────────────────────────────────────────────────────────────────────

export type ServiceDto = {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  durationDisplay: string;
  price: string;       // "$45.00" — formatted
  priceRaw: number;    // 45 — for form pre-fill
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function toDto(row: ServiceRow): ServiceDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    duration: row.duration,
    durationDisplay: formatDuration(row.duration),
    price: formatCurrency(parseFloat(row.price.toString())),
    priceRaw: parseFloat(row.price.toString()),
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

// ─────────────────────────────────────────────────────────────────────────────
// Business logic layer
// ─────────────────────────────────────────────────────────────────────────────

export async function listServices(tenantId: string) {
  const rows = await findAllServicesByTenant(tenantId);
  return { services: rows.map(toDto), count: rows.length };
}

export async function getService(tenantId: string, id: string) {
  const row = await findServiceById(tenantId, id);
  if (!row) throw new AppError('Service not found', 404, ErrorCode.SERVICE_NOT_FOUND);
  return toDto(row);
}

export async function addService(tenantId: string, input: CreateServiceDto) {
  const row = await createService(tenantId, input);
  return toDto(row);
}

export async function editService(
  tenantId: string,
  id: string,
  input: UpdateServiceDto,
) {
  const row = await updateService(tenantId, id, input);
  if (!row) throw new AppError('Service not found', 404, ErrorCode.SERVICE_NOT_FOUND);
  return toDto(row);
}

export async function removeService(tenantId: string, id: string) {
  // Guard: refuse to hard-delete a service with upcoming appointments.
  // Soft-delete (isActive=false) is the safe path in that case.
  const busy = await hasActiveAppointments(id);
  if (busy) {
    throw new AppError(
      'This service has upcoming appointments. Deactivate it instead of deleting.',
      409,
      ErrorCode.SLOT_TAKEN,
    );
  }

  const deleted = await deleteService(tenantId, id);
  if (!deleted) throw new AppError('Service not found', 404, ErrorCode.SERVICE_NOT_FOUND);
}

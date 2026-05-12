import { z } from 'zod';
import {
  findAllStaffByTenant,
  findStaffById,
  createStaff,
  updateStaff,
  StaffRow,
} from './staff.repository';
import { AppError } from '../../../shared/utils/AppError';
import { ErrorCode } from '../../../shared/types/api.types';

// ─────────────────────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────────────────────

export const CreateStaffSchema = z.object({
  name:            z.string().min(1).max(100),
  email:           z.string().email().nullable().optional(),
  phone:           z.string().max(30).nullable().optional(),
  bio:             z.string().max(500).nullable().optional(),
  experienceYears: z.number().int().min(0).max(50).nullable().optional(),
  specialties:     z.string().max(300).nullable().optional(),
  serviceIds:      z.array(z.string()).optional(),
});

export const UpdateStaffSchema = z.object({
  name:            z.string().min(1).max(100).optional(),
  email:           z.string().email().nullable().optional(),
  phone:           z.string().max(30).nullable().optional(),
  bio:             z.string().max(500).nullable().optional(),
  experienceYears: z.number().int().min(0).max(50).nullable().optional(),
  specialties:     z.string().max(300).nullable().optional(),
  isActive:        z.boolean().optional(),
  serviceIds:      z.array(z.string()).optional(),
});

export type CreateStaffDto = z.infer<typeof CreateStaffSchema>;
export type UpdateStaffDto = z.infer<typeof UpdateStaffSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// DTO
// ─────────────────────────────────────────────────────────────────────────────

export type StaffDto = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  experienceYears: number | null;
  specialties: string | null;
  averageRating: number | null;
  ratingCount: number;
  isActive: boolean;
  services: { id: string; name: string; isActive: boolean }[];
  createdAt: string;
  updatedAt: string;
};

function toDto(row: StaffRow): StaffDto {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    bio: row.bio,
    experienceYears: row.experienceYears,
    specialties: row.specialties,
    averageRating: row.averageRating ? parseFloat(row.averageRating.toString()) : null,
    ratingCount: row.ratingCount,
    isActive: row.isActive,
    services: row.staffServices.map((ss) => ss.service),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Business logic
// ─────────────────────────────────────────────────────────────────────────────

export async function listStaff(tenantId: string) {
  const rows = await findAllStaffByTenant(tenantId);
  return { staff: rows.map(toDto), count: rows.length };
}

export async function getStaff(tenantId: string, id: string) {
  const row = await findStaffById(tenantId, id);
  if (!row) throw new AppError('Staff not found', 404, ErrorCode.NOT_FOUND);
  return toDto(row);
}

export async function addStaff(tenantId: string, input: CreateStaffDto) {
  const row = await createStaff(tenantId, input);
  return toDto(row);
}

export async function editStaff(tenantId: string, id: string, input: UpdateStaffDto) {
  const row = await updateStaff(tenantId, id, input);
  if (!row) throw new AppError('Staff not found', 404, ErrorCode.NOT_FOUND);
  return toDto(row);
}

export async function getMyProfile(tenantId: string, staffId: string) {
  const row = await findStaffById(tenantId, staffId);
  if (!row) throw new AppError('Staff profile not found', 404, ErrorCode.NOT_FOUND);
  return toDto(row);
}

export async function updateMyProfile(
  tenantId: string,
  staffId: string,
  input: UpdateStaffDto,
) {
  // STAFF can only update own name/phone/bio — not isActive or services
  const safeInput = {
    name:  input.name,
    phone: input.phone,
    bio:   input.bio,
  };
  const row = await updateStaff(tenantId, staffId, safeInput);
  if (!row) throw new AppError('Staff profile not found', 404, ErrorCode.NOT_FOUND);
  return toDto(row);
}

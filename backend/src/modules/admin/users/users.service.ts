import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import {
  findAllUsers,
  findUserById,
  findUserByEmail,
  createUser,
  updateUser,
  updateUserPassword,
  UserRow,
} from './users.repository';
import { AppError } from '../../../shared/utils/AppError';
import { ErrorCode } from '../../../shared/types/api.types';

export const CreateUserSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name:     z.string().min(1).max(100),
  role:     z.nativeEnum(UserRole).default(UserRole.STAFF),
});

export const UpdateUserSchema = z.object({
  name:     z.string().min(1).max(100).optional(),
  role:     z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
});

export const ResetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8, 'Password must be at least 8 characters'),
});

export type UserDto = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

function toDto(row: UserRow): UserDto {
  return {
    id:          row.id,
    email:       row.email,
    name:        row.name,
    role:        row.role,
    isActive:    row.isActive,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    createdAt:   row.createdAt.toISOString(),
  };
}

export async function listUsers(tenantId: string) {
  const rows = await findAllUsers(tenantId);
  return { users: rows.map(toDto), count: rows.length };
}

export async function getUser(tenantId: string, id: string) {
  const row = await findUserById(tenantId, id);
  if (!row) throw new AppError('User not found', 404, ErrorCode.NOT_FOUND);
  return toDto(row);
}

export async function createTeamMember(tenantId: string, input: z.infer<typeof CreateUserSchema>) {
  const existing = await findUserByEmail(tenantId, input.email);
  if (existing) throw new AppError('A user with this email already exists', 409, ErrorCode.VALIDATION_ERROR);

  const passwordHash = await bcrypt.hash(input.password, 10);
  const row = await createUser(tenantId, {
    email:        input.email,
    passwordHash,
    name:         input.name,
    role:         input.role,
  });
  return toDto(row);
}

export async function editTeamMember(tenantId: string, id: string, input: z.infer<typeof UpdateUserSchema>) {
  const row = await updateUser(tenantId, id, input);
  if (!row) throw new AppError('User not found', 404, ErrorCode.NOT_FOUND);
  return toDto(row);
}

export async function adminResetPassword(tenantId: string, id: string, newPassword: string) {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const ok = await updateUserPassword(tenantId, id, passwordHash);
  if (!ok) throw new AppError('User not found', 404, ErrorCode.NOT_FOUND);
}

export async function changeOwnPassword(
  tenantId: string,
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const { prisma } = await import('../../../shared/db/prismaClient');
  const row = await prisma.user.findFirst({ where: { id: userId, tenantId }, select: { passwordHash: true } });
  if (!row) throw new AppError('User not found', 404, ErrorCode.NOT_FOUND);

  const valid = await bcrypt.compare(currentPassword, row.passwordHash);
  if (!valid) throw new AppError('Current password is incorrect', 400, ErrorCode.VALIDATION_ERROR);

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updateUserPassword(tenantId, userId, passwordHash);
}

import { prisma } from '../../../shared/db/prismaClient';
import { UserRole } from '@prisma/client';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type UserRow = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function findAllUsers(tenantId: string): Promise<UserRow[]> {
  return prisma.user.findMany({
    where: { tenantId },
    select: USER_SELECT,
    orderBy: { createdAt: 'asc' },
  });
}

export async function findUserById(tenantId: string, id: string): Promise<UserRow | null> {
  return prisma.user.findFirst({ where: { tenantId, id }, select: USER_SELECT });
}

export async function findUserByEmail(tenantId: string, email: string): Promise<{ id: string; passwordHash: string } | null> {
  return prisma.user.findFirst({
    where: { tenantId, email: email.toLowerCase() },
    select: { id: true, passwordHash: true },
  });
}

export type CreateUserInput = {
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
};

export async function createUser(tenantId: string, input: CreateUserInput): Promise<UserRow> {
  return prisma.user.create({
    data: { tenantId, ...input, email: input.email.toLowerCase() },
    select: USER_SELECT,
  });
}

export type UpdateUserInput = Partial<{
  name: string;
  role: UserRole;
  isActive: boolean;
}>;

export async function updateUser(tenantId: string, id: string, input: UpdateUserInput): Promise<UserRow | null> {
  return prisma.user.update({ where: { id, tenantId }, data: input, select: USER_SELECT }).catch(() => null);
}

export async function updateUserPassword(tenantId: string, id: string, passwordHash: string): Promise<boolean> {
  const result = await prisma.user.updateMany({ where: { id, tenantId }, data: { passwordHash } });
  return result.count > 0;
}

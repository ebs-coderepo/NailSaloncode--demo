import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../shared/db/prismaClient';
import { env } from '../../config/env';
import { AppError } from '../../shared/utils/AppError';
import { ErrorCode } from '../../shared/types/api.types';

export const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findFirst({
    where: { email: input.email.toLowerCase(), isActive: true },
    include: {
      tenant: { select: { id: true, name: true, slug: true, isActive: true } },
    },
  });

  // Use a constant-time check even on "not found" to prevent user enumeration
  const dummyHash = '$2b$10$invalidhashplaceholderfortiming00000000000000000';
  const hashToCompare = user ? user.passwordHash : dummyHash;
  const valid = await bcrypt.compare(input.password, hashToCompare);

  if (!user || !user.tenant.isActive || !valid) {
    throw new AppError('Invalid email or password', 401, ErrorCode.UNAUTHORIZED);
  }

  // If the user has STAFF role, look up their staff profile by email
  // so we can include staffId in the JWT for calendar/schedule access.
  let staffId: string | undefined;
  if (user.role === 'STAFF') {
    const staffProfile = await prisma.staff.findFirst({
      where: { tenantId: user.tenantId, email: user.email, isActive: true },
      select: { id: true },
    });
    staffId = staffProfile?.id;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const payload = {
    sub:      user.id,
    tenantId: user.tenantId,
    role:     user.role,
    name:     user.name,
    ...(staffId && { staffId }),
  };

  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });

  return {
    token,
    expiresIn: env.JWT_EXPIRES_IN,
    user: {
      id:      user.id,
      name:    user.name,
      email:   user.email,
      role:    user.role,
      staffId: staffId ?? null,
      tenant: {
        id:   user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
      },
    },
  };
}

import { prisma } from '../../../shared/db/prismaClient';

const REVIEW_SELECT = {
  id: true,
  tenantId: true,
  appointmentId: true,
  customerId: true,
  staffId: true,
  rating: true,
  comment: true,
  customerName: true,
  isVisible: true,
  createdAt: true,
  updatedAt: true,
  staff: { select: { id: true, name: true } },
} as const;

export type ReviewRow = {
  id: string;
  tenantId: string;
  appointmentId: string;
  customerId: string;
  staffId: string;
  rating: number;
  comment: string | null;
  customerName: string;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
  staff: { id: string; name: string };
};

export async function findAllReviews(tenantId: string): Promise<ReviewRow[]> {
  return prisma.review.findMany({
    where: { tenantId },
    select: REVIEW_SELECT,
    orderBy: { createdAt: 'desc' },
  });
}

export async function findReviewById(tenantId: string, id: string): Promise<ReviewRow | null> {
  return prisma.review.findFirst({
    where: { id, tenantId },
    select: REVIEW_SELECT,
  });
}

export async function updateReviewVisibility(
  tenantId: string,
  id: string,
  isVisible: boolean,
): Promise<ReviewRow | null> {
  const existing = await findReviewById(tenantId, id);
  if (!existing) return null;
  return prisma.review.update({
    where: { id },
    data: { isVisible },
    select: REVIEW_SELECT,
  });
}

export async function deleteReview(tenantId: string, id: string): Promise<boolean> {
  const existing = await findReviewById(tenantId, id);
  if (!existing) return false;
  await prisma.review.delete({ where: { id } });
  return true;
}

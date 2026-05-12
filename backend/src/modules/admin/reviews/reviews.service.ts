import * as repo from './reviews.repository';
import { ApiResponse } from '../../../shared/types/api.types';

export async function listReviews(tenantId: string): Promise<ApiResponse> {
  const reviews = await repo.findAllReviews(tenantId);
  return { success: true, message: 'OK', data: reviews, errorCode: null };
}

export async function setReviewVisibility(
  tenantId: string,
  id: string,
  isVisible: boolean,
): Promise<ApiResponse> {
  const review = await repo.updateReviewVisibility(tenantId, id, isVisible);
  if (!review) return { success: false, message: 'Review not found', errorCode: 'NOT_FOUND', data: null };
  return { success: true, message: 'Review updated', data: review, errorCode: null };
}

export async function removeReview(tenantId: string, id: string): Promise<ApiResponse> {
  const deleted = await repo.deleteReview(tenantId, id);
  if (!deleted) return { success: false, message: 'Review not found', errorCode: 'NOT_FOUND', data: null };
  return { success: true, message: 'Review deleted', data: null, errorCode: null };
}

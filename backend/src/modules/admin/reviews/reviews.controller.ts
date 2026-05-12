import { Request, Response } from 'express';
import * as svc from './reviews.service';

export async function listReviews(req: Request, res: Response) {
  const tenantId = (req as any).tenantId as string;
  const result = await svc.listReviews(tenantId);
  res.json(result);
}

export async function setVisibility(req: Request, res: Response) {
  const tenantId = (req as any).tenantId as string;
  const { id } = req.params;
  const { isVisible } = req.body;
  if (typeof isVisible !== 'boolean') {
    res.status(400).json({ success: false, message: 'isVisible must be a boolean' });
    return;
  }
  const result = await svc.setReviewVisibility(tenantId, id, isVisible);
  res.status(result.success ? 200 : 404).json(result);
}

export async function deleteReview(req: Request, res: Response) {
  const tenantId = (req as any).tenantId as string;
  const { id } = req.params;
  const result = await svc.removeReview(tenantId, id);
  res.status(result.success ? 200 : 404).json(result);
}

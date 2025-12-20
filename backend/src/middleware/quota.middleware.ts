import { Request, Response, NextFunction } from 'express';
import { checkQuota, incrementRequestCount } from '../services/user.service';
import { AuthRequest } from './auth.middleware';

/**
 * Middleware to check user quota before processing request
 */
export function checkUserQuota(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const quotaStatus = checkQuota(req.userId);

  if (!quotaStatus.allowed) {
    return res.status(429).json({
      error: 'Daily quota exceeded',
      remaining: quotaStatus.remaining,
      resetAt: quotaStatus.resetAt,
      message: `You have used all your requests for today. Your quota will reset at ${quotaStatus.resetAt.toLocaleString()}.`
    });
  }

  // Attach quota info to response headers
  res.setHeader('X-Quota-Remaining', quotaStatus.remaining.toString());
  res.setHeader('X-Quota-Reset', quotaStatus.resetAt.toISOString());

  next();
}

/**
 * Middleware to increment request count after successful request
 * Should be called AFTER the main handler succeeds
 */
export function recordRequest(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userId) {
    incrementRequestCount(req.userId);
  }
  next();
}

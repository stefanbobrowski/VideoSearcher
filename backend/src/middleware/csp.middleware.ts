import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to set Content-Security-Policy header
 */
export function setCSPHeader(req: Request, res: Response, next: NextFunction) {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; font-src 'self' https://video-searcher-backend-637174041158.us-central1.run.app; script-src 'self'; style-src 'self' 'unsafe-inline';"
  );
  next();
}

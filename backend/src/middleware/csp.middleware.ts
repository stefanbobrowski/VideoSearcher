import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to set Content-Security-Policy header
 */
export function setCSPHeader(req: Request, res: Response, next: NextFunction) {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; font-src 'self' https://video-searcher-backend-z7yz7rqneq-uc.a.run.app; script-src 'self'; style-src 'self' 'unsafe-inline';"
  );
  next();
}

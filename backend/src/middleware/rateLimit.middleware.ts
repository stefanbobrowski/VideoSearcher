import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for general API requests
 * 50 requests per hour per IP
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for video uploads
 * 3 uploads per day per IP
 */
export const uploadLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3,
  message: 'Too many upload requests. Maximum 3 uploads per day allowed.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

/**
 * Rate limiter for video analysis
 * 5 analysis requests per day per IP
 */
export const analyzeLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5,
  message: 'Too many analysis requests. Maximum 5 analyses per day allowed.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for authentication attempts
 * 10 auth attempts per hour per IP
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for OAuth login initiation
 * Prevents spam of OAuth redirects
 * 20 OAuth initiations per 15 minutes per IP
 */
export const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

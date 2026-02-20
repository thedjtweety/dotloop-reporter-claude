/**
 * Rate Limiting Middleware
 * 
 * Implements tiered rate limiting to prevent abuse and DDoS attacks.
 * Different limits apply to different endpoint types and user roles.
 * 
 * @module middleware/rate-limit
 * @see https://www.npmjs.com/package/express-rate-limit
 */

import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

/**
 * Custom key generator that uses user ID if authenticated, otherwise IP address
 * This ensures authenticated users get their own rate limit bucket
 */
function generateKey(req: Request): string {
  // @ts-ignore - user is added by auth middleware
  const userId = req.user?.id;
  if (userId) {
    return `user:${userId}`;
  }
  
  // Fallback to IP address for unauthenticated requests
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' 
    ? forwarded.split(',')[0].trim()
    : req.socket.remoteAddress || 'unknown';
  
  return `ip:${ip}`;
}

/**
 * Custom handler for when rate limit is exceeded
 * Logs the violation and returns a standardized error response
 */
function rateLimitHandler(req: Request, res: Response) {
  const key = generateKey(req);
  console.warn(`[RATE_LIMIT] Limit exceeded for ${key} on ${req.method} ${req.path}`);
  
  res.status(429).json({
    error: 'Too Many Requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: res.getHeader('Retry-After'),
  });
}

/**
 * Skip rate limiting for certain conditions
 * - Health check endpoints
 * - Static assets
 * - Admins (optional, can be enabled/disabled)
 */
function skipRateLimit(req: Request): boolean {
  // Skip health checks
  if (req.path === '/health' || req.path === '/api/health') {
    return true;
  }
  
  // Skip static assets
  if (req.path.startsWith('/assets/') || req.path.startsWith('/static/')) {
    return true;
  }
  
  // Optionally skip for admins (disabled by default for security)
  // @ts-ignore
  // if (req.user?.role === 'admin') {
  //   return true;
  // }
  
  return false;
}

/**
 * General API rate limiter
 * 
 * Limits: 100 requests per 15 minutes per user/IP
 * Use for: Most API endpoints
 */
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each user/IP to 100 requests per window
  message: 'Too many requests from this user/IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  keyGenerator: generateKey,
  handler: rateLimitHandler,
  skip: skipRateLimit,
});

/**
 * Strict API rate limiter for sensitive operations
 * 
 * Limits: 20 requests per 15 minutes per user/IP
 * Use for: Login, password reset, user creation, role changes
 */
export const strictApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each user/IP to 20 requests per window
  message: 'Too many sensitive requests from this user/IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateKey,
  handler: rateLimitHandler,
  skip: skipRateLimit,
});

/**
 * Upload rate limiter
 * 
 * Limits: 10 uploads per hour per user/IP
 * Use for: File upload endpoints
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each user/IP to 10 uploads per hour
  message: 'Too many uploads from this user/IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateKey,
  handler: rateLimitHandler,
  skip: skipRateLimit,
});

/**
 * OAuth rate limiter
 * 
 * Limits: 5 OAuth attempts per 15 minutes per IP
 * Use for: OAuth callback endpoints
 */
export const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 OAuth attempts per window
  message: 'Too many OAuth attempts from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' 
      ? forwarded.split(',')[0].trim()
      : req.socket.remoteAddress || 'unknown';
    return `ip:${ip}`;
  },
  handler: rateLimitHandler,
});

/**
 * Export rate limiter
 * 
 * Limits: 5 exports per hour per user
 * Use for: Data export endpoints (CSV, PDF, etc.)
 */
export const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each user to 5 exports per hour
  message: 'Too many export requests from this user, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateKey,
  handler: rateLimitHandler,
  skip: skipRateLimit,
});

/**
 * Admin action rate limiter
 * 
 * Limits: 50 admin actions per 15 minutes per admin user
 * Use for: Admin-only endpoints (user management, role changes, etc.)
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each admin to 50 actions per window
  message: 'Too many admin actions from this user, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateKey,
  handler: rateLimitHandler,
  skip: (req) => {
    // @ts-ignore
    if (req.user?.role !== 'admin') {
      return false; // Don't skip if not admin (will be blocked by auth middleware anyway)
    }
    return skipRateLimit(req);
  },
});

/**
 * Rate limit configuration summary for documentation
 */
export const RATE_LIMIT_CONFIG = {
  general: {
    windowMs: 15 * 60 * 1000,
    max: 100,
    description: 'General API endpoints',
  },
  strict: {
    windowMs: 15 * 60 * 1000,
    max: 20,
    description: 'Sensitive operations (login, user management)',
  },
  upload: {
    windowMs: 60 * 60 * 1000,
    max: 10,
    description: 'File uploads',
  },
  oauth: {
    windowMs: 15 * 60 * 1000,
    max: 5,
    description: 'OAuth attempts',
  },
  export: {
    windowMs: 60 * 60 * 1000,
    max: 5,
    description: 'Data exports',
  },
  admin: {
    windowMs: 15 * 60 * 1000,
    max: 50,
    description: 'Admin actions',
  },
};

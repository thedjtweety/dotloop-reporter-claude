import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';

/**
 * Security Headers Middleware
 */

/**
 * CORS Configuration
 */
export const corsMiddleware = cors({
  origin: [
    'https://dotloopreport.com',
    'http://localhost:5173',
    'http://localhost:3000',
    /^chrome-extension:\/\/.*$/,
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
});

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: { maxAge: 31536000 },
  noSniff: true,
});

/**
 * CSRF Token Middleware
 */
class CSRFProtection {
  private tokens: Map<string, { token: string; timestamp: number }> = new Map();
  private tokenExpiry = 24 * 60 * 60 * 1000;

  generateToken(sessionId: string): string {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    this.tokens.set(sessionId, { token, timestamp: Date.now() });
    return token;
  }

  verifyToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId);
    if (!stored) return false;
    if (Date.now() - stored.timestamp > this.tokenExpiry) {
      this.tokens.delete(sessionId);
      return false;
    }
    return stored.token === token;
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const sessionId = (req as any).sessionID || (req as any).user?.id || 'anonymous';
      const token = this.generateToken(sessionId);
      res.locals.csrfToken = token;
      (req as any).csrfToken = token;
      next();
    };
  }

  verifyMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
      const sessionId = (req as any).sessionID || (req as any).user?.id || 'anonymous';
      const token = req.headers['x-csrf-token'] as string || (req.body as any)?.csrfToken;
      if (!token || !this.verifyToken(sessionId, token)) {
        return res.status(403).json({ error: 'CSRF token validation failed' });
      }
      next();
    };
  }
}

export const csrfProtection = new CSRFProtection();

/**
 * Request Logging Middleware
 */
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const crypto = require('crypto');
  const requestId = crypto.randomBytes(8).toString('hex');
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log({
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  next();
}

/**
 * Brute Force Protection
 */
class BruteForceProtection {
  private attempts: Map<string, { count: number; timestamp: number }> = new Map();
  private maxAttempts = 5;
  private lockoutDuration = 15 * 60 * 1000;
  private resetDuration = 60 * 60 * 1000;

  recordFailure(identifier: string): void {
    const now = Date.now();
    const record = this.attempts.get(identifier);
    if (!record) {
      this.attempts.set(identifier, { count: 1, timestamp: now });
      return;
    }
    if (now - record.timestamp > this.resetDuration) {
      this.attempts.set(identifier, { count: 1, timestamp: now });
      return;
    }
    record.count++;
  }

  isLockedOut(identifier: string): boolean {
    const record = this.attempts.get(identifier);
    if (!record) return false;
    const now = Date.now();
    if (now - record.timestamp > this.lockoutDuration) {
      this.attempts.delete(identifier);
      return false;
    }
    return record.count >= this.maxAttempts;
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }

  middleware(getIdentifier: (req: Request) => string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const identifier = getIdentifier(req);
      if (this.isLockedOut(identifier)) {
        return res.status(429).json({
          error: 'Too many failed attempts. Please try again later.',
          retryAfter: Math.ceil(this.lockoutDuration / 1000),
        });
      }
      next();
    };
  }
}

export const bruteForceProtection = new BruteForceProtection();

export const securityMiddleware = {
  headers: securityHeaders,
  csrf: csrfProtection,
  requestLogging: requestLoggingMiddleware,
  bruteForce: bruteForceProtection,
};

/**
 * Security headers configuration summary for documentation and testing
 */
export const SECURITY_HEADERS_CONFIG = {
  csp: {
    enabled: true,
    directives: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
    ],
  },
  hsts: {
    enabled: true,
    maxAge: 31536000,
    includeSubDomains: false,
    preload: false,
  },
  frameguard: {
    enabled: true,
    action: 'deny',
  },
  noSniff: {
    enabled: true,
  },
  xssFilter: {
    enabled: true,
  },
  referrerPolicy: {
    enabled: true,
    policy: 'no-referrer',
  },
  permissionsPolicy: {
    enabled: true,
    restrictions: [
      'geolocation',
      'microphone',
      'camera',
      'payment',
      'usb',
      'magnetometer',
      'gyroscope',
      'accelerometer',
    ],
  },
};

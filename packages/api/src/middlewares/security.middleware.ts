import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Logger } from '../utils';

/**
 * Rate limiting configuration for different endpoint types
 */

// General API rate limiting - applies to all API endpoints
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    Logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
    });

    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes',
    });
  },
});

// Strict rate limiting for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 authentication attempts per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req: Request, res: Response) => {
    Logger.warn('Authentication rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
    });

    res.status(429).json({
      error: 'Too many authentication attempts, please try again later.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes',
    });
  },
});

// More relaxed rate limiting for live session endpoints (location updates, etc.)
export const liveSessionRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Allow 60 requests per minute for live session updates
  message: {
    error: 'Too many live session requests, please slow down.',
    code: 'LIVE_SESSION_RATE_LIMIT_EXCEEDED',
    retryAfter: '1 minute',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    Logger.warn('Live session rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
    });

    res.status(429).json({
      error: 'Too many live session requests, please slow down.',
      code: 'LIVE_SESSION_RATE_LIMIT_EXCEEDED',
      retryAfter: '1 minute',
    });
  },
});

// Very strict rate limiting for password reset endpoints
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset attempts per hour
  message: {
    error: 'Too many password reset attempts, please try again later.',
    code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    Logger.warn('Password reset rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
    });

    res.status(429).json({
      error: 'Too many password reset attempts, please try again later.',
      code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
      retryAfter: '1 hour',
    });
  },
});

/**
 * Helmet security middleware configuration
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
      scriptSrc: ["'self'", 'https:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https:', 'wss:', 'ws:'],
      fontSrc: ["'self'", 'https:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", 'https:'],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },

  // Cross-Origin-Embedder-Policy
  crossOriginEmbedderPolicy: false, // Disabled for mobile app compatibility

  // Cross-Origin-Resource-Policy
  crossOriginResourcePolicy: { policy: 'cross-origin' },

  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },

  // Frameguard
  frameguard: { action: 'deny' },

  // Hide Powered-By header
  hidePoweredBy: true,

  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // IE No Open
  ieNoOpen: true,

  // No Sniff
  noSniff: true,

  // Origin Agent Cluster
  originAgentCluster: true,

  // Permitted Cross-Domain Policies
  permittedCrossDomainPolicies: false,

  // Referrer Policy
  referrerPolicy: { policy: ['no-referrer'] },

  // X-XSS-Protection
  xssFilter: true,
});

/**
 * Security monitoring middleware
 */
export const securityMonitoring = (req: Request, res: Response, next: NextFunction): void => {
  // Log suspicious patterns
  const userAgent = req.get('User-Agent') || '';
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scanner/i,
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /curl/i,
    /wget/i,
    /python-requests/i,
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));

  if (isSuspicious) {
    Logger.warn('Suspicious request detected', {
      ip: req.ip,
      userAgent,
      path: req.path,
      method: req.method,
      headers: req.headers,
    });
  }

  // Check for common attack patterns in URLs
  const maliciousPatterns = [
    /\.\.\//,
    /\/etc\/passwd/,
    /\/proc\/self\/environ/,
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i,
    /union.*select/i,
    /select.*from/i,
    /insert.*into/i,
    /delete.*from/i,
    /drop.*table/i,
    /exec\(/i,
    /system\(/i,
  ];

  const fullUrl = req.originalUrl || req.url;
  const isMalicious = maliciousPatterns.some(pattern => pattern.test(fullUrl));

  if (isMalicious) {
    Logger.error('Malicious request detected', {
      ip: req.ip,
      userAgent,
      path: req.path,
      method: req.method,
      url: fullUrl,
      headers: req.headers,
    });

    res.status(400).json({
      error: 'Bad Request',
      code: 'MALICIOUS_REQUEST_DETECTED',
    });
    return;
  }

  next();
};

/**
 * IP whitelist middleware for admin endpoints
 */
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress || '';

    // Allow localhost for development
    const developmentIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
    const allAllowedIPs = [...allowedIPs, ...developmentIPs];

    if (!allAllowedIPs.includes(clientIP)) {
      Logger.warn('Unauthorized IP access attempt', {
        ip: clientIP,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
      });

      res.status(403).json({
        error: 'Access denied from your IP address',
        code: 'IP_NOT_WHITELISTED',
      });
      return;
    }

    next();
  };
};

/**
 * Request size limit middleware for file uploads
 */
export const requestSizeLimit = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('Content-Length') || '0', 10);
    const maxSizeBytes = parseSize(maxSize);

    if (contentLength > maxSizeBytes) {
      Logger.warn('Request size limit exceeded', {
        ip: req.ip,
        contentLength,
        maxSize,
        path: req.path,
        method: req.method,
      });

      res.status(413).json({
        error: `Request size exceeds limit of ${maxSize}`,
        code: 'REQUEST_SIZE_LIMIT_EXCEEDED',
      });
      return;
    }

    next();
  };
};

/**
 * Parse size string to bytes
 */
function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match?.[1]) {
    throw new Error(`Invalid size format: ${size}`);
  }

  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';

  if (!(unit in units)) {
    throw new Error(`Unknown unit: ${unit}`);
  }

  return Math.floor(value * (units[unit] as number));
}

export default {
  generalRateLimit,
  authRateLimit,
  liveSessionRateLimit,
  passwordResetRateLimit,
  securityHeaders,
  securityMonitoring,
  ipWhitelist,
  requestSizeLimit,
};

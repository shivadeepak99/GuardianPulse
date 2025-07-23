import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Logger } from '../utils';
import { ApiError, isApiError, isOperationalError } from '../utils/errors';

/**
 * Request Logger Middleware
 * Logs incoming HTTP requests with timestamp and basic information
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const { method, url, ip } = req;
  
  Logger.info('Incoming request', {
    method,
    url,
    ip: ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    timestamp: new Date().toISOString(),
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { statusCode } = res;
    
    const logLevel = statusCode >= 400 ? 'warn' : 'info';
    const logMessage = 'Request completed';
    
    const logData = {
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      ip: ip || req.connection.remoteAddress || 'unknown',
      timestamp: new Date().toISOString(),
    };

    if (logLevel === 'warn') {
      Logger.warn(logMessage, logData);
    } else {
      Logger.info(logMessage, logData);
    }
  });

  next();
};

/**
 * Request Validation Middleware
 * Validates request body against provided Zod schema
 */
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        Logger.warn('Request validation failed', {
          url: req.url,
          method: req.method,
          errors: formattedErrors
        });
        
        res.status(400).json({
          message: 'Validation failed',
          errors: formattedErrors
        });
        return;
      }
      next(error);
    }
  };
};

/**
 * Global Error Handler Middleware
 * Centralized error handling with consistent response format
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = 500;
  let message = 'Internal Server Error';
  let errorCode = 'INTERNAL_ERROR';
  let details: unknown = undefined;

  // Handle custom API errors
  if (isApiError(err)) {
    statusCode = err.statusCode;
    message = err.message;
    errorCode = err.errorCode || 'API_ERROR';
    details = err.details;
  } else {
    // Handle specific known error types
    if (err.name === 'ValidationError') {
      statusCode = 400;
      message = err.message || 'Validation failed';
      errorCode = 'VALIDATION_ERROR';
    } else if (err.name === 'CastError') {
      statusCode = 400;
      message = 'Invalid data format';
      errorCode = 'CAST_ERROR';
    } else if (err.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid token';
      errorCode = 'INVALID_TOKEN';
    } else if (err.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Token expired';
      errorCode = 'TOKEN_EXPIRED';
    } else if (err.name === 'MongoError' || err.name === 'MongooseError') {
      statusCode = 500;
      message = 'Database error';
      errorCode = 'DATABASE_ERROR';
    }
  }

  // Log the error
  const logData = {
    error: {
      name: err.name,
      message: err.message,
      statusCode,
      errorCode,
      isOperational: isOperationalError(err),
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
    },
    timestamp: new Date().toISOString(),
  };

  // Log operational errors as warnings, programming errors as errors
  if (isOperationalError(err)) {
    Logger.warn('Operational error occurred', logData);
  } else {
    Logger.error('Programming error occurred', {
      ...logData,
      stack: err.stack,
    });
  }

  // Prepare error response
  const errorResponse: {
    success: false;
    error: string;
    message: string;
    statusCode: number;
    errorCode: string;
    details?: unknown;
    stack?: string;
    timestamp: string;
  } = {
    success: false,
    error: message,
    message,
    statusCode,
    errorCode,
    timestamp: new Date().toISOString(),
  };

  // Include details if available
  if (details) {
    errorResponse.details = details;
  }

  // Include stack trace in development mode
  if (process.env['NODE_ENV'] === 'development' && err.stack) {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found Handler
 * Handles requests to non-existent routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const message = `Route ${req.method} ${req.originalUrl} not found`;
  
  Logger.warn('Route not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    timestamp: new Date().toISOString(),
  });

  res.status(404).json({
    success: false,
    error: 'Not Found',
    message,
    statusCode: 404,
    errorCode: 'ROUTE_NOT_FOUND',
    timestamp: new Date().toISOString(),
    availableEndpoints: {
      health: 'GET /health',
      healthDetailed: 'GET /health/detailed',
      apiInfo: 'GET /api/v1',
      userRegister: 'POST /api/v1/users/register',
      userLogin: 'POST /api/v1/users/login',
      userProfile: 'GET /api/v1/users/me',
    },
  });
};

/**
 * Security Headers Middleware
 * Adds security-related HTTP headers
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Set HSTS header for HTTPS
  if (req.secure || req.get('X-Forwarded-Proto') === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
};

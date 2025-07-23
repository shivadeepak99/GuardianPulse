/**
 * Custom Error Classes for GuardianPulse API
 * Provides standardized error handling with HTTP status codes
 */

/**
 * Base API Error class
 */
export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errorCode?: string | undefined;
  public details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode?: string,
    details?: unknown,
    isOperational: boolean = true,
  ) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errorCode = errorCode;
    this.details = details;

    // Ensure the stack trace points to where the error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error (400 Bad Request)
 */
export class ValidationError extends ApiError {
  constructor(message: string = 'Validation failed', details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Authentication Error (401 Unauthorized)
 */
export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication failed', details?: unknown) {
    super(message, 401, 'AUTHENTICATION_ERROR', details);
  }
}

/**
 * Authorization Error (403 Forbidden)
 */
export class AuthorizationError extends ApiError {
  constructor(message: string = 'Access forbidden', details?: unknown) {
    super(message, 403, 'AUTHORIZATION_ERROR', details);
  }
}

/**
 * Not Found Error (404 Not Found)
 */
export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource', details?: unknown) {
    super(`${resource} not found`, 404, 'NOT_FOUND_ERROR', details);
  }
}

/**
 * Conflict Error (409 Conflict)
 */
export class ConflictError extends ApiError {
  constructor(message: string = 'Resource conflict', details?: unknown) {
    super(message, 409, 'CONFLICT_ERROR', details);
  }
}

/**
 * Rate Limit Error (429 Too Many Requests)
 */
export class RateLimitError extends ApiError {
  constructor(message: string = 'Rate limit exceeded', details?: unknown) {
    super(message, 429, 'RATE_LIMIT_ERROR', details);
  }
}

/**
 * Database Error (500 Internal Server Error)
 */
export class DatabaseError extends ApiError {
  constructor(message: string = 'Database operation failed', details?: unknown) {
    super(message, 500, 'DATABASE_ERROR', details, false);
  }
}

/**
 * External Service Error (502 Bad Gateway)
 */
export class ExternalServiceError extends ApiError {
  constructor(service: string, details?: unknown) {
    super(`External service ${service} is unavailable`, 502, 'EXTERNAL_SERVICE_ERROR', details, false);
  }
}

/**
 * Timeout Error (504 Gateway Timeout)
 */
export class TimeoutError extends ApiError {
  constructor(operation: string = 'Operation', details?: unknown) {
    super(`${operation} timed out`, 504, 'TIMEOUT_ERROR', details, false);
  }
}

/**
 * Business Logic Error (422 Unprocessable Entity)
 */
export class BusinessLogicError extends ApiError {
  constructor(message: string, details?: unknown) {
    super(message, 422, 'BUSINESS_LOGIC_ERROR', details);
  }
}

/**
 * Error factory functions for common scenarios
 */
export class ErrorFactory {
  /**
   * Create validation error from Zod validation result
   */
  static fromZodError(zodError: any): ValidationError {
    const details =
      zodError.errors?.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      })) || [];

    return new ValidationError('Request validation failed', details);
  }

  /**
   * Create database error from Prisma error
   */
  static fromPrismaError(prismaError: any): ApiError {
    // Handle specific Prisma error codes
    switch (prismaError.code) {
      case 'P2002':
        return new ConflictError('Unique constraint violation', {
          field: prismaError.meta?.target,
          constraint: prismaError.meta?.constraint,
        });

      case 'P2025':
        return new NotFoundError('Record', {
          model: prismaError.meta?.cause,
        });

      case 'P2003':
        return new ValidationError('Foreign key constraint violation', {
          field: prismaError.meta?.field_name,
        });

      case 'P2016':
        return new ValidationError('Query interpretation error', {
          details: prismaError.meta?.details,
        });

      default:
        return new DatabaseError('Database operation failed', {
          code: prismaError.code,
          message: prismaError.message,
        });
    }
  }

  /**
   * Create authentication error with specific reason
   */
  static createAuthError(reason: string): AuthenticationError {
    const messages = {
      missing_token: 'Authentication token is required',
      invalid_token: 'Authentication token is invalid',
      expired_token: 'Authentication token has expired',
      invalid_credentials: 'Invalid email or password',
      account_deactivated: 'Account has been deactivated',
      email_not_verified: 'Email address is not verified',
    };

    return new AuthenticationError(messages[reason as keyof typeof messages] || 'Authentication failed', { reason });
  }
}

/**
 * Type guard to check if error is an ApiError
 */
export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError;
};

/**
 * Type guard to check if error is operational (expected)
 */
export const isOperationalError = (error: unknown): boolean => {
  if (isApiError(error)) {
    return error.isOperational;
  }
  return false;
};

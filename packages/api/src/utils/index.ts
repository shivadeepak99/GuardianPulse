import { Logger } from './logger';

/**
 * Export the production-grade Winston logger
 */
export { Logger };

/**
 * Response utility for consistent API responses
 */
export class ResponseHelper {
  public static success<T>(data: T, message = 'Success'): { success: boolean; message: string; data: T } {
    return {
      success: true,
      message,
      data,
    };
  }

  public static error(message: string, details?: unknown): { success: boolean; message: string; details?: unknown } {
    const response: { success: boolean; message: string; details?: unknown } = {
      success: false,
      message,
    };

    if (details) {
      response.details = details;
    }

    return response;
  }
}

/**
 * Validation utilities
 */
export class ValidationHelper {
  public static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  public static isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s-()]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }

  public static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }
}

/**
 * Async error handler wrapper
 */
export const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

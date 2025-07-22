/**
 * Logger utility for structured logging
 */
export class Logger {
  private static getTimestamp(): string {
    return new Date().toISOString();
  }

  private static formatMessage(level: string, message: string, data?: unknown): string {
    const timestamp = this.getTimestamp();
    const baseLog = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (data) {
      return `${baseLog} ${JSON.stringify(data, null, 2)}`;
    }
    
    return baseLog;
  }

  public static info(message: string, data?: unknown): void {
    // eslint-disable-next-line no-console
    console.log(this.formatMessage('info', message, data));
  }

  public static warn(message: string, data?: unknown): void {
    // eslint-disable-next-line no-console
    console.warn(this.formatMessage('warn', message, data));
  }

  public static error(message: string, data?: unknown): void {
    // eslint-disable-next-line no-console
    console.error(this.formatMessage('error', message, data));
  }

  public static debug(message: string, data?: unknown): void {
    if (process.env['NODE_ENV'] === 'development') {
      // eslint-disable-next-line no-console
      console.debug(this.formatMessage('debug', message, data));
    }
  }
}

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

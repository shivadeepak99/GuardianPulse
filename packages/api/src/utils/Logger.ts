import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

/**
 * Production-Grade Winston Logger Configuration
 *
 * Features:
 * - Structured logging with different levels
 * - Colorized console output for development
 * - Daily rotating log files for production
 * - JSON format for log aggregation
 * - Error stack trace capture
 */

// Define log levels with colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'cyan',
};

// Add colors to winston
winston.addColors(logColors);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

/**
 * Log format for console output (development)
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(info => {
    const { timestamp, level, message, ...meta } = info;
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `[${timestamp}] ${level}: ${message} ${metaStr}`;
  }),
);

/**
 * Log format for file output (production)
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

/**
 * Console transport for development
 */
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
  level: process.env['NODE_ENV'] === 'development' ? 'debug' : 'info',
});

/**
 * Daily rotating file transport for application logs
 */
const fileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'guardian-pulse-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: fileFormat,
  level: 'info',
});

/**
 * Daily rotating file transport for error logs only
 */
const errorFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'guardian-pulse-error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '10m',
  maxFiles: '30d',
  format: fileFormat,
  level: 'error',
});

/**
 * Create Winston logger instance
 */
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env['LOG_LEVEL'] || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: {
    service: 'guardian-pulse-api',
    version: process.env['npm_package_version'] || '1.0.0',
  },
  transports: [consoleTransport, fileTransport, errorFileTransport],
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'guardian-pulse-exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '30d',
      format: fileFormat,
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'guardian-pulse-rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '30d',
      format: fileFormat,
    }),
  ],
  // Don't exit on handled exceptions
  exitOnError: false,
});

/**
 * Enhanced Logger class using Winston
 * Maintains the same API as the previous Logger for easy migration
 */
export class Logger {
  /**
   * Log info level messages
   */
  public static info(message: string, meta?: unknown): void {
    logger.info(message, meta);
  }

  /**
   * Log warning level messages
   */
  public static warn(message: string, meta?: unknown): void {
    logger.warn(message, meta);
  }

  /**
   * Log error level messages
   */
  public static error(message: string, meta?: unknown): void {
    logger.error(message, meta);
  }

  /**
   * Log debug level messages (only in development)
   */
  public static debug(message: string, meta?: unknown): void {
    logger.debug(message, meta);
  }

  /**
   * Log HTTP requests
   */
  public static http(message: string, meta?: unknown): void {
    logger.http(message, meta);
  }

  /**
   * Create a child logger with additional context
   */
  public static child(defaultMeta: Record<string, unknown>): winston.Logger {
    return logger.child(defaultMeta);
  }

  /**
   * Log with custom level
   */
  public static log(level: string, message: string, meta?: unknown): void {
    logger.log(level, message, meta);
  }

  /**
   * Get the underlying Winston logger instance
   */
  public static getWinstonLogger(): winston.Logger {
    return logger;
  }

  /**
   * Create logger for specific modules/services
   */
  public static createModuleLogger(moduleName: string): {
    info: (message: string, meta?: unknown) => void;
    warn: (message: string, meta?: unknown) => void;
    error: (message: string, meta?: unknown) => void;
    debug: (message: string, meta?: unknown) => void;
    http: (message: string, meta?: unknown) => void;
  } {
    const moduleLogger = logger.child({ module: moduleName });

    return {
      info: (message: string, meta?: unknown) => moduleLogger.info(message, meta),
      warn: (message: string, meta?: unknown) => moduleLogger.warn(message, meta),
      error: (message: string, meta?: unknown) => moduleLogger.error(message, meta),
      debug: (message: string, meta?: unknown) => moduleLogger.debug(message, meta),
      http: (message: string, meta?: unknown) => moduleLogger.http(message, meta),
    };
  }

  /**
   * Configure logger level at runtime
   */
  public static setLevel(level: string): void {
    logger.level = level;
  }

  /**
   * Get current log level
   */
  public static getLevel(): string {
    return logger.level;
  }

  /**
   * Flush all log transports (useful for testing)
   */
  public static async flush(): Promise<void> {
    return new Promise(resolve => {
      logger.on('finish', resolve);
      logger.end();
    });
  }
}

// Export the Winston logger instance for advanced usage
export { logger as winstonLogger };

export default Logger;

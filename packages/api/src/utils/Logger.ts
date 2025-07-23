import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

/**
 * Production-Grade Winston Logger Configuration
 */

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

/**
 * Console transport for development
 */
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(info => {
      const { timestamp, level, message, ...meta } = info;
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      return `[${timestamp}] ${level}: ${message} ${metaStr}`;
    }),
  ),
  level: process.env['NODE_ENV'] === 'development' ? 'debug' : 'info',
});

/**
 * File transport for all logs
 */
const fileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'guardian-pulse-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  level: 'info',
});

/**
 * Error file transport
 */
const errorFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'guardian-pulse-error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '10m',
  maxFiles: '30d',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  level: 'error',
});

/**
 * Create Winston logger instance
 */
const logger = winston.createLogger({
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
  exitOnError: false,
});

/**
 * Enhanced Logger class using Winston
 */
class Logger {
  static info(message: string, meta?: unknown): void {
    logger.info(message, meta);
  }

  static warn(message: string, meta?: unknown): void {
    logger.warn(message, meta);
  }

  static error(message: string, meta?: unknown): void {
    logger.error(message, meta);
  }

  static debug(message: string, meta?: unknown): void {
    logger.debug(message, meta);
  }

  static http(message: string, meta?: unknown): void {
    logger.http(message, meta);
  }

  static setLevel(level: string): void {
    logger.level = level;
  }

  static getLevel(): string {
    return logger.level;
  }
}

export { Logger };
export default Logger;

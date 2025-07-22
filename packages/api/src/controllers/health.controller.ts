import { Request, Response } from 'express';

/**
 * Health check response interface
 */
interface HealthCheckResponse {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
}

/**
 * Health Controller
 * Handles health check endpoints for monitoring and load balancing
 */
export class HealthController {
  /**
   * Get application health status
   * @param _req - Express request object (unused)
   * @param res - Express response object
   */
  public static getHealth(_req: Request, res: Response): void {
    const healthData: HealthCheckResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: process.env['NODE_ENV'] || 'development',
      version: process.env['npm_package_version'] || '1.0.0',
    };

    res.status(200).json(healthData);
  }

  /**
   * Detailed health check for deep monitoring
   * @param _req - Express request object (unused)
   * @param res - Express response object
   */
  public static getDetailedHealth(_req: Request, res: Response): void {
    const uptimeSeconds = Math.floor(process.uptime());
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);
    const humanUptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    const detailedHealth = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: uptimeSeconds,
        human: humanUptime,
      },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        environment: process.env['NODE_ENV'] || 'development',
        pid: process.pid,
        memory: {
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
        },
      },
      service: {
        name: 'GuardianPulse API',
        version: process.env['npm_package_version'] || '1.0.0',
      },
    };

    res.status(200).json(detailedHealth);
  }
}

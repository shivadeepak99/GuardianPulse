import { Logger } from '../utils';
import DatabaseService from './database.service';

// Export individual services for easy importing
export { S3Service } from './s3.service';
export { AlertService, AlertType, AlertPriority } from './alert.service';
export type { AlertData } from './alert.service';

/**
 * Application Service
 * Core business logic for the GuardianPulse application
 */
export class ApplicationService {
  /**
   * Get application statistics
   */
  public static async getApplicationStats(): Promise<{
    uptime: number;
    environment: string;
    version: string;
    memoryUsage: NodeJS.MemoryUsage;
    startTime: Date;
    database?: {
      connected: boolean;
      userCount: number;
      latency?: number;
    };
  }> {
    try {
      const stats = {
        uptime: Math.floor(process.uptime()),
        environment: process.env['NODE_ENV'] || 'development',
        version: process.env['npm_package_version'] || '1.0.0',
        memoryUsage: process.memoryUsage(),
        startTime: new Date(Date.now() - process.uptime() * 1000),
      };

      // Get database stats
      try {
        const dbHealth = await DatabaseService.checkHealth();
        const dbStats = await DatabaseService.getStats();
        
        (stats as typeof stats & { database: any }).database = {
          connected: dbHealth.connected,
          userCount: dbStats.userCount,
          latency: dbHealth.latency,
        };
      } catch (error) {
        Logger.warn('Could not retrieve database stats', error);
        (stats as typeof stats & { database: any }).database = {
          connected: false,
          userCount: 0,
        };
      }

      Logger.info('Application stats retrieved', { uptime: stats.uptime });
      return stats;
    } catch (error) {
      Logger.error('Failed to retrieve application stats', error);
      throw new Error('Unable to retrieve application statistics');
    }
  }

  /**
   * Validate system readiness
   */
  public static async checkSystemReadiness(): Promise<{
    ready: boolean;
    checks: Record<string, boolean>;
  }> {
    const checks = {
      memory: this.checkMemoryUsage(),
      uptime: this.checkUptime(),
      environment: this.checkEnvironment(),
      database: false,
    };

    // Check database connectivity
    try {
      const dbHealth = await DatabaseService.checkHealth();
      checks.database = dbHealth.connected;
    } catch (error) {
      Logger.warn('Database health check failed', error);
      checks.database = false;
    }

    const ready = Object.values(checks).every(check => check);

    Logger.info('System readiness check completed', { ready, checks });

    return { ready, checks };
  }

  /**
   * Check memory usage
   */
  private static checkMemoryUsage(): boolean {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    
    // Consider memory healthy if heap usage is less than 90% of total
    const memoryHealthy = (heapUsedMB / heapTotalMB) < 0.9;
    
    if (!memoryHealthy) {
      Logger.warn('High memory usage detected', {
        heapUsedMB: Math.round(heapUsedMB),
        heapTotalMB: Math.round(heapTotalMB),
        usagePercentage: Math.round((heapUsedMB / heapTotalMB) * 100),
      });
    }
    
    return memoryHealthy;
  }

  /**
   * Check application uptime
   */
  private static checkUptime(): boolean {
    // Consider healthy if uptime is more than 10 seconds (basic startup check)
    return process.uptime() > 10;
  }

  /**
   * Check environment configuration
   */
  private static checkEnvironment(): boolean {
    const requiredEnvVars = ['NODE_ENV', 'DATABASE_URL'];
    return requiredEnvVars.every(envVar => process.env[envVar]);
  }
}

// Export database service
export { DatabaseService };
export default ApplicationService;

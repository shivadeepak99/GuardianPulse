console.log('🔍 About to import PrismaClient...');
// Temporarily comment out PrismaClient import to isolate the issue
// import { PrismaClient } from '../generated/prisma';
console.log('✅ PrismaClient import skipped for debugging');
import { Logger } from '../utils';

console.log('✅ Logger imported in database service');

/**
 * Database Service
 * Centralized database access layer using Prisma ORM
 * TEMPORARILY DISABLED FOR DEBUGGING
 */
export class DatabaseService {
  private static instance: any | null = null;

  /**
   * Get Prisma client instance (singleton pattern)
   */
  public static getInstance(): any {
    if (!DatabaseService.instance) {
      // Temporarily return mock object
      DatabaseService.instance = {
        $connect: async () => {
          console.log('Mock database connect');
        },
        $disconnect: async () => {
          console.log('Mock database disconnect');
        },
        appConfig: {
          findMany: async () => {
            console.log('Mock appConfig.findMany');
            return []; // Return empty config array
          },
        },
      };

      Logger.info('Mock database connection initialized');
    }

    return DatabaseService.instance;
  }

  /**
   * Connect to the database
   */
  public static async connect(): Promise<void> {
    try {
      const prisma = DatabaseService.getInstance();
      await prisma.$connect();
      Logger.info('Successfully connected to database');
    } catch (error) {
      Logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  /**
   * Disconnect from the database
   */
  public static async disconnect(): Promise<void> {
    try {
      if (DatabaseService.instance) {
        await DatabaseService.instance.$disconnect();
        DatabaseService.instance = null;
        Logger.info('Successfully disconnected from database');
      }
    } catch (error) {
      Logger.error('Failed to disconnect from database', error);
      throw error;
    }
  }

  /**
   * Check database health
   */
  public static async checkHealth(): Promise<{
    connected: boolean;
    latency?: number;
    error?: string;
  }> {
    try {
      const prisma = DatabaseService.getInstance();
      const startTime = Date.now();

      // Simple health check query
      await prisma.$queryRaw`SELECT 1`;

      const latency = Date.now() - startTime;

      return {
        connected: true,
        latency,
      };
    } catch (error) {
      Logger.error('Database health check failed', error);
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get database statistics
   */
  public static async getStats(): Promise<{
    userCount: number;
    databaseSize?: string;
    uptime?: string;
  }> {
    try {
      const prisma = DatabaseService.getInstance();

      // Get user count
      const userCount = await prisma.user.count();

      // Get database size (PostgreSQL specific)
      const sizeResult = await prisma.$queryRaw<[{ size: string }]>`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `;

      // Get database uptime (PostgreSQL specific)
      const uptimeResult = await prisma.$queryRaw<[{ uptime: string }]>`
        SELECT date_trunc('second', now() - pg_postmaster_start_time()) as uptime
      `;

      return {
        userCount,
        databaseSize: sizeResult[0]?.size || 'Unknown',
        uptime: uptimeResult[0]?.uptime || 'Unknown',
      };
    } catch (error) {
      Logger.error('Failed to get database stats', error);
      return {
        userCount: 0,
        databaseSize: 'Error',
        uptime: 'Error',
      };
    }
  }
}

// Export Prisma client for direct use when needed (lazy initialization)
export const getPrisma = () => DatabaseService.getInstance();
export default DatabaseService;

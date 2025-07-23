/**
 * Test Application Setup
 * Creates a test instance of the Express app for integration testing
 */

import express, { Express } from 'express';
import { createServer } from 'http';
import type { Server as HttpServer } from 'http';
import { DatabaseService } from '../../src/services/database.service';
import { Logger } from '../../src/utils';
import {
  requestLogger,
  errorHandler,
  notFoundHandler,
  securityHeaders,
  generalRateLimit,
  securityMonitoring,
} from '../../src/middlewares';
import healthRoutes from '../../src/api/health.routes';
import apiRoutes from '../../src/routes';

/**
 * Test Application Class
 * Simplified version of the main application for testing
 */
class TestApp {
  private app: Express;
  private httpServer: HttpServer;
  private port: number;

  constructor(port = 3001) {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.port = port;
  }

  /**
   * Initialize the test application
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize database connection
      await this.initializeDatabase();

      // Initialize application components
      this.initializeMiddlewares();
      this.initializeRoutes();
      this.initializeErrorHandling();

      Logger.info('Test application initialized successfully');
    } catch (error) {
      Logger.error('Test application initialization failed', error);
      throw error;
    }
  }

  /**
   * Initialize database connection
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await DatabaseService.connect();
      Logger.info('Test database connected successfully');
    } catch (error) {
      Logger.error('Failed to connect to test database:', error);
      throw error;
    }
  }

  /**
   * Initialize middleware stack
   */
  private initializeMiddlewares(): void {
    // Security headers
    this.app.use(securityHeaders);

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting (more lenient for testing)
    this.app.use(generalRateLimit);

    // Request logging (minimal for testing)
    this.app.use(requestLogger);

    // Security monitoring
    this.app.use(securityMonitoring);
  }

  /**
   * Initialize routes
   */
  private initializeRoutes(): void {
    // Health check routes
    this.app.use('/health', healthRoutes);

    // API routes
    this.app.use('/api', apiRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        message: 'GuardianPulse Test API Server',
        version: '1.0.0',
        environment: 'test',
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Initialize error handling
   */
  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  /**
   * Start the test server
   */
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer.listen(this.port, () => {
        Logger.info(`Test server running on port ${this.port}`);
        resolve();
      });

      this.httpServer.on('error', (error) => {
        Logger.error('Test server startup error:', error);
        reject(error);
      });
    });
  }

  /**
   * Stop the test server
   */
  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer.close((error) => {
        if (error) {
          Logger.error('Error stopping test server:', error);
          reject(error);
        } else {
          Logger.info('Test server stopped');
          resolve();
        }
      });
    });
  }

  /**
   * Get Express app instance
   */
  public getApp(): Express {
    return this.app;
  }

  /**
   * Get HTTP server instance
   */
  public getServer(): HttpServer {
    return this.httpServer;
  }

  /**
   * Clean up database for testing
   */
  public async cleanupDatabase(): Promise<void> {
    try {
      // Clean up test data
      const prisma = DatabaseService.getInstance();
      await prisma.evidence.deleteMany({});
      await prisma.incident.deleteMany({});
      await prisma.guardianRelationship.deleteMany({});
      await prisma.guardianInvitation.deleteMany({});
      await prisma.user.deleteMany({});
      
      Logger.info('Test database cleaned up');
    } catch (error) {
      Logger.error('Error cleaning up test database:', error);
      throw error;
    }
  }

  /**
   * Disconnect from database
   */
  public async disconnect(): Promise<void> {
    try {
      await DatabaseService.disconnect();
      Logger.info('Test database disconnected');
    } catch (error) {
      Logger.error('Error disconnecting test database:', error);
      throw error;
    }
  }
}

export { TestApp };

import express, { Express } from 'express';
import { createServer } from 'http';
import type { Server as HttpServer } from 'http';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import swaggerSpec from './config/swagger';
import { Logger } from './utils';
import { DatabaseService } from './services';
import { requestLogger, errorHandler, notFoundHandler, securityHeaders } from './middlewares';
import healthRoutes from './api/health.routes';
import apiRoutes from './routes';
import { initSocket } from './socket';

/**
 * GuardianPulse API Server
 * Revolutionary personal safety application with AI-powered monitoring
 */
class GuardianPulseServer {
  private app: Express;
  private httpServer: HttpServer;
  private port: number;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.port = config.port;
  }

  /**
   * Initialize the server
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize database connection
      await this.initializeDatabase();
      
      // Initialize application components
      this.initializeMiddlewares();
      this.initializeRoutes();
      this.initializeWebSockets();
      this.initializeErrorHandling();
      
      Logger.info('Server initialization completed successfully');
    } catch (error) {
      Logger.error('Server initialization failed', error);
      throw error;
    }
  }

  /**
   * Initialize database connection
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await DatabaseService.connect();
      Logger.info('Database initialized successfully');
    } catch (error) {
      Logger.error('Database initialization failed', error);
      throw error;
    }
  }

  /**
   * Initialize application middlewares
   */
  private initializeMiddlewares(): void {
    // Security headers
    this.app.use(securityHeaders);
    
    // Request logging
    this.app.use(requestLogger);
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }

  /**
   * Initialize application routes
   */
  private initializeRoutes(): void {
    // Health routes
    this.app.use('/health', healthRoutes);
    
    // API Documentation
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'GuardianPulse API Documentation'
    }));
    
    // API v1 routes
    this.app.use('/api/v1', apiRoutes);
  }

  /**
   * Initialize WebSocket server
   */
  private initializeWebSockets(): void {
    const io = initSocket(this.httpServer);
    Logger.info('WebSocket server initialized successfully', {
      transports: ['websocket', 'polling'],
      cors: {
        origin: process.env['FRONTEND_URL'] || 'http://localhost:3000'
      }
    });

    // Store io instance for use in other parts of the application
    (this.app as any).io = io;
  }

  /**
   * Initialize error handling middlewares
   */
  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);
    
    // Global error handler
    this.app.use(errorHandler);
  }

  /**
   * Start the server
   */
  public start(): void {
    this.httpServer.listen(this.port, (): void => {
      Logger.info('GuardianPulse API server started', {
        port: this.port,
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
        endpoints: {
          health: `http://localhost:${this.port}/health`,
          detailedHealth: `http://localhost:${this.port}/health/detailed`,
          api: `http://localhost:${this.port}/api/v1`,
          apiDocs: `http://localhost:${this.port}/api-docs`,
          websocket: `ws://localhost:${this.port}`,
        },
        features: {
          'Real-time Communication': 'Socket.IO',
          'API Documentation': 'Swagger UI',
          'Authentication': 'JWT',
          'Database': 'PostgreSQL + Prisma'
        },
        database: {
          provider: 'PostgreSQL',
          connected: true,
        },
      });
    });
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    try {
      Logger.info('Initiating graceful shutdown...');
      
      // Disconnect from database
      await DatabaseService.disconnect();
      
      Logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      Logger.error('Error during shutdown', error);
      process.exit(1);
    }
  }

  /**
   * Get Express app instance
   */
  public getApp(): Express {
    return this.app;
  }
}

// Initialize and start server
async function startServer(): Promise<void> {
  const server = new GuardianPulseServer();
  
  try {
    await server.initialize();
    server.start();
    
    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      Logger.info('SIGTERM received');
      await server.shutdown();
    });
    
    process.on('SIGINT', async () => {
      Logger.info('SIGINT received');
      await server.shutdown();
    });
    
  } catch (error) {
    Logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default startServer;

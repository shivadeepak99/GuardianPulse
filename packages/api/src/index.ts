console.log('🎯 Starting index.ts module...');

// Add process error handlers for debugging
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log it
});

process.on('uncaughtException', error => {
  console.error('🚨 Uncaught Exception:', error);
  // Don't exit the process, just log it
});

import express, { Express } from 'express';
console.log('✅ Express imported');

import { createServer } from 'http';
import type { Server as HttpServer } from 'http';
import path from 'path';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
console.log('✅ Basic imports completed');

import { config, validateConfig } from './config';
console.log('✅ Config imported');

import swaggerSpec from './config/swagger';
console.log('✅ Swagger imported');

import { Logger } from './utils';
console.log('✅ Logger imported');

console.log('🔍 Importing DatabaseService...');
import { DatabaseService } from './services/database.service';
console.log('✅ DatabaseService imported');

console.log('🔍 Importing redisService...');
import { redisService } from './services/redis.service';
console.log('✅ redisService imported');

console.log('🔍 Importing configService...');
import { configService } from './services/config.service';
console.log('✅ configService imported');

console.log('✅ All services imported');

import {
  requestLogger,
  errorHandler,
  notFoundHandler,
  securityHeaders,
  generalRateLimit,
  securityMonitoring,
} from './middlewares';
console.log('✅ Middlewares imported');

console.log('🔍 Importing health routes...');
import healthRoutes from './api/health.routes';
console.log('✅ Health routes imported');

console.log('🔍 Importing API routes...');
import apiRoutes from './routes';
console.log('✅ API routes imported');

console.log('🔍 Importing socket...');
import { initSocket } from './socket';
console.log('✅ Socket imported');

console.log('🎯 All imports completed, defining server class...');

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
      console.log('🚀 Starting server initialization...');

      // Initialize database connection
      console.log('📊 Initializing database...');
      await this.initializeDatabase();

      // Initialize Redis connection
      console.log('🔴 Initializing Redis...');
      await this.initializeRedis();

      // Initialize configuration service
      console.log('⚙️ Initializing configuration...');
      await this.initializeConfig();

      // Initialize application components
      console.log('🔧 Initializing middlewares...');
      this.initializeMiddlewares();
      console.log('🛣️ Initializing routes...');
      this.initializeRoutes();
      console.log('🌐 Initializing WebSockets...');
      this.initializeWebSockets();
      console.log('🚨 Initializing error handling...');
      this.initializeErrorHandling();

      console.log('✅ Server initialization completed successfully');
      Logger.info('Server initialization completed successfully');
    } catch (error) {
      console.error('❌ Server initialization failed:', error);
      Logger.error('Server initialization failed', error);
      throw error;
    }
  }

  /**
   * Initialize database connection
   */
  private async initializeDatabase(): Promise<void> {
    try {
      console.log('🔧 Starting database connection...');
      await DatabaseService.connect();
      console.log('✅ Database connected successfully');
      Logger.info('Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      Logger.error('Database initialization failed', error);
      throw error;
    }
  }

  /**
   * Initialize Redis connection for data buffering
   */
  private async initializeRedis(): Promise<void> {
    try {
      await redisService.connect();
      Logger.info('Redis service initialized successfully');
    } catch (error) {
      Logger.warn('Redis initialization failed - continuing without Redis buffering', error);
      // Don't throw error - Redis is optional for core functionality
    }
  }

  /**
   * Initialize configuration service
   */
  private async initializeConfig(): Promise<void> {
    try {
      // Validate environment configuration first
      console.log('🔧 Starting environment validation...');
      validateConfig();
      console.log('✅ Environment configuration validated successfully');
      Logger.info('Environment configuration validated successfully');

      console.log('🔧 Starting config service initialization...');
      await configService.initialize();
      console.log('✅ Config service initialized successfully');
      Logger.info('Configuration service initialized successfully');
    } catch (error) {
      console.error('❌ Configuration initialization failed:', error);
      Logger.error('Configuration service initialization failed', error);
      throw error;
    }
  }

  /**
   * Initialize application middlewares
   */
  private initializeMiddlewares(): void {
    // Enhanced security headers (using helmet)
    this.app.use(securityHeaders);

    // CORS configuration for frontend access
    this.app.use(
      cors({
        origin: [
          process.env['FRONTEND_URL'] || 'http://localhost:5173',
          'http://localhost:5174', // Alternative port when 5173 is in use
          'http://localhost:3000', // For mobile/other dev servers
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      }),
    );

    // Security monitoring (suspicious request detection)
    this.app.use(securityMonitoring);

    // General rate limiting for all API endpoints
    this.app.use('/api/', generalRateLimit);

    // Request logging
    this.app.use(requestLogger);

    // Body parsing with size limits
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Static file serving for local storage uploads
    if (process.env['STORAGE_PROVIDER'] === 'local') {
      const uploadDir = path.resolve(process.env['UPLOAD_DIR'] || './uploads');
      this.app.use(
        '/uploads',
        express.static(uploadDir, {
          maxAge: '1d', // Cache for 1 day
          setHeaders: (res, filePath) => {
            // Set appropriate headers for security
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('Cache-Control', 'public, max-age=86400');

            // Content-Type based on file extension
            const ext = path.extname(filePath).toLowerCase();
            if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
              res.setHeader('Content-Type', `image/${ext.substring(1)}`);
            } else if (['.mp4', '.mov', '.avi'].includes(ext)) {
              res.setHeader('Content-Type', `video/${ext.substring(1)}`);
            } else if (['.mp3', '.wav', '.ogg'].includes(ext)) {
              res.setHeader('Content-Type', `audio/${ext.substring(1)}`);
            }
          },
        }),
      );
      Logger.info(`📁 Static file serving enabled for uploads: ${uploadDir}`);
    }
  }

  /**
   * Initialize application routes
   */
  private initializeRoutes(): void {
    // Health routes
    this.app.use('/health', healthRoutes);

    // API Documentation
    this.app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'GuardianPulse API Documentation',
      }),
    );

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
        origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
      },
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
          Authentication: 'JWT',
          Database: 'PostgreSQL + Prisma',
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

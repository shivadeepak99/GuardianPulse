import { Router, Request, Response } from 'express';
import { configService } from '../services';
import { Logger } from '../utils';
import asyncHandler from 'express-async-handler';

/**
 * Configuration Management Routes
 * Admin-only endpoints for managing application configuration
 */

const router: Router = Router();

/**
 * GET /api/config
 * Get all configuration values (admin only)
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      const configs = await configService.getAllConfigs();

      res.json({
        success: true,
        data: configs,
        count: configs.length,
        timestamp: new Date().toISOString(),
      });

      Logger.info('Configuration values retrieved', {
        count: configs.length,
        // adminUser: req.user?.email // Will be available when auth middleware is implemented
      });
    } catch (error) {
      Logger.error('Failed to retrieve configurations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve configurations',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }),
);

/**
 * GET /api/config/:key
 * Get specific configuration value
 */
router.get(
  '/:key',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { key } = req.params;

      if (!key) {
        res.status(400).json({
          success: false,
          message: 'Configuration key is required',
        });
        return;
      }

      const value = await configService.getConfig(key);

      if (value === null) {
        res.status(404).json({
          success: false,
          message: `Configuration key '${key}' not found`,
        });
        return;
      }

      res.json({
        success: true,
        data: {
          key,
          value,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      Logger.error(`Failed to retrieve configuration '${req.params['key']}':`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve configuration',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }),
);

/**
 * PUT /api/config/:key
 * Update or create a configuration value (admin only)
 */
router.put(
  '/:key',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { key } = req.params;
      const { value, description, category } = req.body;

      if (!key) {
        res.status(400).json({
          success: false,
          message: 'Configuration key is required',
        });
        return;
      }

      // Validate required fields
      if (!value) {
        res.status(400).json({
          success: false,
          message: 'Value is required',
        });
        return;
      }

      // Validate that value is a string
      if (typeof value !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Value must be a string',
        });
        return;
      }

      await configService.updateConfig(key, value, description, category);

      res.json({
        success: true,
        message: `Configuration '${key}' updated successfully`,
        data: {
          key,
          value,
          description,
          category,
        },
        timestamp: new Date().toISOString(),
      });

      Logger.info(`Configuration updated: ${key} = ${value}`, {
        // adminUser: req.user?.email, // Will be available when auth middleware is implemented
        description,
        category,
      });
    } catch (error) {
      Logger.error(`Failed to update configuration '${req.params['key']}':`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to update configuration',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }),
);

/**
 * POST /api/config/bulk
 * Update multiple configuration values at once (admin only)
 */
router.post(
  '/bulk',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { configs } = req.body;

      // Validate request body
      if (!Array.isArray(configs)) {
        res.status(400).json({
          success: false,
          message: 'Configs must be an array',
        });
        return;
      }

      // Validate each config object
      for (const config of configs) {
        if (!config.key || !config.value) {
          res.status(400).json({
            success: false,
            message: 'Each config must have key and value properties',
          });
          return;
        }

        if (typeof config.key !== 'string' || typeof config.value !== 'string') {
          res.status(400).json({
            success: false,
            message: 'Key and value must be strings',
          });
          return;
        }
      }

      await configService.updateConfigs(configs);

      res.json({
        success: true,
        message: `Successfully updated ${configs.length} configurations`,
        data: configs,
        timestamp: new Date().toISOString(),
      });

      Logger.info(`Bulk configuration update completed`, {
        count: configs.length,
        // adminUser: req.user?.email, // Will be available when auth middleware is implemented
        keys: configs.map(c => c.key),
      });
    } catch (error) {
      Logger.error('Failed to bulk update configurations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update configurations',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }),
);

/**
 * DELETE /api/config/:key
 * Delete a configuration value (admin only)
 */
router.delete(
  '/:key',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { key } = req.params;

      if (!key) {
        res.status(400).json({
          success: false,
          message: 'Configuration key is required',
        });
        return;
      }

      await configService.deleteConfig(key);

      res.json({
        success: true,
        message: `Configuration '${key}' deleted successfully`,
        timestamp: new Date().toISOString(),
      });

      Logger.info(`Configuration deleted: ${key}`, {
        // adminUser: req.user?.email // Will be available when auth middleware is implemented
      });
    } catch (error) {
      Logger.error(`Failed to delete configuration '${req.params['key']}':`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete configuration',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }),
);

/**
 * POST /api/config/refresh
 * Force refresh configuration cache (admin only)
 */
router.post(
  '/refresh',
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    try {
      await configService.refreshCache();
      const stats = configService.getCacheStats();

      res.json({
        success: true,
        message: 'Configuration cache refreshed successfully',
        data: stats,
        timestamp: new Date().toISOString(),
      });

      Logger.info('Configuration cache refreshed', {
        // adminUser: req.user?.email, // Will be available when auth middleware is implemented
        cacheSize: stats.cacheSize,
      });
    } catch (error) {
      Logger.error('Failed to refresh configuration cache:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh configuration cache',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }),
);

/**
 * GET /api/config/health
 * Health check for configuration service
 */
router.get(
  '/health',
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    try {
      const isHealthy = await configService.healthCheck();
      const stats = configService.getCacheStats();

      res.json({
        success: true,
        data: {
          healthy: isHealthy,
          ...stats,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      Logger.error('Configuration service health check failed:', error);
      res.status(500).json({
        success: false,
        message: 'Configuration service health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }),
);

export default router;

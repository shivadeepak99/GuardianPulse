import { Router, IRouter } from 'express';
import healthRoutes from './health.routes';

const router: IRouter = Router();

/**
 * API Routes Index
 * Centralized routing configuration for all API endpoints
 */

/**
 * Health check routes
 * @route /health
 */
router.use('/health', healthRoutes);

/**
 * Default API info endpoint
 * @route GET /
 */
router.get('/', (_req, res) => {
  res.json({
    name: 'GuardianPulse API',
    version: '1.0.0',
    description: 'Revolutionary AI-powered personal safety application',
    endpoints: {
      health: '/health',
      healthDetailed: '/health/detailed',
    },
    documentation: {
      status: 'Coming soon',
      format: 'OpenAPI 3.0',
    },
  });
});

export default router;

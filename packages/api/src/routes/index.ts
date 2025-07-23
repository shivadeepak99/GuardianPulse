import { Router } from 'express';
import userRoutes from './user.routes';
import guardianRoutes from './guardians';
import evidenceRoutes from './evidence';
import incidentRoutes from './incidents';
import configRoutes from './config.routes';
import subscriptionRoutes from './subscription';

/**
 * Main API Routes
 * Aggregates all route modules
 */
const routes: Router = Router();

// Mount user routes
routes.use('/users', userRoutes);

// Mount guardian routes
routes.use('/guardian', guardianRoutes);

// Mount evidence routes
routes.use('/evidence', evidenceRoutes);

// Mount incident routes
routes.use('/incidents', incidentRoutes);

// Mount configuration routes (admin only)
routes.use('/config', configRoutes);

// Mount subscription routes
routes.use('/subscription', subscriptionRoutes);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: API v1 health check
 *     description: Returns basic information about the API v1 endpoints
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: API information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "GuardianPulse API v1"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 endpoints:
 *                   type: object
 *                   properties:
 *                     health:
 *                       type: string
 *                       example: "/health"
 *                     detailedHealth:
 *                       type: string
 *                       example: "/health/detailed"
 */
routes.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'GuardianPulse API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

export default routes;

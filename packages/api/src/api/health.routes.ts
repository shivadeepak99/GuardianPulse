import { Router, IRouter } from 'express';
import { HealthController } from '../controllers/health.controller';

const router: IRouter = Router();

/**
 * Health Routes
 * Provides endpoints for monitoring application health
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check
 *     description: Returns basic health status of the API server
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: API is healthy and running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "GuardianPulse API is healthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-07-22T10:30:00.000Z"
 *                 uptime:
 *                   type: number
 *                   example: 3600.5
 *                   description: Server uptime in seconds
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', HealthController.getHealth);

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Detailed health check
 *     description: Returns comprehensive health status including system metrics and database connectivity
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Detailed health information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "All systems operational"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                 system:
 *                   type: object
 *                   properties:
 *                     memory:
 *                       type: object
 *                       properties:
 *                         used:
 *                           type: number
 *                           description: Used memory in MB
 *                         total:
 *                           type: number
 *                           description: Total memory in MB
 *                         percentage:
 *                           type: number
 *                           description: Memory usage percentage
 *                     cpu:
 *                       type: object
 *                       properties:
 *                         usage:
 *                           type: number
 *                           description: CPU usage percentage
 *                     nodeVersion:
 *                       type: string
 *                       example: "v18.17.0"
 *                 database:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [connected, disconnected, error]
 *                       example: "connected"
 *                     provider:
 *                       type: string
 *                       example: "PostgreSQL"
 *                     latency:
 *                       type: number
 *                       description: Database response time in milliseconds
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/detailed', HealthController.getDetailedHealth);

export default router;

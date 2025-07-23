import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';
import { 
  createIncidentSchema, 
  manualSOSSchema,
  thrownAwaySchema,
  fakeShutdownSchema 
} from '../utils/validation';
import { DatabaseService } from '../services/database.service';
import { AlertService, AlertType, AlertPriority } from '../services/alert.service';
import { AppError } from '../utils/errors';
import { Logger } from '../utils';

const router = Router();
const db = DatabaseService.getInstance();
const alertService = AlertService.getInstance();

/**
 * @swagger
 * components:
 *   schemas:
 *     Incident:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique incident identifier
 *         type:
 *           type: string
 *           enum: [SOS_TRIGGERED, FALL_DETECTED, THROWN_AWAY, FAKE_SHUTDOWN]
 *         wardId:
 *           type: string
 *           description: ID of the user (ward) involved
 *         location:
 *           type: object
 *           properties:
 *             latitude:
 *               type: number
 *             longitude:
 *               type: number
 *             accuracy:
 *               type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [ACTIVE, RESOLVED, DISMISSED]
 */

/**
 * @swagger
 * /api/v1/incidents:
 *   post:
 *     summary: Create a new incident
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [SOS_TRIGGERED, FALL_DETECTED, THROWN_AWAY, FAKE_SHUTDOWN]
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   accuracy:
 *                     type: number
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Incident created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Incident'
 */
router.post('/', 
  authMiddleware,
  validateRequest(createIncidentSchema),
  asyncHandler(async (req, res) => {
    const { type, location, description } = req.body;
    const userId = req.user!.id;

    Logger.info(`Creating ${type} incident for user ${userId}`);

    // Create incident in database
    const incident = await db.prisma.incident.create({
      data: {
        type,
        wardId: userId,
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        } : undefined,
        description,
        status: 'ACTIVE'
      },
      include: {
        ward: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Determine alert priority based on incident type
    let alertType: AlertType;
    let priority: AlertPriority;

    switch (type) {
      case 'SOS_TRIGGERED':
        alertType = AlertType.SOS_TRIGGERED;
        priority = AlertPriority.EMERGENCY;
        break;
      case 'FALL_DETECTED':
        alertType = AlertType.FALL_DETECTED;
        priority = AlertPriority.HIGH;
        break;
      case 'THROWN_AWAY':
        alertType = AlertType.THROWN_AWAY;
        priority = AlertPriority.EMERGENCY;
        break;
      case 'FAKE_SHUTDOWN':
        alertType = AlertType.FAKE_SHUTDOWN;
        priority = AlertPriority.EMERGENCY;
        break;
      default:
        alertType = AlertType.SYSTEM_ALERT;
        priority = AlertPriority.MEDIUM;
    }

    // Send alerts to guardians
    try {
      await alertService.sendIncidentAlert(userId, incident.id, alertType, {
        wardName: `${incident.ward.firstName || ''} ${incident.ward.lastName || ''}`.trim() || incident.ward.email,
        wardId: userId,
        timestamp: incident.createdAt,
        location,
        priority,
        message: description
      });
    } catch (error) {
      Logger.error('Failed to send incident alerts:', error);
      // Don't fail the incident creation if alert sending fails
    }

    Logger.info(`Incident ${incident.id} created successfully`);

    res.status(201).json({
      success: true,
      data: incident
    });
  })
);

/**
 * @swagger
 * /api/v1/incidents/manual-sos:
 *   post:
 *     summary: Trigger manual SOS emergency alert
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   accuracy:
 *                     type: number
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: SOS alert triggered successfully
 */
router.post('/manual-sos',
  authMiddleware,
  validateRequest(manualSOSSchema),
  asyncHandler(async (req, res) => {
    const { location, message } = req.body;
    const userId = req.user!.id;

    Logger.warn(`Manual SOS triggered by user ${userId}`);

    // Create SOS incident
    const incident = await db.prisma.incident.create({
      data: {
        type: 'SOS_TRIGGERED',
        wardId: userId,
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        } : undefined,
        description: message || 'Manual SOS trigger - immediate assistance needed',
        status: 'ACTIVE'
      },
      include: {
        ward: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Send emergency alerts
    try {
      await alertService.sendIncidentAlert(userId, incident.id, AlertType.SOS_TRIGGERED, {
        wardName: `${incident.ward.firstName || ''} ${incident.ward.lastName || ''}`.trim() || incident.ward.email,
        wardId: userId,
        timestamp: incident.createdAt,
        location,
        priority: AlertPriority.EMERGENCY,
        message: incident.description
      });
    } catch (error) {
      Logger.error('Failed to send SOS alerts:', error);
    }

    Logger.warn(`SOS incident ${incident.id} created and alerts sent`);

    res.status(201).json({
      success: true,
      data: {
        incidentId: incident.id,
        message: 'SOS alert triggered successfully',
        timestamp: incident.createdAt
      }
    });
  })
);

/**
 * @swagger
 * /api/v1/incidents/thrown-away:
 *   post:
 *     summary: Report device thrown away or impacted
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               confidence:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               sensorData:
 *                 type: object
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   accuracy:
 *                     type: number
 *     responses:
 *       201:
 *         description: Thrown away incident reported successfully
 */
router.post('/thrown-away',
  authMiddleware,
  validateRequest(thrownAwaySchema),
  asyncHandler(async (req, res) => {
    const { confidence, sensorData, location } = req.body;
    const userId = req.user!.id;

    // Only process high confidence detections
    if (confidence < 70) {
      throw new AppError('Impact confidence too low', 400);
    }

    Logger.warn(`Device thrown away detected for user ${userId} with ${confidence}% confidence`);

    // Create thrown away incident
    const incident = await db.prisma.incident.create({
      data: {
        type: 'THROWN_AWAY',
        wardId: userId,
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        } : undefined,
        description: `Device impact detected with ${confidence}% confidence. Device may have been thrown or damaged.`,
        status: 'ACTIVE'
      },
      include: {
        ward: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Store sensor data as evidence
    if (sensorData) {
      try {
        await db.prisma.evidence.create({
          data: {
            incidentId: incident.id,
            type: 'SENSOR_DATA',
            fileName: `sensor-data-${Date.now()}.json`,
            mimeType: 'application/json',
            fileSize: JSON.stringify(sensorData).length,
            s3Key: `evidence/incidents/${incident.id}/sensor-data-${Date.now()}.json`,
            metadata: {
              confidence,
              detectionTimestamp: new Date(),
              ...sensorData
            }
          }
        });
      } catch (error) {
        Logger.error('Failed to store sensor data evidence:', error);
      }
    }

    // Send critical alerts
    try {
      await alertService.sendIncidentAlert(userId, incident.id, AlertType.THROWN_AWAY, {
        wardName: `${incident.ward.firstName || ''} ${incident.ward.lastName || ''}`.trim() || incident.ward.email,
        wardId: userId,
        timestamp: incident.createdAt,
        location,
        priority: AlertPriority.EMERGENCY,
        message: `CRITICAL: Device may have been thrown away or damaged (${confidence}% confidence)`
      });
    } catch (error) {
      Logger.error('Failed to send thrown away alerts:', error);
    }

    res.status(201).json({
      success: true,
      data: {
        incidentId: incident.id,
        confidence,
        message: 'Thrown away incident reported successfully'
      }
    });
  })
);

/**
 * @swagger
 * /api/v1/incidents/fake-shutdown:
 *   post:
 *     summary: Report fake shutdown triggered (duress situation)
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   accuracy:
 *                     type: number
 *               deviceInfo:
 *                 type: object
 *     responses:
 *       201:
 *         description: Fake shutdown incident reported successfully
 */
router.post('/fake-shutdown',
  authMiddleware,
  validateRequest(fakeShutdownSchema),
  asyncHandler(async (req, res) => {
    const { location, deviceInfo } = req.body;
    const userId = req.user!.id;

    Logger.warn(`Fake shutdown triggered by user ${userId} - potential duress situation`);

    // Create fake shutdown incident
    const incident = await db.prisma.incident.create({
      data: {
        type: 'FAKE_SHUTDOWN',
        wardId: userId,
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        } : undefined,
        description: 'Fake shutdown triggered - potential duress or emergency situation detected',
        status: 'ACTIVE'
      },
      include: {
        ward: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Store device info as evidence
    if (deviceInfo) {
      try {
        await db.prisma.evidence.create({
          data: {
            incidentId: incident.id,
            type: 'DEVICE_INFO',
            fileName: `device-info-${Date.now()}.json`,
            mimeType: 'application/json',
            fileSize: JSON.stringify(deviceInfo).length,
            s3Key: `evidence/incidents/${incident.id}/device-info-${Date.now()}.json`,
            metadata: {
              deviceInfo,
              triggerTimestamp: new Date()
            }
          }
        });
      } catch (error) {
        Logger.error('Failed to store device info evidence:', error);
      }
    }

    // Send emergency alerts
    try {
      await alertService.sendIncidentAlert(userId, incident.id, AlertType.FAKE_SHUTDOWN, {
        wardName: `${incident.ward.firstName || ''} ${incident.ward.lastName || ''}`.trim() || incident.ward.email,
        wardId: userId,
        timestamp: incident.createdAt,
        location,
        priority: AlertPriority.EMERGENCY,
        message: 'EMERGENCY: Ward may be in danger - fake shutdown triggered'
      });
    } catch (error) {
      Logger.error('Failed to send fake shutdown alerts:', error);
    }

    res.status(201).json({
      success: true,
      data: {
        incidentId: incident.id,
        message: 'Emergency alert sent successfully'
      }
    });
  })
);

/**
 * @swagger
 * /api/v1/incidents:
 *   get:
 *     summary: Get incidents for current user
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, RESOLVED, DISMISSED]
 *         description: Filter by incident status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [SOS_TRIGGERED, FALL_DETECTED, THROWN_AWAY, FAKE_SHUTDOWN]
 *         description: Filter by incident type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of incidents to return
 *     responses:
 *       200:
 *         description: List of incidents
 */
router.get('/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { status, type, limit = 50 } = req.query;

    const where: any = { wardId: userId };
    
    if (status) where.status = status;
    if (type) where.type = type;

    const incidents = await db.prisma.incident.findMany({
      where,
      include: {
        evidence: {
          select: {
            id: true,
            type: true,
            fileName: true,
            mimeType: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit)
    });

    res.json({
      success: true,
      data: incidents,
      total: incidents.length
    });
  })
);

/**
 * @swagger
 * /api/v1/incidents/ward/{wardId}:
 *   get:
 *     summary: Get incidents for a specific ward (guardian access)
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: wardId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the ward
 *     responses:
 *       200:
 *         description: List of ward incidents
 */
router.get('/ward/:wardId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const guardianId = req.user!.id;
    const { wardId } = req.params;

    // Verify guardian relationship
    const relationship = await db.prisma.guardianRelationship.findFirst({
      where: {
        guardianId,
        wardId,
        status: 'ACCEPTED'
      }
    });

    if (!relationship) {
      throw new AppError('Not authorized to view incidents for this ward', 403);
    }

    const incidents = await db.prisma.incident.findMany({
      where: { wardId },
      include: {
        evidence: {
          select: {
            id: true,
            type: true,
            fileName: true,
            mimeType: true,
            createdAt: true
          }
        },
        ward: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json({
      success: true,
      data: incidents,
      total: incidents.length
    });
  })
);

export default router;

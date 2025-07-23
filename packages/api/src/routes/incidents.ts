import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares';
import { 
  createIncidentSchema, 
  manualSOSSchema,
  fakeShutdownSchema,
  processSensorDataSchema
} from '../utils/validation';
import { DatabaseService } from '../services/database.service';
import { AlertService, AlertType, AlertPriority } from '../services/alert.service';
import { AnomalyDetectionService, SensorData } from '../services/anomaly.service';
import { ThrownAwayController } from '../controllers/thrownAwayController';
import { ApiError } from '../utils/errors';
import { Logger } from '../utils';

const router: Router = Router();
const db = DatabaseService.getInstance();
const alertService = new AlertService();
const anomalyService = new AnomalyDetectionService();
const thrownAwayController = new ThrownAwayController();

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
  authenticate,
  validateRequest(createIncidentSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { type, location, description } = req.body;
    const userId = req.user!.id;

    Logger.info(`Creating ${type} incident for user ${userId}`);

    // Create incident in database
    const incident = await db.incident.create({
      data: {
        type,
        wardId: userId,
        latitude: location?.latitude,
        longitude: location?.longitude,
        description,
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
  authenticate,
  validateRequest(manualSOSSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { location, message } = req.body;
    const userId = req.user!.id;

    Logger.warn(`Manual SOS triggered by user ${userId}`);

    // Use AnomalyDetectionService to create SOS incident
    const incident = await anomalyService.createManualSOSIncident(
      userId,
      location,
      message
    );

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
 * /api/v1/incidents/process-sensor-data:
 *   post:
 *     summary: Process sensor data for anomaly detection (fall detection)
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
 *               - accelerometer
 *               - location
 *             properties:
 *               accelerometer:
 *                 type: object
 *                 properties:
 *                   x:
 *                     type: number
 *                   y:
 *                     type: number
 *                   z:
 *                     type: number
 *               gyroscope:
 *                 type: object
 *                 properties:
 *                   x:
 *                     type: number
 *                   y:
 *                     type: number
 *                   z:
 *                     type: number
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   accuracy:
 *                     type: number
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Sensor data processed successfully
 *       201:
 *         description: Fall detected and incident created
 */
router.post('/process-sensor-data',
  authenticate,
  validateRequest(processSensorDataSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { accelerometer, gyroscope, location, timestamp } = req.body;
    const userId = req.user!.id;

    // Create sensor data object
    const sensorData: SensorData = {
      wardId: userId,
      accelerometer,
      gyroscope,
      location,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    };

    Logger.info(`Processing sensor data for user ${userId}`);

    // Process sensor data for anomaly detection
    const incidentCreated = await anomalyService.processSensorData(sensorData);

    if (incidentCreated) {
      Logger.warn(`Fall detected for user ${userId}, incident created`);
      
      res.status(201).json({
        success: true,
        data: {
          anomalyDetected: true,
          incidentCreated: true,
          message: 'Fall detected and incident created successfully'
        }
      });
    } else {
      Logger.info(`No anomaly detected for user ${userId}`);
      
      res.status(200).json({
        success: true,
        data: {
          anomalyDetected: false,
          incidentCreated: false,
          message: 'Sensor data processed successfully - no anomalies detected'
        }
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/incidents/thrown-away:
 *   post:
 *     summary: Report critical device thrown away or impacted incident
 *     description: CRITICAL endpoint for reporting when a device has been thrown, impacted, or potentially destroyed. This endpoint is optimized for speed and reliability as it may be the last signal from the device.
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [timestamp, pattern, severity]
 *             properties:
 *               timestamp:
 *                 type: number
 *                 description: Unix timestamp of when the incident occurred
 *               accelerometerData:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     x:
 *                       type: number
 *                     y:
 *                       type: number
 *                     z:
 *                       type: number
 *                     timestamp:
 *                       type: number
 *               gyroscopeData:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     x:
 *                       type: number
 *                     y:
 *                       type: number
 *                     z:
 *                       type: number
 *                     timestamp:
 *                       type: number
 *               pattern:
 *                 type: object
 *                 required: [throwPhase, tumblePhase, impactPhase, confidence]
 *                 properties:
 *                   throwPhase:
 *                     type: boolean
 *                   tumblePhase:
 *                     type: boolean
 *                   impactPhase:
 *                     type: boolean
 *                   confidence:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *               severity:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, CRITICAL]
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
 *                 properties:
 *                   model:
 *                     type: string
 *                   os:
 *                     type: string
 *                   appVersion:
 *                     type: string
 *               audioData:
 *                 type: object
 *                 properties:
 *                   base64Audio:
 *                     type: string
 *                   duration:
 *                     type: number
 *                   format:
 *                     type: string
 *               sensorBuffer:
 *                 type: object
 *                 properties:
 *                   accelerometer:
 *                     type: array
 *                   gyroscope:
 *                     type: array
 *                   bufferDuration:
 *                     type: number
 *     responses:
 *       200:
 *         description: Thrown away incident processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 incidentId:
 *                   type: string
 *                 alertsInitiated:
 *                   type: boolean
 *                 timestamp:
 *                   type: number
 *                 processingTime:
 *                   type: number
 *       400:
 *         description: Missing critical incident data
 *       401:
 *         description: User not authenticated
 *       500:
 *         description: Critical incident processing failed
 */
router.post('/thrown-away',
  authenticate,
  asyncHandler(thrownAwayController.handleThrownAwayIncident)
);

/**
 * @swagger
 * /api/v1/incidents/thrown-away/test:
 *   post:
 *     summary: Test the thrown-away detection system
 *     description: Send a test alert to verify the thrown-away detection and notification system is working correctly
 *     tags: [Incidents, Testing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test alert sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: number
 *       401:
 *         description: User not authenticated
 *       500:
 *         description: Failed to test thrown-away system
 */
router.post('/thrown-away/test',
  authenticate,
  asyncHandler(thrownAwayController.testThrownAwaySystem)
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
  authenticate,
  validateRequest(fakeShutdownSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { location, deviceInfo } = req.body;
    const userId = req.user!.id;

    Logger.warn(`Fake shutdown triggered by user ${userId} - potential duress situation`);

    // Create fake shutdown incident
    const incident = await db.incident.create({
      data: {
        type: 'FAKE_SHUTDOWN',
        wardId: userId,
        latitude: location?.latitude,
        longitude: location?.longitude,
        description: 'Fake shutdown triggered - potential duress or emergency situation detected'
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
        await db.evidence.create({
          data: {
            incidentId: incident.id,
            type: 'SENSOR_LOG',
            fileName: `device-info-${Date.now()}.json`,
            mimeType: 'application/json',
            fileSize: JSON.stringify(deviceInfo).length,
            storageUrl: `evidence/incidents/${incident.id}/device-info-${Date.now()}.json`,
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
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const { status, type, limit = 50 } = req.query;

    const where: any = { wardId: userId };
    
    if (status) where.status = status;
    if (type) where.type = type;

    const incidents = await db.incident.findMany({
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
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const guardianId = req.user!.id;
    const { wardId } = req.params;

    if (!wardId) {
      throw new ApiError('Ward ID is required', 400);
    }

    // Verify guardian relationship
    const relationship = await db.guardianRelationship.findFirst({
      where: {
        guardianId,
        wardId,
        isActive: true
      }
    });

    if (!relationship) {
      throw new ApiError('Not authorized to view incidents for this ward', 403);
    }

    const incidents = await db.incident.findMany({
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

/**
 * @swagger
 * /api/v1/incidents/ward/{wardId}:
 *   get:
 *     summary: Get incidents for a specific ward (for guardians)
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: wardId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ward's user ID
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
 *           enum: [SOS_TRIGGERED, SOS_MANUAL, FALL_DETECTED, THROWN_AWAY, FAKE_SHUTDOWN]
 *         description: Filter by incident type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of incidents to return
 *     responses:
 *       200:
 *         description: List of incidents for the ward
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Incident'
 *                 total:
 *                   type: integer
 *       403:
 *         description: Not authorized to view this ward's incidents
 */
router.get('/ward/:wardId',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const guardianId = req.user!.id;
    const { wardId } = req.params;
    const { status, type, limit = 50 } = req.query;

    if (!wardId) {
      throw new ApiError('Ward ID is required', 400);
    }

    // Check if the authenticated user is a guardian of this ward
    const guardianRelationship = await db.guardianRelationship.findFirst({
      where: {
        guardianId,
        wardId,
        isActive: true
      }
    });

    if (!guardianRelationship) {
      throw new ApiError('You are not authorized to view incidents for this ward', 403);
    }

    const where: any = { wardId };
    
    if (status) where.status = status;
    if (type) where.type = type;

    const incidents = await db.incident.findMany({
      where,
      include: {
        ward: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
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

    Logger.info(`Guardian ${guardianId} fetched ${incidents.length} incidents for ward ${wardId}`);

    res.json({
      success: true,
      data: incidents,
      total: incidents.length
    });
  })
);

export default router;

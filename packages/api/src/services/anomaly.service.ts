import { DatabaseService } from './database.service';
import { AlertService, AlertType, AlertPriority } from './alert.service';
import { configService } from './config.service';
import { redisService } from './redis.service';
import { Logger } from '../utils';

/**
 * Sensor Data Interface
 * Structure for incoming sensor data from mobile devices
 */
export interface SensorData {
  wardId: string;
  accelerometer?: {
    x: number;
    y: number;
    z: number;
  };
  gyroscope?: {
    x: number;
    y: number;
    z: number;
  };
  location?: {
    latitude: number;
    longitude: number;
  };
  timestamp: Date;
  deviceInfo?: {
    batteryLevel?: number;
    deviceId?: string;
  };
}

/**
 * Fall Detection Result Interface
 */
interface FallDetectionResult {
  isFallDetected: boolean;
  confidence: number;
  rawAcceleration: number;
  threshold: number;
}

/**
 * Anomaly Detection Service
 *
 * This service processes sensor data from mobile devices and detects
 * potential safety incidents like falls. When an incident is detected,
 * it creates a persistent record and triggers alerts to guardians.
 */
export class AnomalyDetectionService {
  private db: ReturnType<typeof DatabaseService.getInstance>;
  private alertService: AlertService;

  // Default fall detection thresholds (fallback values)
  private readonly DEFAULT_FALL_THRESHOLD = 20; // m/s² - threshold for sudden acceleration
  private readonly DEFAULT_FALL_CONFIDENCE_THRESHOLD = 0.7; // minimum confidence for fall detection

  constructor() {
    this.db = DatabaseService.getInstance();
    this.alertService = new AlertService();
  }

  /**
   * Process incoming sensor data and detect anomalies
   * @param sensorData - The sensor data from the mobile device
   * @returns Promise<boolean> - True if an incident was detected and created
   */
  async processSensorData(sensorData: SensorData): Promise<boolean> {
    try {
      Logger.info(`Processing sensor data for ward ${sensorData.wardId}`);

      // Validate sensor data
      if (!this.validateSensorData(sensorData)) {
        Logger.warn('Invalid sensor data received', { wardId: sensorData.wardId });
        return false;
      }

      // Perform fall detection
      const fallResult = await this.detectFall(sensorData);

      if (fallResult.isFallDetected) {
        Logger.warn(`Fall detected for ward ${sensorData.wardId}`, {
          confidence: fallResult.confidence,
          acceleration: fallResult.rawAcceleration,
        });

        // Create incident record in database
        const incident = await this.createIncident(sensorData.wardId, 'FALL_DETECTED', sensorData.location, {
          fallDetection: fallResult,
          sensorData: {
            accelerometer: sensorData.accelerometer,
            gyroscope: sensorData.gyroscope,
            timestamp: sensorData.timestamp,
          },
        });

        // Send alert to guardians with incident information
        await this.triggerIncidentAlert(incident.id, sensorData);

        return true;
      }

      // Log non-incident data for monitoring
      Logger.debug(`Sensor data processed - no incidents detected for ward ${sensorData.wardId}`);
      return false;
    } catch (error) {
      Logger.error(`Error processing sensor data for ward ${sensorData.wardId}:`, error);
      return false;
    }
  }

  /**
   * Create a new incident record in the database
   * Includes buffered pre-incident data from Redis
   * @private
   */
  private async createIncident(
    wardId: string,
    type: 'FALL_DETECTED' | 'SOS_MANUAL' | 'THROWN_AWAY' | 'FAKE_SHUTDOWN',
    location?: { latitude: number; longitude: number },
    metadata?: any,
  ) {
    try {
      // Get buffered pre-incident data from Redis
      let preIncidentData = null;
      if (redisService.isRedisConnected()) {
        try {
          preIncidentData = await redisService.getPreIncidentData(wardId);
          Logger.info(`Retrieved pre-incident data for ward ${wardId}`, {
            locationPoints: preIncidentData.locationData.length,
            sensorPoints: preIncidentData.sensorData.length,
          });
        } catch (error) {
          Logger.warn(`Failed to retrieve pre-incident data for ward ${wardId}:`, error);
        }
      }

      const incident = await this.db.incident.create({
        data: {
          wardId,
          type,
          isActive: true,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          description: this.generateIncidentDescription(type, metadata),
          severity: this.getIncidentSeverity(type),
          ...(preIncidentData && { preIncidentData }),
        },
        include: {
          ward: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      Logger.info(`Incident created: ${incident.id} for ward ${wardId}`, {
        type,
        severity: incident.severity,
        hasLocation: !!location,
      });

      return incident;
    } catch (error) {
      Logger.error(`Failed to create incident for ward ${wardId}:`, error);
      throw error;
    }
  }

  /**
   * Trigger alert to guardians for an incident
   * @private
   */
  private async triggerIncidentAlert(incidentId: string, sensorData: SensorData) {
    try {
      const alertData = {
        wardId: sensorData.wardId,
        timestamp: sensorData.timestamp,
        ...(sensorData.location && {
          location: {
            latitude: sensorData.location.latitude,
            longitude: sensorData.location.longitude,
          },
        }),
        message: 'Fall detected - immediate attention required',
        priority: AlertPriority.CRITICAL,
        requiresResponse: true,
        metadata: {
          incidentId,
          sensorData: {
            accelerometer: sensorData.accelerometer,
            deviceInfo: sensorData.deviceInfo,
          },
        },
      };

      const results = await this.alertService.sendIncidentAlert(
        sensorData.wardId,
        incidentId,
        AlertType.FALL_DETECTED,
        alertData,
      );

      const successCount = results.filter(r => r.success).length;
      Logger.info(`Fall alert sent for incident ${incidentId}: ${successCount}/${results.length} guardians notified`);
    } catch (error) {
      Logger.error(`Failed to send incident alert for incident ${incidentId}:`, error);
      throw error;
    }
  }

  /**
   * Detect falls based on accelerometer data
   * Uses dynamic configuration for thresholds
   * @private
   */
  private async detectFall(sensorData: SensorData): Promise<FallDetectionResult> {
    // Get dynamic configuration values with fallbacks
    const fallThreshold = await configService.getConfigAsNumber(
      'FALL_SENSITIVITY_THRESHOLD',
      this.DEFAULT_FALL_THRESHOLD,
    );
    const confidenceThreshold = await configService.getConfigAsNumber(
      'FALL_CONFIDENCE_THRESHOLD',
      this.DEFAULT_FALL_CONFIDENCE_THRESHOLD,
    );

    if (!sensorData.accelerometer) {
      return {
        isFallDetected: false,
        confidence: 0,
        rawAcceleration: 0,
        threshold: fallThreshold,
      };
    }

    const { x, y, z } = sensorData.accelerometer;

    // Calculate total acceleration magnitude
    const acceleration = Math.sqrt(x * x + y * y + z * z);

    // Simple fall detection: sudden high acceleration
    const isFallDetected = acceleration > fallThreshold;

    // Calculate confidence based on how far above threshold
    const confidence = isFallDetected ? Math.min(1.0, (acceleration - fallThreshold) / fallThreshold) : 0;

    return {
      isFallDetected: isFallDetected && confidence >= confidenceThreshold,
      confidence,
      rawAcceleration: acceleration,
      threshold: fallThreshold,
    };
  }

  /**
   * Validate incoming sensor data
   * @private
   */
  private validateSensorData(sensorData: SensorData): boolean {
    if (!sensorData.wardId || typeof sensorData.wardId !== 'string') {
      return false;
    }

    if (!sensorData.timestamp || !(sensorData.timestamp instanceof Date)) {
      return false;
    }

    // At least one sensor type should be present
    if (!sensorData.accelerometer && !sensorData.gyroscope && !sensorData.location) {
      return false;
    }

    return true;
  }

  /**
   * Generate incident description based on type and metadata
   * @private
   */
  private generateIncidentDescription(type: string, metadata?: any): string {
    switch (type) {
      case 'FALL_DETECTED':
        const confidence = metadata?.fallDetection?.confidence || 0;
        return `Fall detected with ${(confidence * 100).toFixed(1)}% confidence`;
      case 'SOS_MANUAL':
        return 'Manual SOS button pressed by user';
      case 'THROWN_AWAY':
        return 'Device appears to have been thrown or discarded';
      case 'FAKE_SHUTDOWN':
        return 'Suspicious device shutdown detected';
      default:
        return `Incident of type ${type} detected`;
    }
  }

  /**
   * Get incident severity based on type
   * @private
   */
  private getIncidentSeverity(type: string): string {
    switch (type) {
      case 'FALL_DETECTED':
      case 'SOS_MANUAL':
        return 'critical';
      case 'THROWN_AWAY':
      case 'FAKE_SHUTDOWN':
        return 'high';
      default:
        return 'medium';
    }
  }

  /**
   * Create a manual SOS incident
   * @param wardId - The ID of the ward triggering SOS
   * @param location - Optional location data
   * @param message - Optional message from the user
   * @returns Promise<Incident> - The created incident
   */
  async createManualSOSIncident(wardId: string, location?: { latitude: number; longitude: number }, message?: string) {
    try {
      // Create incident record
      const incident = await this.createIncident(wardId, 'SOS_MANUAL', location, { userMessage: message });

      // Prepare alert data
      const alertData = {
        wardId,
        timestamp: new Date(),
        ...(location && {
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
        }),
        message: message || 'Emergency SOS triggered by user',
        priority: AlertPriority.EMERGENCY,
        requiresResponse: true,
        metadata: {
          incidentId: incident.id,
          userMessage: message,
          triggerMethod: 'manual',
        },
      };

      // Send alert to guardians
      const results = await this.alertService.sendIncidentAlert(
        wardId,
        incident.id,
        AlertType.SOS_TRIGGERED,
        alertData,
      );

      const successCount = results.filter(r => r.success).length;
      Logger.info(
        `Manual SOS alert sent for incident ${incident.id}: ${successCount}/${results.length} guardians notified`,
      );

      return incident;
    } catch (error) {
      Logger.error(`Failed to create manual SOS incident for ward ${wardId}:`, error);
      throw error;
    }
  }
}

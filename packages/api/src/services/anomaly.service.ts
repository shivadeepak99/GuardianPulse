import { DatabaseService } from './database.service';
import { AlertService, AlertType, AlertPriority } from './alert.service';
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
  
  // Fall detection thresholds
  private readonly FALL_THRESHOLD = 20; // m/s² - threshold for sudden acceleration
  private readonly FALL_CONFIDENCE_THRESHOLD = 0.7; // minimum confidence for fall detection

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
      const fallResult = this.detectFall(sensorData);
      
      if (fallResult.isFallDetected) {
        Logger.warn(`Fall detected for ward ${sensorData.wardId}`, {
          confidence: fallResult.confidence,
          acceleration: fallResult.rawAcceleration
        });

        // Create incident record in database
        const incident = await this.createIncident(
          sensorData.wardId,
          'FALL_DETECTED',
          sensorData.location,
          {
            fallDetection: fallResult,
            sensorData: {
              accelerometer: sensorData.accelerometer,
              gyroscope: sensorData.gyroscope,
              timestamp: sensorData.timestamp
            }
          }
        );

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
   * @private
   */
  private async createIncident(
    wardId: string,
    type: 'FALL_DETECTED' | 'SOS_MANUAL' | 'THROWN_AWAY' | 'FAKE_SHUTDOWN',
    location?: { latitude: number; longitude: number },
    metadata?: any
  ) {
    try {
      const incident = await this.db.incident.create({
        data: {
          wardId,
          type,
          isActive: true,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          description: this.generateIncidentDescription(type, metadata),
          severity: this.getIncidentSeverity(type),
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

      Logger.info(`Incident created: ${incident.id} for ward ${wardId}`, {
        type,
        severity: incident.severity,
        hasLocation: !!location
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
            longitude: sensorData.location.longitude
          }
        }),
        message: 'Fall detected - immediate attention required',
        priority: AlertPriority.CRITICAL,
        requiresResponse: true,
        metadata: {
          incidentId,
          sensorData: {
            accelerometer: sensorData.accelerometer,
            deviceInfo: sensorData.deviceInfo
          }
        }
      };

      const results = await this.alertService.sendIncidentAlert(
        sensorData.wardId,
        incidentId,
        AlertType.FALL_DETECTED,
        alertData
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
   * @private
   */
  private detectFall(sensorData: SensorData): FallDetectionResult {
    if (!sensorData.accelerometer) {
      return {
        isFallDetected: false,
        confidence: 0,
        rawAcceleration: 0,
        threshold: this.FALL_THRESHOLD
      };
    }

    const { x, y, z } = sensorData.accelerometer;
    
    // Calculate total acceleration magnitude
    const acceleration = Math.sqrt(x * x + y * y + z * z);
    
    // Simple fall detection: sudden high acceleration
    const isFallDetected = acceleration > this.FALL_THRESHOLD;
    
    // Calculate confidence based on how far above threshold
    const confidence = isFallDetected 
      ? Math.min(1.0, (acceleration - this.FALL_THRESHOLD) / this.FALL_THRESHOLD)
      : 0;

    return {
      isFallDetected: isFallDetected && confidence >= this.FALL_CONFIDENCE_THRESHOLD,
      confidence,
      rawAcceleration: acceleration,
      threshold: this.FALL_THRESHOLD
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
  private generateIncidentDescription(
    type: string, 
    metadata?: any
  ): string {
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
  async createManualSOSIncident(
    wardId: string,
    location?: { latitude: number; longitude: number },
    message?: string
  ) {
    try {
      // Create incident record
      const incident = await this.createIncident(
        wardId,
        'SOS_MANUAL',
        location,
        { userMessage: message }
      );

      // Prepare alert data
      const alertData = {
        wardId,
        timestamp: new Date(),
        ...(location && {
          location: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        }),
        message: message || 'Emergency SOS triggered by user',
        priority: AlertPriority.EMERGENCY,
        requiresResponse: true,
        metadata: {
          incidentId: incident.id,
          userMessage: message,
          triggerMethod: 'manual'
        }
      };

      // Send alert to guardians
      const results = await this.alertService.sendIncidentAlert(
        wardId,
        incident.id,
        AlertType.SOS_TRIGGERED,
        alertData
      );

      const successCount = results.filter(r => r.success).length;
      Logger.info(`Manual SOS alert sent for incident ${incident.id}: ${successCount}/${results.length} guardians notified`);

      return incident;

    } catch (error) {
      Logger.error(`Failed to create manual SOS incident for ward ${wardId}:`, error);
      throw error;
    }
  }
}

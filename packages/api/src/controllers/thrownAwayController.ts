import { Response } from 'express';
import { AlertService, AlertType } from '../services/alert.service';
import { Logger } from '../utils';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { config } from '../config';

/**
 * Interface for thrown-away incident data
 */
interface ThrownAwayIncidentData {
  timestamp: number;
  accelerometerData: Array<{
    x: number;
    y: number;
    z: number;
    timestamp: number;
  }>;
  gyroscopeData: Array<{
    x: number;
    y: number;
    z: number;
    timestamp: number;
  }>;
  pattern: {
    throwPhase: boolean;
    tumblePhase: boolean;
    impactPhase: boolean;
    confidence: number;
  };
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  deviceInfo?: {
    model: string;
    os: string;
    appVersion: string;
  };
  audioData?: {
    base64Audio: string;
    duration: number;
    format: string;
  };
  sensorBuffer?: {
    accelerometer: any[];
    gyroscope: any[];
    bufferDuration: number;
  };
}

/**
 * Controller for handling thrown-away device incidents
 * This is a CRITICAL endpoint that must be extremely fast and reliable
 */
export class ThrownAwayController {
  private alertService: AlertService;

  constructor() {
    this.alertService = new AlertService();
  }

  /**
   * Handle thrown-away incident report
   * POST /api/v1/incidents/thrown-away
   * 
   * This endpoint MUST be extremely fast as it may be the last signal from the device
   */
  public handleThrownAwayIncident = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ 
          success: false, 
          error: 'User not authenticated',
          timestamp: Date.now()
        });
        return;
      }

      const incidentData: ThrownAwayIncidentData = req.body as ThrownAwayIncidentData;

      // Validate critical fields
      if (!incidentData.timestamp || !incidentData.pattern || !incidentData.severity) {
        res.status(400).json({ 
          success: false, 
          error: 'Missing critical incident data',
          timestamp: Date.now()
        });
        return;
      }

      Logger.error('🚨 THROWN-AWAY INCIDENT DETECTED', {
        userId,
        timestamp: incidentData.timestamp,
        severity: incidentData.severity,
        confidence: incidentData.pattern.confidence,
        location: incidentData.location,
      });

      // Immediately respond to mobile app (critical for timing)
      const incidentId = `thrown-away-${Date.now()}-${userId}`;
      res.status(200).json({
        success: true,
        incidentId,
        alertsInitiated: true,
        timestamp: Date.now(),
        processingTime: Date.now() - startTime,
      });

      // Trigger immediate CRITICAL alerts (async, don't block response)
      setImmediate(async () => {
        try {
          // Prepare critical alert message
          const alertLocation = incidentData.location ? {
            latitude: incidentData.location.latitude,
            longitude: incidentData.location.longitude,
          } : undefined;

          const alertMessage = this.formatCriticalThrownAwayMessage({
            wardName: req.user?.firstName || 'Unknown Ward',
            timestamp: new Date(incidentData.timestamp).toLocaleString(),
            location: alertLocation,
            confidence: (incidentData.pattern.confidence * 100).toFixed(1),
            deviceInfo: incidentData.deviceInfo?.model || 'Unknown Device',
            severity: incidentData.severity,
          });

          // Send alerts using the existing alert service method
          const alertData = {
            wardName: req.user?.firstName || 'Unknown Ward',
            wardId: userId,
            timestamp: new Date(incidentData.timestamp),
            metadata: {
              incidentId,
              detectionConfidence: incidentData.pattern.confidence,
              deviceThrown: true,
              immediateResponse: true,
              customMessage: alertMessage,
            },
          } as any;

          if (alertLocation) {
            alertData.location = alertLocation;
          }

          await this.alertService.sendAlertToAllGuardians(userId, AlertType.THROWN_AWAY, alertData);

          Logger.error('🚨 CRITICAL thrown-away alerts sent', {
            userId,
            incidentId,
            alertsProcessingTime: Date.now() - startTime,
          });

        } catch (alertError) {
          Logger.error('CRITICAL ERROR: Failed to send thrown-away alerts', {
            error: alertError,
            userId,
            incidentId,
          });
        }
      });

    } catch (error) {
      Logger.error('CRITICAL ERROR in thrown-away incident handler', {
        error,
        userId: req.user?.id,
        processingTime: Date.now() - startTime,
      });

      // Only send error response if we haven't already responded
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Critical incident processing failed',
          timestamp: Date.now(),
          processingTime: Date.now() - startTime,
        });
      }
    }
  };

  /**
   * Format the critical thrown-away SMS message
   */
  private formatCriticalThrownAwayMessage(context: {
    wardName: string;
    timestamp: string;
    location?: { latitude: number; longitude: number } | undefined;
    confidence: string;
    deviceInfo: string;
    severity: string;
  }): string {
    const locationText = context.location 
      ? `Last location: ${context.location.latitude.toFixed(4)}, ${context.location.longitude.toFixed(4)}`
      : 'Location unavailable';

    return `🚨 CRITICAL GuardianPulse Alert 🚨

DEVICE THROWN/DESTROYED: ${context.wardName}

${locationText}
Detected: ${context.timestamp}
Confidence: ${context.confidence}%
Device: ${context.deviceInfo}

⚠️ IMMEDIATE ATTENTION REQUIRED ⚠️

This may be the last signal from the device. Contact ward immediately and consider emergency services if unable to reach.

View details: ${config.app.dashboardUrl}/emergency

Reply STOP to opt out`;
  }

  /**
   * Test thrown-away detection system
   * POST /api/v1/incidents/thrown-away/test
   */
  public testThrownAwaySystem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const testMessage = this.formatCriticalThrownAwayMessage({
        wardName: req.user?.firstName || 'Test Ward',
        timestamp: new Date().toLocaleString(),
        location: { latitude: 40.7128, longitude: -74.0060 },
        confidence: '95.0',
        deviceInfo: 'Test Device',
        severity: 'CRITICAL',
      });

      // Send test alert
      await this.alertService.sendAlertToAllGuardians(userId, AlertType.THROWN_AWAY, {
        wardName: req.user?.firstName || 'Test Ward',
        wardId: userId,
        timestamp: new Date(),
        metadata: {
          testAlert: true,
          timestamp: Date.now(),
          customMessage: `[TEST] ${testMessage}`,
        },
      });

      res.json({
        success: true,
        message: 'Test thrown-away alert sent to guardians',
        timestamp: Date.now(),
      });

    } catch (error) {
      Logger.error('Error testing thrown-away system', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to test thrown-away system' });
    }
  };
}

export default ThrownAwayController;

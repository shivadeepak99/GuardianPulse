import { DatabaseService } from './database.service';
import { Logger } from '../utils';
import { config } from '../config';
import { Twilio } from 'twilio';

/**
 * Alert Types Enum
 * Defines the different types of alerts that can be sent to guardians
 */

export enum AlertType {
  SOS_TRIGGERED = 'SOS_TRIGGERED',
  FALL_DETECTED = 'FALL_DETECTED',
  PANIC_BUTTON = 'PANIC_BUTTON',
  LOCATION_LOST = 'LOCATION_LOST',
  BATTERY_LOW = 'BATTERY_LOW',
  DEVICE_OFFLINE = 'DEVICE_OFFLINE',
  GEOFENCE_VIOLATION = 'GEOFENCE_VIOLATION',
  UNUSUAL_ACTIVITY = 'UNUSUAL_ACTIVITY',
  EMERGENCY_CONTACT = 'EMERGENCY_CONTACT',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  THROWN_AWAY = 'THROWN_AWAY',
  FAKE_SHUTDOWN = 'FAKE_SHUTDOWN',
}

/**
 * Alert Priority Levels
 */
export enum AlertPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
  EMERGENCY = 'EMERGENCY',
}

/**
 * Alert Data Interface
 * Structure for alert context data
 */
export interface AlertData {
  wardName?: string;
  wardId?: string;
  timestamp?: Date;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  dashboardLink?: string;
  message?: string;
  metadata?: Record<string, any>;
  priority?: AlertPriority;
  requiresResponse?: boolean;
}

/**
 * Guardian Information Interface
 */
interface GuardianInfo {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  preferredNotificationMethod?: string;
}

/**
 * Alert Delivery Result Interface
 */
interface AlertDeliveryResult {
  guardianId: string;
  success: boolean;
  method: string;
  timestamp: Date;
  error?: string;
}

/**
 * Foundational Alert Service
 * 
 * This service provides a centralized way to send alerts to guardians.
 * Supports multiple notification channels: Console logging, SMS via Twilio,
 * and can be extended for Email and Push notifications.
 */
export class AlertService {
  private db: ReturnType<typeof DatabaseService.getInstance>;
  private twilioClient: Twilio | null = null;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.initializeTwilio();
  }

  /**
   * Initialize Twilio client if credentials are available
   */
  private initializeTwilio(): void {
    if (config.twilio.accountSid && config.twilio.authToken) {
      try {
        this.twilioClient = new Twilio(
          config.twilio.accountSid,
          config.twilio.authToken
        );
        Logger.info('Twilio client initialized successfully');
      } catch (error) {
        Logger.error('Failed to initialize Twilio client:', error);
        this.twilioClient = null;
      }
    } else {
      Logger.warn('Twilio credentials not configured. SMS alerts will be disabled.');
    }
  }

  /**
   * Send an alert to a specific guardian
   * @param guardianId - The ID of the guardian to notify
   * @param alertType - The type of alert being sent
   * @param data - Additional context data for the alert
   * @returns Promise<AlertDeliveryResult> - Result of the alert delivery
   */
  async sendAlertToGuardian(
    guardianId: string,
    alertType: AlertType,
    data: AlertData
  ): Promise<AlertDeliveryResult> {
    try {
      // Get guardian information from database
      const guardian = await this.getGuardianInfo(guardianId);
      
      if (!guardian) {
        const error = `Guardian with ID ${guardianId} not found`;
        Logger.warn(error);
        return {
          guardianId,
          success: false,
          method: 'console',
          timestamp: new Date(),
          error,
        };
      }

      // Prepare alert context
      const alertContext = this.prepareAlertContext(guardian, alertType, data);
      
      // Try to send SMS first, fall back to console
      let deliveryResult: AlertDeliveryResult;
      
      if (guardian.phoneNumber && this.twilioClient) {
        deliveryResult = await this.deliverViaSMS(guardian, alertType, alertContext);
      } else {
        deliveryResult = await this.deliverViaConsole(guardian, alertType, alertContext);
      }
      
      // Log the alert for auditing
      this.logAlertDelivery(guardianId, alertType, data, deliveryResult);
      
      return deliveryResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(`Failed to send alert to guardian ${guardianId}:`, error);
      
      return {
        guardianId,
        success: false,
        method: 'console',
        timestamp: new Date(),
        error: errorMessage,
      };
    }
  }

  /**
   * Send an alert to all guardians of a specific ward
   * @param wardId - The ID of the ward
   * @param alertType - The type of alert being sent
   * @param data - Additional context data for the alert
   * @returns Promise<AlertDeliveryResult[]> - Results of all alert deliveries
   */
  async sendAlertToAllGuardians(
    wardId: string,
    alertType: AlertType,
    data: AlertData
  ): Promise<AlertDeliveryResult[]> {
    try {
      // Get all guardians for the ward
      const guardians = await this.getWardsGuardians(wardId);
      
      if (guardians.length === 0) {
        Logger.warn(`No guardians found for ward ${wardId}`);
        return [];
      }

      // Enhance data with ward information if not present
      const enhancedData = await this.enhanceAlertData(wardId, data);
      
      // Send alerts to all guardians concurrently
      const deliveryPromises = guardians.map(guardian =>
        this.sendAlertToGuardian(guardian.id, alertType, enhancedData)
      );
      
      const results = await Promise.allSettled(deliveryPromises);
      
      // Process results and log summary
      const deliveryResults = results.map((result, index) => {
        const guardian = guardians[index];
        if (!guardian) {
          return {
            guardianId: 'unknown',
            success: false,
            method: 'console',
            timestamp: new Date(),
            error: 'Guardian not found',
          };
        }
        
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          Logger.error(`Failed to send alert to guardian ${guardian.id}:`, result.reason);
          return {
            guardianId: guardian.id,
            success: false,
            method: 'console',
            timestamp: new Date(),
            error: result.reason?.message || 'Unknown error',
          };
        }
      });
      
      // Log summary
      const successCount = deliveryResults.filter(r => r.success).length;
      Logger.info(`Alert batch sent: ${successCount}/${deliveryResults.length} successful deliveries for ward ${wardId}`);
      
      return deliveryResults;
    } catch (error) {
      Logger.error(`Failed to send alerts to guardians for ward ${wardId}:`, error);
      return [];
    }
  }

  /**
   * Send incident alert to all guardians (convenience method for incidents)
   * @param wardId - The ID of the ward
   * @param incidentId - The ID of the incident
   * @param alertType - The type of alert being sent
   * @param data - Additional context data for the alert
   * @returns Promise<AlertDeliveryResult[]> - Results of all alert deliveries
   */
  async sendIncidentAlert(
    wardId: string,
    incidentId: string,
    alertType: AlertType,
    data: AlertData
  ): Promise<AlertDeliveryResult[]> {
    // Enhance data with incident information
    const enhancedData = {
      ...data,
      metadata: {
        ...data.metadata,
        incidentId,
        type: 'incident_alert'
      }
    };

    return this.sendAlertToAllGuardians(wardId, alertType, enhancedData);
  }

  /**
   * Get guardian information from database
   * @private
   */
  private async getGuardianInfo(guardianId: string): Promise<GuardianInfo | null> {
    try {
      const guardian = await this.db.user.findUnique({
        where: { id: guardianId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
        },
      });
      
      return guardian as GuardianInfo | null;
    } catch (error) {
      Logger.error(`Error fetching guardian info for ${guardianId}:`, error);
      return null;
    }
  }

  /**
   * Get all guardians for a specific ward
   * @private
   */
  private async getWardsGuardians(wardId: string): Promise<GuardianInfo[]> {
    try {
      const guardianRelations = await this.db.guardianRelationship.findMany({
        where: { 
          wardId,
          isActive: true
        },
        include: {
          guardian: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
            },
          },
        },
      });
      
      return guardianRelations.map((relation: any) => relation.guardian as GuardianInfo);
    } catch (error) {
      Logger.error(`Error fetching guardians for ward ${wardId}:`, error);
      return [];
    }
  }

  /**
   * Enhance alert data with ward information
   * @private
   */
  private async enhanceAlertData(wardId: string, data: AlertData): Promise<AlertData> {
    try {
      if (!data.wardName || !data.wardId) {
        const ward = await this.db.user.findUnique({
          where: { id: wardId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        });
        
        if (ward) {
          data.wardId = ward.id;
          data.wardName = `${ward.firstName || ''} ${ward.lastName || ''}`.trim() || 'Unknown Ward';
        }
      }
      
      // Add dashboard link if not present
      if (!data.dashboardLink) {
        data.dashboardLink = `${process.env['WEB_APP_URL'] || 'http://localhost:3000'}/dashboard/ward/${wardId}`;
      }
      
      // Set timestamp if not present
      if (!data.timestamp) {
        data.timestamp = new Date();
      }
      
      return data;
    } catch (error) {
      Logger.error(`Error enhancing alert data for ward ${wardId}:`, error);
      return data;
    }
  }

  /**
   * Prepare alert context for delivery
   * @private
   */
  private prepareAlertContext(guardian: GuardianInfo, alertType: AlertType, data: AlertData): any {
    const guardianName = `${guardian.firstName || ''} ${guardian.lastName || ''}`.trim() || guardian.email;
    
    return {
      guardian: {
        id: guardian.id,
        name: guardianName,
        email: guardian.email,
      },
      alert: {
        type: alertType,
        priority: data.priority || this.getDefaultPriority(alertType),
        timestamp: data.timestamp || new Date(),
        requiresResponse: data.requiresResponse || this.requiresResponse(alertType),
      },
      ward: {
        id: data.wardId,
        name: data.wardName,
      },
      location: data.location,
      message: data.message || this.getDefaultMessage(alertType, data),
      dashboardLink: data.dashboardLink,
      metadata: data.metadata,
    };
  }

  /**
   * Deliver alert via console (current implementation)
   * @private
   */
  private async deliverViaConsole(
    guardian: GuardianInfo,
    alertType: AlertType,
    context: any
  ): Promise<AlertDeliveryResult> {
    const alertMessage = this.formatConsoleAlert(guardian.id, alertType, context);
    
    // Log the alert based on priority
    const priority = context.alert.priority;
    switch (priority) {
      case AlertPriority.EMERGENCY:
      case AlertPriority.CRITICAL:
        Logger.error(alertMessage);
        break;
      case AlertPriority.HIGH:
        Logger.warn(alertMessage);
        break;
      default:
        Logger.info(alertMessage);
    }
    
    return {
      guardianId: guardian.id,
      success: true,
      method: 'console',
      timestamp: new Date(),
    };
  }

  /**
   * Deliver alert via SMS using Twilio
   * @private
   */
  private async deliverViaSMS(
    guardian: GuardianInfo,
    alertType: AlertType,
    context: any
  ): Promise<AlertDeliveryResult> {
    try {
      if (!this.twilioClient) {
        throw new Error('Twilio client not available');
      }

      if (!guardian.phoneNumber) {
        throw new Error('Guardian phone number not available');
      }

      if (!config.twilio.phoneNumber) {
        throw new Error('Twilio phone number not configured');
      }

      // Format SMS message
      const smsMessage = this.formatSMSAlert(alertType, context);
      
      // Send SMS via Twilio
      const message = await this.twilioClient.messages.create({
        body: smsMessage,
        from: config.twilio.phoneNumber,
        to: guardian.phoneNumber,
      });

      Logger.info(`SMS alert sent to guardian ${guardian.id}: ${message.sid}`);

      return {
        guardianId: guardian.id,
        success: true,
        method: 'sms',
        timestamp: new Date(),
      };
    } catch (error) {
      Logger.error(`Failed to send SMS to guardian ${guardian.id}:`, error);
      
      // Fall back to console logging
      return await this.deliverViaConsole(guardian, alertType, context);
    }
  }

  /**
   * Format alert message for SMS
   * @private
   */
  private formatSMSAlert(alertType: AlertType, context: any): string {
    const wardName = context.ward.name || 'Unknown Ward';
    const dashboardUrl = context.dashboardLink || config.app.dashboardUrl;
    
    let alertTypeText = '';
    switch (alertType) {
      case AlertType.SOS_TRIGGERED:
        alertTypeText = 'SOS EMERGENCY';
        break;
      case AlertType.FALL_DETECTED:
        alertTypeText = 'FALL DETECTED';
        break;
      case AlertType.PANIC_BUTTON:
        alertTypeText = 'PANIC BUTTON';
        break;
      case AlertType.THROWN_AWAY:
        alertTypeText = 'DEVICE THROWN AWAY';
        break;
      case AlertType.FAKE_SHUTDOWN:
        alertTypeText = 'FAKE SHUTDOWN DETECTED';
        break;
      default:
        alertTypeText = alertType.replace('_', ' ');
    }

    let message = `🚨 GuardianPulse Alert: ${alertTypeText} - ${wardName}`;
    
    if (context.location) {
      message += ` at location ${context.location.latitude.toFixed(4)}, ${context.location.longitude.toFixed(4)}`;
    }
    
    message += `. Check your dashboard: ${dashboardUrl}`;
    
    // SMS has a 160 character limit, so we might need to truncate
    if (message.length > 160) {
      message = message.substring(0, 157) + '...';
    }
    
    return message;
  }

  /**
   * Format alert message for console output
   * @private
   */
  private formatConsoleAlert(guardianId: string, alertType: AlertType, context: any): string {
    const timestamp = context.alert.timestamp.toISOString();
    const priority = context.alert.priority;
    const wardName = context.ward.name || 'Unknown Ward';
    const message = context.message;
    const location = context.location 
      ? `Location: ${context.location.latitude}, ${context.location.longitude}` 
      : 'Location: Unknown';
    
    return `🚨 ALERT for Guardian [${guardianId}]: Type: [${alertType}] Priority: [${priority}] - Ward: [${wardName}] - ${message} - ${location} - Dashboard: ${context.dashboardLink} - Time: ${timestamp}`;
  }

  /**
   * Get default priority for alert type
   * @private
   */
  private getDefaultPriority(alertType: AlertType): AlertPriority {
    switch (alertType) {
      case AlertType.SOS_TRIGGERED:
      case AlertType.PANIC_BUTTON:
      case AlertType.THROWN_AWAY:
      case AlertType.FAKE_SHUTDOWN:
        return AlertPriority.EMERGENCY;
      case AlertType.FALL_DETECTED:
      case AlertType.EMERGENCY_CONTACT:
        return AlertPriority.CRITICAL;
      case AlertType.LOCATION_LOST:
      case AlertType.GEOFENCE_VIOLATION:
        return AlertPriority.HIGH;
      case AlertType.DEVICE_OFFLINE:
      case AlertType.UNUSUAL_ACTIVITY:
        return AlertPriority.MEDIUM;
      case AlertType.BATTERY_LOW:
      case AlertType.SYSTEM_ALERT:
        return AlertPriority.LOW;
      default:
        return AlertPriority.MEDIUM;
    }
  }

  /**
   * Check if alert type requires response
   * @private
   */
  private requiresResponse(alertType: AlertType): boolean {
    return [
      AlertType.SOS_TRIGGERED,
      AlertType.FALL_DETECTED,
      AlertType.PANIC_BUTTON,
      AlertType.EMERGENCY_CONTACT,
      AlertType.THROWN_AWAY,
      AlertType.FAKE_SHUTDOWN,
    ].includes(alertType);
  }

  /**
   * Get default message for alert type
   * @private
   */
  private getDefaultMessage(alertType: AlertType, data: AlertData): string {
    const wardName = data.wardName || 'your ward';
    
    switch (alertType) {
      case AlertType.SOS_TRIGGERED:
        return `${wardName} has triggered an SOS alert. Immediate attention required.`;
      case AlertType.FALL_DETECTED:
        return `A potential fall has been detected for ${wardName}. Please check on them immediately.`;
      case AlertType.PANIC_BUTTON:
        return `${wardName} has pressed the panic button. Emergency response needed.`;
      case AlertType.THROWN_AWAY:
        return `CRITICAL: ${wardName}'s device may have been thrown away or damaged. Last known location recorded. IMMEDIATE attention required.`;
      case AlertType.FAKE_SHUTDOWN:
        return `EMERGENCY: ${wardName} may be in danger. They attempted to power off their device, which could indicate duress. IMMEDIATE contact required.`;
      case AlertType.LOCATION_LOST:
        return `Location tracking for ${wardName} has been lost. Last known location available.`;
      case AlertType.BATTERY_LOW:
        return `${wardName}'s device battery is running low. Please remind them to charge it.`;
      case AlertType.DEVICE_OFFLINE:
        return `${wardName}'s device has gone offline. Please check connectivity.`;
      case AlertType.GEOFENCE_VIOLATION:
        return `${wardName} has left their designated safe area.`;
      case AlertType.UNUSUAL_ACTIVITY:
        return `Unusual activity patterns detected for ${wardName}.`;
      case AlertType.EMERGENCY_CONTACT:
        return `Emergency contact request from ${wardName}.`;
      case AlertType.SYSTEM_ALERT:
        return `System alert regarding ${wardName}.`;
      default:
        return `Alert notification for ${wardName}.`;
    }
  }

  /**
   * Log alert delivery for auditing
   * @private
   */
  private logAlertDelivery(
    guardianId: string,
    alertType: AlertType,
    data: AlertData,
    result: AlertDeliveryResult
  ): void {
    Logger.info('Alert delivery recorded', {
      guardianId,
      alertType,
      wardId: data.wardId,
      priority: data.priority,
      success: result.success,
      method: result.method,
      timestamp: result.timestamp,
      error: result.error,
    });
  }

  /**
   * Future: Add Email notification channel
   * This method will be implemented when email service is added
   */
  // private async deliverViaEmail(guardian: GuardianInfo, alertType: AlertType, context: any): Promise<AlertDeliveryResult> {
  //   // Implementation for email notifications
  // }

  /**
   * Future: Add SMS notification channel
   * This method will be implemented when SMS service is added
   */
  // private async deliverViaSMS(guardian: GuardianInfo, alertType: AlertType, context: any): Promise<AlertDeliveryResult> {
  //   // Implementation for SMS notifications
  // }

  /**
   * Future: Add Push notification channel
   * This method will be implemented when push service is added
   */
  // private async deliverViaPush(guardian: GuardianInfo, alertType: AlertType, context: any): Promise<AlertDeliveryResult> {
  //   // Implementation for push notifications
  // }
}

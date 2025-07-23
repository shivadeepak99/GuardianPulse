import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { Logger } from '../utils';
import { config } from '../config';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  priority?: 'high' | 'normal' | 'low';
}

export interface IncidentEmailData {
  wardName: string;
  wardEmail: string;
  incidentType: string;
  incidentId: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
  dashboardUrl: string;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Email configuration from environment variables
      const emailConfig = {
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure, // true for 465, false for other ports
        auth: {
          user: config.email.user,
          pass: config.email.password,
        },
      };

      // Validate configuration
      if (!emailConfig.host || !emailConfig.auth.user || !emailConfig.auth.pass) {
        Logger.warn('Email service not configured - missing required environment variables');
        return;
      }

      this.transporter = nodemailer.createTransport(emailConfig);

      // Verify the connection
      await this.transporter.verify();
      this.isConfigured = true;

      Logger.info('Email service initialized successfully', {
        host: emailConfig.host,
        port: emailConfig.port,
        user: emailConfig.auth.user,
      });
    } catch (error) {
      Logger.error('Failed to initialize email service', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Send a generic email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      Logger.warn('Email service not configured - skipping email send');
      return false;
    }

    try {
      const mailOptions = {
        from: config.email.from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        priority: options.priority || 'normal',
        headers: {
          'X-Mailer': 'GuardianPulse Safety Platform',
        },
      };

      const result = await this.transporter.sendMail(mailOptions);

      Logger.info('Email sent successfully', {
        to: mailOptions.to,
        subject: mailOptions.subject,
        messageId: result.messageId,
      });

      return true;
    } catch (error) {
      Logger.error('Failed to send email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: options.to,
        subject: options.subject,
      });
      return false;
    }
  }

  /**
   * Send incident alert email to guardians
   */
  async sendIncidentAlert(guardianEmails: string[], incidentData: IncidentEmailData): Promise<boolean> {
    if (guardianEmails.length === 0) {
      Logger.warn('No guardian emails provided for incident alert');
      return false;
    }

    const subject = `🚨 URGENT: ${incidentData.incidentType} Alert - ${incidentData.wardName}`;

    // Generate location links if coordinates are available
    const locationSection = incidentData.location
      ? `
        <div style="background: #fef3cd; border: 1px solid #fed136; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0; color: #856404;">📍 Location Information</h3>
          <p style="margin: 0 0 8px 0;">
            <strong>Coordinates:</strong> ${incidentData.location.latitude.toFixed(6)}, ${incidentData.location.longitude.toFixed(6)}
          </p>
          <div style="margin-top: 12px;">
            <a href="https://www.google.com/maps?q=${incidentData.location.latitude},${incidentData.location.longitude}" 
               style="display: inline-block; background: #007bff; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; margin-right: 8px;">
              📱 Open in Google Maps
            </a>
            <a href="https://www.openstreetmap.org/?mlat=${incidentData.location.latitude}&mlon=${incidentData.location.longitude}&zoom=15" 
               style="display: inline-block; background: #28a745; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">
              🗺️ Open in OpenStreetMap
            </a>
          </div>
        </div>
      `
      : '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>GuardianPulse Alert</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; background: white;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #dc3545, #fd7e14); color: white; padding: 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold;">🚨 URGENT SAFETY ALERT</h1>
              <p style="margin: 8px 0 0 0; font-size: 16px;">GuardianPulse Emergency Notification</p>
            </div>

            <!-- Content -->
            <div style="padding: 24px;">
              <!-- Alert Summary -->
              <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 12px 0; color: #721c24; font-size: 20px;">
                  ${incidentData.incidentType} Detected
                </h2>
                <p style="margin: 0; font-size: 16px; color: #721c24;">
                  <strong>${incidentData.wardName}</strong> requires immediate attention.
                </p>
              </div>

              <!-- Incident Details -->
              <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 16px 0; color: #495057;">📋 Incident Details</h3>
                
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 12px; background: #e9ecef; font-weight: bold; width: 30%;">Ward:</td>
                    <td style="padding: 8px 12px;">${incidentData.wardName} (${incidentData.wardEmail})</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 12px; background: #e9ecef; font-weight: bold;">Type:</td>
                    <td style="padding: 8px 12px;">${incidentData.incidentType}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 12px; background: #e9ecef; font-weight: bold;">Time:</td>
                    <td style="padding: 8px 12px;">${new Date(incidentData.timestamp).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 12px; background: #e9ecef; font-weight: bold;">Incident ID:</td>
                    <td style="padding: 8px 12px; font-family: monospace; font-size: 12px;">${incidentData.incidentId}</td>
                  </tr>
                </table>
              </div>

              ${locationSection}

              <!-- Action Required -->
              <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <h3 style="margin: 0 0 12px 0; color: #0c5460;">⚡ Immediate Action Required</h3>
                <ul style="margin: 0; padding-left: 20px; color: #0c5460;">
                  <li>Check on your ward immediately</li>
                  <li>Contact emergency services if needed</li>
                  <li>Review incident details in your dashboard</li>
                  <li>Update incident status once resolved</li>
                </ul>
              </div>

              <!-- Dashboard Access -->
              <div style="text-align: center; margin: 24px 0;">
                <a href="${incidentData.dashboardUrl}" 
                   style="display: inline-block; background: #007bff; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  🔗 View Full Incident Details
                </a>
              </div>

              <!-- Emergency Contacts -->
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <h3 style="margin: 0 0 12px 0; color: #856404;">📞 Emergency Contacts</h3>
                <p style="margin: 0; color: #856404;">
                  <strong>Emergency Services:</strong> Call your local emergency number immediately if this is a life-threatening situation.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #6c757d; color: white; padding: 16px; text-align: center; font-size: 12px;">
              <p style="margin: 0;">
                This is an automated alert from GuardianPulse Safety Platform<br>
                Sent at ${new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
🚨 URGENT SAFETY ALERT - GuardianPulse

${incidentData.incidentType} detected for ${incidentData.wardName}

INCIDENT DETAILS:
- Ward: ${incidentData.wardName} (${incidentData.wardEmail})
- Type: ${incidentData.incidentType}
- Time: ${new Date(incidentData.timestamp).toLocaleString()}
- Incident ID: ${incidentData.incidentId}

${
  incidentData.location
    ? `LOCATION:
- Coordinates: ${incidentData.location.latitude.toFixed(6)}, ${incidentData.location.longitude.toFixed(6)}
- Google Maps: https://www.google.com/maps?q=${incidentData.location.latitude},${incidentData.location.longitude}
- OpenStreetMap: https://www.openstreetmap.org/?mlat=${incidentData.location.latitude}&mlon=${incidentData.location.longitude}&zoom=15`
    : 'LOCATION: Not available'
}

IMMEDIATE ACTION REQUIRED:
- Check on your ward immediately
- Contact emergency services if needed
- Review incident details: ${incidentData.dashboardUrl}
- Update incident status once resolved

This is an automated alert from GuardianPulse Safety Platform.
Sent at ${new Date().toLocaleString()}
    `;

    return await this.sendEmail({
      to: guardianEmails,
      subject,
      text,
      html,
      priority: 'high',
    });
  }

  /**
   * Send incident resolution notification
   */
  async sendIncidentResolution(
    guardianEmails: string[],
    incidentData: IncidentEmailData,
    resolvedBy: string,
  ): Promise<boolean> {
    if (guardianEmails.length === 0) {
      Logger.warn('No guardian emails provided for incident resolution notification');
      return false;
    }

    const subject = `✅ RESOLVED: ${incidentData.incidentType} - ${incidentData.wardName}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>GuardianPulse - Incident Resolved</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; background: white;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold;">✅ INCIDENT RESOLVED</h1>
              <p style="margin: 8px 0 0 0; font-size: 16px;">GuardianPulse Safety Update</p>
            </div>

            <!-- Content -->
            <div style="padding: 24px;">
              <!-- Resolution Summary -->
              <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 12px 0; color: #155724; font-size: 20px;">
                  ${incidentData.incidentType} Resolved
                </h2>
                <p style="margin: 0; font-size: 16px; color: #155724;">
                  The incident involving <strong>${incidentData.wardName}</strong> has been marked as resolved.
                </p>
              </div>

              <!-- Incident Details -->
              <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 16px 0; color: #495057;">📋 Incident Summary</h3>
                
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 12px; background: #e9ecef; font-weight: bold; width: 30%;">Ward:</td>
                    <td style="padding: 8px 12px;">${incidentData.wardName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 12px; background: #e9ecef; font-weight: bold;">Type:</td>
                    <td style="padding: 8px 12px;">${incidentData.incidentType}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 12px; background: #e9ecef; font-weight: bold;">Started:</td>
                    <td style="padding: 8px 12px;">${new Date(incidentData.timestamp).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 12px; background: #e9ecef; font-weight: bold;">Resolved:</td>
                    <td style="padding: 8px 12px;">${new Date().toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 12px; background: #e9ecef; font-weight: bold;">Resolved By:</td>
                    <td style="padding: 8px 12px;">${resolvedBy}</td>
                  </tr>
                </table>
              </div>

              <!-- Dashboard Access -->
              <div style="text-align: center; margin: 24px 0;">
                <a href="${incidentData.dashboardUrl}" 
                   style="display: inline-block; background: #007bff; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  🔗 View Incident History
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #6c757d; color: white; padding: 16px; text-align: center; font-size: 12px;">
              <p style="margin: 0;">
                This is an automated notification from GuardianPulse Safety Platform<br>
                Sent at ${new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
✅ INCIDENT RESOLVED - GuardianPulse

The ${incidentData.incidentType} incident involving ${incidentData.wardName} has been resolved.

INCIDENT SUMMARY:
- Ward: ${incidentData.wardName}
- Type: ${incidentData.incidentType}
- Started: ${new Date(incidentData.timestamp).toLocaleString()}
- Resolved: ${new Date().toLocaleString()}
- Resolved By: ${resolvedBy}

View full incident history: ${incidentData.dashboardUrl}

This is an automated notification from GuardianPulse Safety Platform.
Sent at ${new Date().toLocaleString()}
    `;

    return await this.sendEmail({
      to: guardianEmails,
      subject,
      text,
      html,
      priority: 'normal',
    });
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      Logger.error('Email connection test failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Check if email service is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }
}

// Export singleton instance
export const emailService = new EmailService();

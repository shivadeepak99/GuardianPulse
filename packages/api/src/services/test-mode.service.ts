/**
 * Test Mode Services
 * Mock implementations for development without external dependencies
 */

import { Logger } from '../utils/Logger';

/**
 * Console Email Service (No SMTP required)
 */
export class ConsoleEmailService {
  async sendEmail(to: string, subject: string, content: string): Promise<boolean> {
    Logger.info('📧 EMAIL SENT (Console Mode)', {
      to,
      subject,
      content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      timestamp: new Date().toISOString(),
    });

    console.log('\n' + '='.repeat(60));
    console.log('📧 EMAIL NOTIFICATION');
    console.log('='.repeat(60));
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('Content:');
    console.log(content);
    console.log('='.repeat(60) + '\n');

    return true;
  }

  async sendAlert(to: string, alertType: string, data: any): Promise<boolean> {
    const subject = `🚨 GuardianPulse Alert: ${alertType}`;
    const content = `
Alert Type: ${alertType}
Time: ${new Date().toISOString()}
Details: ${JSON.stringify(data, null, 2)}

This is a test alert from GuardianPulse.
In production, this would be sent via SMTP.
    `;

    return this.sendEmail(to, subject, content);
  }
}

/**
 * Console SMS Service (No Twilio required)
 */
export class ConsoleSMSService {
  async sendSMS(to: string, message: string): Promise<boolean> {
    Logger.info('📱 SMS SENT (Console Mode)', {
      to,
      message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      timestamp: new Date().toISOString(),
    });

    console.log('\n' + '='.repeat(60));
    console.log('📱 SMS NOTIFICATION');
    console.log('='.repeat(60));
    console.log(`To: ${to}`);
    console.log(`Message: ${message}`);
    console.log(`Length: ${message.length} characters`);
    console.log('='.repeat(60) + '\n');

    return true;
  }

  async sendAlert(to: string, alertType: string, location?: { lat: number; lng: number }): Promise<boolean> {
    const message = `🚨 GuardianPulse Alert: ${alertType}. ${location ? `Location: ${location.lat}, ${location.lng}` : 'Location unavailable'}. This is a test alert.`;

    return this.sendSMS(to, message);
  }
}

/**
 * Test Payment Service (No real transactions)
 */
export class TestPaymentService {
  async createCheckoutSession(
    userId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{
    id: string;
    url: string;
    status: string;
  }> {
    const sessionId = `test_session_${Date.now()}_${userId}`;

    Logger.info('💳 PAYMENT SESSION CREATED (Test Mode)', {
      sessionId,
      userId,
      successUrl,
      cancelUrl,
      timestamp: new Date().toISOString(),
    });

    console.log('\n' + '='.repeat(60));
    console.log('💳 PAYMENT SESSION (TEST MODE)');
    console.log('='.repeat(60));
    console.log(`Session ID: ${sessionId}`);
    console.log(`User ID: ${userId}`);
    console.log(`Success URL: ${successUrl}`);
    console.log(`Cancel URL: ${cancelUrl}`);
    console.log('Status: Test session - no real payment will be processed');
    console.log('='.repeat(60) + '\n');

    return {
      id: sessionId,
      url: `${successUrl}?session_id=${sessionId}&test=true`,
      status: 'test_mode',
    };
  }

  async verifyWebhook(payload: string, signature: string): Promise<any> {
    Logger.info('🔐 WEBHOOK VERIFIED (Test Mode)', {
      payloadLength: payload.length,
      signature: signature.substring(0, 20) + '...',
      timestamp: new Date().toISOString(),
    });

    return {
      id: `test_event_${Date.now()}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `test_session_${Date.now()}`,
          status: 'complete',
          payment_status: 'paid',
        },
      },
    };
  }
}

/**
 * Service Factory for Test Mode
 */
export class TestModeServiceFactory {
  private static emailService = new ConsoleEmailService();
  private static smsService = new ConsoleSMSService();
  private static paymentService = new TestPaymentService();

  static getEmailService() {
    return this.emailService;
  }

  static getSMSService() {
    return this.smsService;
  }

  static getPaymentService() {
    return this.paymentService;
  }

  static isTestMode(): boolean {
    return process.env['ENABLE_TEST_MODE'] === 'true' || process.env['NODE_ENV'] === 'development';
  }

  static logTestModeStatus(): void {
    if (this.isTestMode()) {
      Logger.info('🧪 TEST MODE ENABLED - All external services will be mocked');
      console.log('\n' + '🧪'.repeat(30));
      console.log('TEST MODE ACTIVE');
      console.log('🧪'.repeat(30));
      console.log('✅ Email notifications → Console output');
      console.log('✅ SMS alerts → Console output');
      console.log('✅ Payment processing → Mock responses');
      console.log('✅ File storage → Local filesystem');
      console.log('✅ Database → Local PostgreSQL');
      console.log('🧪'.repeat(30) + '\n');
    }
  }
}

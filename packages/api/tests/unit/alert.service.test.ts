/**
 * Unit Tests for AlertService
 */

import { AlertService, AlertType, AlertPriority } from '../../src/services/alert.service';
import { DatabaseService } from '../../src/services/database.service';
import { createMockUser, createMockGuardian, createMockIncident } from '../mocks/data.mock';

// Mock dependencies
jest.mock('../../src/services/database.service');
jest.mock('../../src/utils');
jest.mock('twilio');

const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

describe('AlertService', () => {
  let alertService: AlertService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    alertService = new AlertService();
    
    // Mock database responses
    mockDatabaseService.prisma = {
      guardian: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      alert: {
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    } as any;
  });

  describe('triggerIncidentAlert', () => {
    it('should trigger alerts for all active guardians', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockIncident = createMockIncident();
      const mockGuardians = [
        createMockGuardian({ id: 'guardian-1', priority: 1 }),
        createMockGuardian({ id: 'guardian-2', priority: 2 }),
      ];

      mockDatabaseService.prisma.guardian.findMany.mockResolvedValue(mockGuardians);
      mockDatabaseService.prisma.alert.create.mockResolvedValue({
        id: 'alert-123',
        status: 'sent',
      });

      // Act
      const result = await alertService.triggerIncidentAlert(
        mockUser.id,
        AlertType.FALL_DETECTED,
        mockIncident,
        { latitude: 40.7128, longitude: -74.0060 }
      );

      // Assert
      expect(mockDatabaseService.prisma.guardian.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
          isActive: true,
        },
        include: {
          guardianUser: true,
        },
        orderBy: {
          priority: 'asc',
        },
      });

      expect(result).toHaveProperty('alertsSent');
      expect(result).toHaveProperty('totalGuardians');
      expect(result.alertsSent).toBeGreaterThan(0);
    });

    it('should handle no guardians found', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockIncident = createMockIncident();

      mockDatabaseService.prisma.guardian.findMany.mockResolvedValue([]);

      // Act
      const result = await alertService.triggerIncidentAlert(
        mockUser.id,
        AlertType.SOS_TRIGGERED,
        mockIncident,
        { latitude: 40.7128, longitude: -74.0060 }
      );

      // Assert
      expect(result.alertsSent).toBe(0);
      expect(result.totalGuardians).toBe(0);
    });

    it('should handle SMS sending errors gracefully', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockIncident = createMockIncident();
      const mockGuardians = [createMockGuardian()];

      mockDatabaseService.prisma.guardian.findMany.mockResolvedValue(mockGuardians);
      
      // Mock SMS sending to throw error
      const mockSendSMS = jest.fn().mockRejectedValue(new Error('SMS failed'));
      jest.spyOn(alertService as any, 'sendSMSAlert').mockImplementation(mockSendSMS);

      // Act
      const result = await alertService.triggerIncidentAlert(
        mockUser.id,
        AlertType.PANIC_BUTTON,
        mockIncident,
        { latitude: 40.7128, longitude: -74.0060 }
      );

      // Assert
      expect(result).toHaveProperty('errors');
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('sendSMSAlert', () => {
    it('should format emergency SMS correctly for fall detection', async () => {
      // Arrange
      const mockGuardian = createMockGuardian();
      const mockIncident = createMockIncident({ type: 'fall_detection' });
      const location = { latitude: 40.7128, longitude: -74.0060 };

      // Mock Twilio client
      const mockTwilioClient = {
        messages: {
          create: jest.fn().mockResolvedValue({
            sid: 'test_message_sid',
            status: 'sent',
          }),
        },
      };

      (alertService as any).twilioClient = mockTwilioClient;

      // Act
      await (alertService as any).sendSMSAlert(
        mockGuardian,
        AlertType.FALL_DETECTED,
        mockIncident,
        location
      );

      // Assert
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: expect.stringContaining('🚨 EMERGENCY: Fall detected'),
        to: mockGuardian.guardianUser.phone,
        from: expect.any(String),
      });
    });

    it('should format emergency SMS correctly for SOS trigger', async () => {
      // Arrange
      const mockGuardian = createMockGuardian();
      const mockIncident = createMockIncident({ type: 'sos_triggered' });
      const location = { latitude: 40.7128, longitude: -74.0060 };

      const mockTwilioClient = {
        messages: {
          create: jest.fn().mockResolvedValue({
            sid: 'test_message_sid',
            status: 'sent',
          }),
        },
      };

      (alertService as any).twilioClient = mockTwilioClient;

      // Act
      await (alertService as any).sendSMSAlert(
        mockGuardian,
        AlertType.SOS_TRIGGERED,
        mockIncident,
        location
      );

      // Assert
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: expect.stringContaining('🆘 EMERGENCY: SOS triggered'),
        to: mockGuardian.guardianUser.phone,
        from: expect.any(String),
      });
    });
  });

  describe('getAlertPriority', () => {
    it('should return CRITICAL priority for emergency alerts', () => {
      expect(alertService.getAlertPriority(AlertType.SOS_TRIGGERED)).toBe(AlertPriority.CRITICAL);
      expect(alertService.getAlertPriority(AlertType.FALL_DETECTED)).toBe(AlertPriority.CRITICAL);
      expect(alertService.getAlertPriority(AlertType.PANIC_BUTTON)).toBe(AlertPriority.CRITICAL);
    });

    it('should return HIGH priority for security alerts', () => {
      expect(alertService.getAlertPriority(AlertType.THROWN_AWAY)).toBe(AlertPriority.HIGH);
      expect(alertService.getAlertPriority(AlertType.FAKE_SHUTDOWN)).toBe(AlertPriority.HIGH);
    });

    it('should return MEDIUM priority for device alerts', () => {
      expect(alertService.getAlertPriority(AlertType.BATTERY_LOW)).toBe(AlertPriority.MEDIUM);
      expect(alertService.getAlertPriority(AlertType.DEVICE_OFFLINE)).toBe(AlertPriority.MEDIUM);
    });

    it('should return LOW priority for system alerts', () => {
      expect(alertService.getAlertPriority(AlertType.SYSTEM_ALERT)).toBe(AlertPriority.LOW);
    });
  });

  describe('formatAlertMessage', () => {
    it('should format fall detection alert message', () => {
      const message = (alertService as any).formatAlertMessage(
        AlertType.FALL_DETECTED,
        'John Doe',
        { latitude: 40.7128, longitude: -74.0060 }
      );

      expect(message).toContain('🚨 EMERGENCY: Fall detected');
      expect(message).toContain('John Doe');
      expect(message).toContain('Location:');
    });

    it('should format SOS alert message', () => {
      const message = (alertService as any).formatAlertMessage(
        AlertType.SOS_TRIGGERED,
        'Jane Smith',
        { latitude: 40.7128, longitude: -74.0060 }
      );

      expect(message).toContain('🆘 EMERGENCY: SOS triggered');
      expect(message).toContain('Jane Smith');
    });

    it('should include Google Maps link in location', () => {
      const message = (alertService as any).formatAlertMessage(
        AlertType.PANIC_BUTTON,
        'Test User',
        { latitude: 40.7128, longitude: -74.0060 }
      );

      expect(message).toContain('https://maps.google.com');
      expect(message).toContain('40.7128');
      expect(message).toContain('-74.0060');
    });
  });

  describe('validateGuardianContact', () => {
    it('should validate guardian with valid phone number', () => {
      const mockGuardian = createMockGuardian({
        guardianUser: { phone: '+1234567890' }
      });

      const isValid = (alertService as any).validateGuardianContact(mockGuardian);
      expect(isValid).toBe(true);
    });

    it('should reject guardian with invalid phone number', () => {
      const mockGuardian = createMockGuardian({
        guardianUser: { phone: 'invalid-phone' }
      });

      const isValid = (alertService as any).validateGuardianContact(mockGuardian);
      expect(isValid).toBe(false);
    });

    it('should reject guardian without phone number', () => {
      const mockGuardian = createMockGuardian({
        guardianUser: { phone: null }
      });

      const isValid = (alertService as any).validateGuardianContact(mockGuardian);
      expect(isValid).toBe(false);
    });
  });
});

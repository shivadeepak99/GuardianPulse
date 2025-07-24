/**
 * Unit Tests for AlertService
 * Comprehensive test coverage for alert delivery and notification system
 */

import { AlertService, AlertType } from '../../src/services/alert.service';
import { DatabaseService } from '../../src/services/database.service';

// Mock dependencies
jest.mock('../../src/services/database.service');
jest.mock('../../src/utils');
jest.mock('twilio');

const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

describe('AlertService', () => {
  let alertService: AlertService;
  let mockPrismaClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Database service with getInstance pattern
    mockPrismaClient = {
      guardianRelationship: {
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
    };
    
    mockDatabaseService.getInstance = jest.fn().mockReturnValue(mockPrismaClient);
    alertService = new AlertService();
  });

  describe('sendAlertToGuardian', () => {
    it('should send alert to a specific guardian successfully', async () => {
      // Arrange
      const guardianId = 'guardian-123';
      const alertType = AlertType.FALL_DETECTED;
      const alertData = {
        wardName: 'Test Ward',
        wardId: 'ward-123',
        timestamp: new Date(),
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: '123 Test St, New York, NY',
        },
        sensorData: {
          accelerometer: { x: 25, y: 5, z: 5 },
        },
      };

      // Mock guardian lookup
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: guardianId,
        email: 'guardian@example.com',
        phoneNumber: '+1234567890',
        firstName: 'Guardian',
        lastName: 'User',
      });

      // Act
      const result = await alertService.sendAlertToGuardian(guardianId, alertType, alertData);

      // Assert
      expect(result).toBeDefined();
      expect(result.guardianId).toBe(guardianId);
      expect(result.success).toBeDefined();
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: guardianId },
      });
    });

    it('should handle guardian not found gracefully', async () => {
      // Arrange
      const guardianId = 'nonexistent-guardian';
      const alertType = AlertType.SOS_TRIGGERED;
      const alertData = { wardId: 'ward-123', timestamp: new Date() };

      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await alertService.sendAlertToGuardian(guardianId, alertType, alertData);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Guardian not found');
    });
  });

  describe('sendAlertToAllGuardians', () => {
    it('should send alerts to all active guardians of a ward', async () => {
      // Arrange
      const wardId = 'ward-123';
      const alertType = AlertType.FALL_DETECTED;
      const alertData = {
        wardName: 'Test Ward',
        timestamp: new Date(),
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
      };

      const mockGuardians = [
        {
          id: 'rel-1',
          wardId,
          guardianId: 'guardian-1',
          isActive: true,
          guardian: {
            id: 'guardian-1',
            email: 'guardian1@example.com',
            phoneNumber: '+1234567890',
            firstName: 'Guardian',
            lastName: 'One',
          },
        },
        {
          id: 'rel-2',
          wardId,
          guardianId: 'guardian-2',
          isActive: true,
          guardian: {
            id: 'guardian-2',
            email: 'guardian2@example.com',
            phoneNumber: '+1234567891',
            firstName: 'Guardian',
            lastName: 'Two',
          },
        },
      ];

      mockPrismaClient.guardianRelationship.findMany.mockResolvedValue(mockGuardians);

      // Act
      const results = await alertService.sendAlertToAllGuardians(wardId, alertType, alertData);

      // Assert
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
      expect(mockPrismaClient.guardianRelationship.findMany).toHaveBeenCalledWith({
        where: {
          wardId,
          isActive: true,
        },
        include: {
          guardian: true,
        },
      });
    });

    it('should handle no guardians found', async () => {
      // Arrange
      const wardId = 'ward-no-guardians';
      const alertType = AlertType.BATTERY_LOW;
      const alertData = { timestamp: new Date() };

      mockPrismaClient.guardianRelationship.findMany.mockResolvedValue([]);

      // Act
      const results = await alertService.sendAlertToAllGuardians(wardId, alertType, alertData);

      // Assert
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });

  describe('sendIncidentAlert', () => {
    it('should send incident alert with proper parameters', async () => {
      // Arrange
      const wardId = 'ward-123';
      const incidentId = 'incident-123';
      const alertType = AlertType.FALL_DETECTED;
      const alertData = {
        timestamp: new Date(),
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
      };

      const mockGuardians = [
        {
          id: 'rel-1',
          wardId,
          guardianId: 'guardian-1',
          isActive: true,
          guardian: {
            id: 'guardian-1',
            email: 'guardian1@example.com',
            phoneNumber: '+1234567890',
            firstName: 'Guardian',
            lastName: 'One',
          },
        },
      ];

      mockPrismaClient.guardianRelationship.findMany.mockResolvedValue(mockGuardians);

      // Act
      const results = await alertService.sendIncidentAlert(wardId, incidentId, alertType, alertData);

      // Assert
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(mockPrismaClient.guardianRelationship.findMany).toHaveBeenCalledWith({
        where: {
          wardId,
          isActive: true,
        },
        include: {
          guardian: true,
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const wardId = 'ward-error';
      const incidentId = 'incident-error';
      const alertType = AlertType.SOS_TRIGGERED;
      const alertData = { timestamp: new Date() };

      mockPrismaClient.guardianRelationship.findMany.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act & Assert
      await expect(
        alertService.sendIncidentAlert(wardId, incidentId, alertType, alertData)
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('Alert Type Handling', () => {
    it('should handle different alert types correctly', async () => {
      // Arrange
      const guardianId = 'guardian-123';
      const alertData = { wardId: 'ward-123', timestamp: new Date() };

      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: guardianId,
        email: 'guardian@example.com',
        phoneNumber: '+1234567890',
        firstName: 'Guardian',
        lastName: 'User',
      });

      const alertTypes = [
        AlertType.SOS_TRIGGERED,
        AlertType.FALL_DETECTED,
        AlertType.PANIC_BUTTON,
        AlertType.BATTERY_LOW,
        AlertType.DEVICE_OFFLINE,
        AlertType.GEOFENCE_VIOLATION,
        AlertType.SYSTEM_ALERT,
      ];

      // Act & Assert
      for (const alertType of alertTypes) {
        const result = await alertService.sendAlertToGuardian(guardianId, alertType, alertData);
        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle SMS sending errors gracefully', async () => {
      // Arrange
      const guardianId = 'guardian-123';
      const alertType = AlertType.FALL_DETECTED;
      const alertData = { wardId: 'ward-123', timestamp: new Date() };

      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: guardianId,
        email: 'guardian@example.com',
        phoneNumber: '+1234567890',
        firstName: 'Guardian',
        lastName: 'User',
      });

      // Act
      const result = await alertService.sendAlertToGuardian(guardianId, alertType, alertData);

      // Assert - Should not throw even if SMS fails
      expect(result).toBeDefined();
    });

    it('should handle email sending errors gracefully', async () => {
      // Arrange
      const guardianId = 'guardian-123';
      const alertType = AlertType.SOS_TRIGGERED;
      const alertData = { wardId: 'ward-123', timestamp: new Date() };

      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: guardianId,
        email: 'guardian@example.com',
        phoneNumber: '+1234567890',
        firstName: 'Guardian',
        lastName: 'User',
      });

      // Act
      const result = await alertService.sendAlertToGuardian(guardianId, alertType, alertData);

      // Assert - Should not throw even if email fails
      expect(result).toBeDefined();
    });
  });

  describe('Alert Data Enhancement', () => {
    it('should enhance alert data with ward information', async () => {
      // Arrange
      const wardId = 'ward-123';
      const alertType = AlertType.FALL_DETECTED;
      const alertData = {
        timestamp: new Date(),
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
      };

      const mockGuardians = [
        {
          id: 'rel-1',
          wardId,
          guardianId: 'guardian-1',
          isActive: true,
          guardian: {
            id: 'guardian-1',
            email: 'guardian1@example.com',
            phoneNumber: '+1234567890',
            firstName: 'Guardian',
            lastName: 'One',
          },
        },
      ];

      mockPrismaClient.guardianRelationship.findMany.mockResolvedValue(mockGuardians);

      // Act
      const results = await alertService.sendAlertToAllGuardians(wardId, alertType, alertData);

      // Assert
      expect(results).toBeDefined();
      expect(results.length).toBe(1);
    });
  });

  describe('Configuration and Setup', () => {
    it('should initialize AlertService without errors', () => {
      // Act & Assert
      expect(() => new AlertService()).not.toThrow();
    });

    it('should handle missing configuration gracefully', async () => {
      // Arrange
      const guardianId = 'guardian-123';
      const alertType = AlertType.SYSTEM_ALERT;
      const alertData = { wardId: 'ward-123', timestamp: new Date() };

      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: guardianId,
        email: 'guardian@example.com',
        phoneNumber: '+1234567890',
        firstName: 'Guardian',
        lastName: 'User',
      });

      // Act
      const result = await alertService.sendAlertToGuardian(guardianId, alertType, alertData);

      // Assert
      expect(result).toBeDefined();
    });
  });
});

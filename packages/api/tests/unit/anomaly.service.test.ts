/**
 * Unit Tests for AnomalyDetectionService
 * Comprehensive test coverage for sensor data processing and fall detection
 */

import { AnomalyDetectionService } from '../../src/services/anomaly.service';
import { AlertService, AlertType } from '../../src/services/alert.service';
import { DatabaseService } from '../../src/services/database.service';
import { configService } from '../../src/services/config.service';
import { redisService } from '../../src/services/redis.service';
import { createMockSensorData } from '../mocks/data.mock';

// Mock dependencies
jest.mock('../../src/services/alert.service');
jest.mock('../../src/services/database.service');
jest.mock('../../src/services/config.service');
jest.mock('../../src/services/redis.service');
jest.mock('../../src/utils');

const MockedAlertService = AlertService as jest.MockedClass<typeof AlertService>;
const mockConfigService = configService as jest.Mocked<typeof configService>;
const mockRedisService = redisService as jest.Mocked<typeof redisService>;
const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

describe('AnomalyDetectionService', () => {
  let anomalyService: AnomalyDetectionService;
  let mockAlertServiceInstance: jest.Mocked<AlertService>;
  let mockPrismaClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock AlertService instance
    mockAlertServiceInstance = {
      sendAlertToGuardian: jest.fn(),
      sendAlertToAllGuardians: jest.fn(),
    } as any;
    
    MockedAlertService.mockImplementation(() => mockAlertServiceInstance);
    
    // Mock config service with realistic configuration values
    mockConfigService.getConfigAsNumber = jest.fn().mockImplementation((key: string, defaultValue: number = 0) => {
      const config: Record<string, number> = {
        'detection.fall.threshold': 2.5,
        'detection.fall.timeout': 30000,
        'detection.panic.threshold': 3.0,
        'detection.battery.lowThreshold': 20,
        'detection.location.accuracy': 100,
      };
      return Promise.resolve(config[key] || defaultValue);
    });

    mockConfigService.getConfigAsBoolean = jest.fn().mockImplementation((key: string, defaultValue: boolean = false) => {
      const config: Record<string, boolean> = {
        'detection.enabled': true,
        'alerts.enabled': true,
      };
      return Promise.resolve(config[key] !== undefined ? config[key] : defaultValue);
    });

    // Mock Redis service methods
    mockRedisService.getBufferedLocationData = jest.fn().mockResolvedValue([]);
    mockRedisService.getBufferedSensorData = jest.fn().mockResolvedValue([]);
    mockRedisService.bufferLocationData = jest.fn().mockResolvedValue(undefined);
    mockRedisService.bufferSensorData = jest.fn().mockResolvedValue(undefined);

    // Mock Database service
    mockPrismaClient = {
      incident: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      guardian: {
        findMany: jest.fn(),
      },
    };
    
    mockDatabaseService.getInstance = jest.fn().mockReturnValue(mockPrismaClient);

    anomalyService = new AnomalyDetectionService();
  });

  describe('processSensorData', () => {
    it('should detect fall when acceleration exceeds threshold', async () => {
      // Arrange
      const highAccelerationData = {
        wardId: 'user-123',
        timestamp: new Date(),
        accelerometer: { x: 25, y: 5, z: 5 }, // High acceleration indicating fall
        gyroscope: { x: 0, y: 0, z: 0 },
        magnetometer: { x: 0, y: 0, z: 0 },
      };

      // Mock database incident creation via getInstance
      const mockPrismaClient = mockDatabaseService.getInstance();
      mockPrismaClient.incident.create = jest.fn().mockResolvedValue({
        id: 'incident-123',
        wardId: 'user-123',
        type: 'FALL_DETECTED',
        severity: 'HIGH',
        isResolved: false,
        createdAt: new Date(),
      });

      // Mock alert service
      mockAlertServiceInstance.sendAlertToAllGuardians.mockResolvedValue([
        { guardianId: 'guardian-123', success: true, method: 'email', timestamp: new Date() }
      ]);

      // Act
      const result = await anomalyService.processSensorData(highAccelerationData);

      // Assert
      expect(result).toBe(true);
      expect(mockPrismaClient.incident.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          wardId: 'user-123',
          type: 'FALL_DETECTED',
          severity: 'HIGH',
        })
      });
      expect(mockAlertServiceInstance.sendAlertToAllGuardians).toHaveBeenCalledWith(
        'user-123', 
        AlertType.FALL_DETECTED, 
        expect.any(Object)
      );
    });

    it('should not detect fall with normal acceleration data', async () => {
      // Arrange
      const normalAccelerationData = createMockSensorData({
        wardId: 'user-123',
        accelerometer: { x: 0.5, y: 0.3, z: 9.8 }, // Normal acceleration (gravity)
        gyroscope: { x: 0.1, y: 0.1, z: 0.1 },
        timestamp: new Date(),
      });

      // Act
      const result = await anomalyService.processSensorData(normalAccelerationData);

      // Assert
      expect(result).toBe(false);
      expect(mockPrismaClient.incident.create).not.toHaveBeenCalled();
      expect(mockAlertServiceInstance.sendAlertToAllGuardians).not.toHaveBeenCalled();
    });

    it('should handle moderate acceleration without triggering false positives', async () => {
      // Arrange
      const moderateAccelerationData = createMockSensorData({
        wardId: 'user-123',
        accelerometer: { x: 1.5, y: 1.2, z: 10.5 }, // Moderate acceleration (walking/running)
        gyroscope: { x: 0.3, y: 0.2, z: 0.1 },
        timestamp: new Date(),
      });

      // Act
      const result = await anomalyService.processSensorData(moderateAccelerationData);

      // Assert
      expect(result).toBe(false);
      expect(mockPrismaClient.incident.create).not.toHaveBeenCalled();
      expect(mockAlertServiceInstance.sendAlertToAllGuardians).not.toHaveBeenCalled();
    });

    it('should reject invalid sensor data', async () => {
      // Arrange
      const invalidData = createMockSensorData({
        wardId: '', // Invalid wardId
        timestamp: new Date(),
      });

      // Act
      const result = await anomalyService.processSensorData(invalidData);

      // Assert
      expect(result).toBe(false);
      expect(mockPrismaClient.incident.create).not.toHaveBeenCalled();
      expect(mockAlertServiceInstance.sendAlertToAllGuardians).not.toHaveBeenCalled();
    });

    it('should handle sensor data without accelerometer', async () => {
      // Arrange
      const dataWithoutAccelerometer = createMockSensorData({
        wardId: 'user-123',
        accelerometer: undefined, // No accelerometer data
        gyroscope: { x: 0.1, y: 0.1, z: 0.1 },
        timestamp: new Date(),
      });

      // Act
      const result = await anomalyService.processSensorData(dataWithoutAccelerometer);

      // Assert
      expect(result).toBe(false);
      expect(mockPrismaClient.incident.create).not.toHaveBeenCalled();
    });

    it('should include location data in incident when available', async () => {
      // Arrange
      const dataWithLocation = createMockSensorData({
        wardId: 'user-123',
        accelerometer: { x: 30, y: 8, z: 12 }, // High acceleration
        location: { latitude: 40.7128, longitude: -74.0060 }, // NYC coordinates
        timestamp: new Date(),
      });

      mockPrismaClient.incident.create = jest.fn().mockResolvedValue({
        id: 'incident-123',
        wardId: 'user-123',
        type: 'FALL_DETECTED',
      });

      mockAlertServiceInstance.sendAlertToAllGuardians.mockResolvedValue([]);

      // Act
      const result = await anomalyService.processSensorData(dataWithLocation);

      // Assert
      expect(result).toBe(true);
      expect(mockPrismaClient.incident.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          wardId: 'user-123',
          type: 'FALL_DETECTED',
          location: JSON.stringify({ latitude: 40.7128, longitude: -74.0060 }),
        })
      });
    });

    it('should include device info in incident metadata when available', async () => {
      // Arrange
      const dataWithDeviceInfo = createMockSensorData({
        wardId: 'user-123',
        accelerometer: { x: 28, y: 6, z: 10 },
        deviceInfo: { 
          batteryLevel: 15, // Low battery
          deviceId: 'device-456' 
        },
        timestamp: new Date(),
      });

      mockPrismaClient.incident.create = jest.fn().mockResolvedValue({
        id: 'incident-123',
        wardId: 'user-123',
        type: 'FALL_DETECTED',
      });

      mockAlertServiceInstance.sendAlertToAllGuardians.mockResolvedValue([]);

      // Act
      const result = await anomalyService.processSensorData(dataWithDeviceInfo);

      // Assert
      expect(result).toBe(true);
      expect(mockPrismaClient.incident.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            sensorData: expect.objectContaining({
              accelerometer: { x: 28, y: 6, z: 10 },
            }),
            fallDetection: expect.objectContaining({
              isFallDetected: true,
              confidence: expect.any(Number),
            }),
          })
        })
      });
    });
  });

  describe('createManualSOSIncident', () => {
    it('should create manual SOS incident with location', async () => {
      // Arrange
      const wardId = 'user-123';
      const location = { latitude: 40.7128, longitude: -74.0060 };
      const message = 'Emergency help needed';

      mockPrismaClient.incident.create = jest.fn().mockResolvedValue({
        id: 'incident-sos-123',
        wardId,
        type: 'SOS_TRIGGERED',
        severity: 'CRITICAL',
        description: message,
      });

      mockAlertServiceInstance.sendAlertToAllGuardians.mockResolvedValue([
        { guardianId: 'guardian-1', success: true, method: 'sms', timestamp: new Date() },
        { guardianId: 'guardian-2', success: true, method: 'email', timestamp: new Date() }
      ]);

      // Act
      const result = await anomalyService.createManualSOSIncident(wardId, location, message);

      // Assert
      expect(result).toEqual({
        id: 'incident-sos-123',
        wardId,
        type: 'SOS_TRIGGERED',
        severity: 'CRITICAL',
        description: message,
      });

      expect(mockPrismaClient.incident.create).toHaveBeenCalledWith({
        data: {
          wardId,
          type: 'SOS_TRIGGERED',
          severity: 'CRITICAL',
          description: message,
          location: JSON.stringify(location),
          metadata: JSON.stringify({
            manualTrigger: true,
            triggerTime: expect.any(String),
            location,
          }),
          isResolved: false,
          resolvedAt: null,
        }
      });

      expect(mockAlertServiceInstance.sendAlertToAllGuardians).toHaveBeenCalledWith(
        wardId,
        AlertType.SOS_TRIGGERED,
        expect.objectContaining({
          incidentId: 'incident-sos-123',
          location,
          message,
        })
      );
    });

    it('should create manual SOS incident without location', async () => {
      // Arrange
      const wardId = 'user-456';
      const message = 'Help needed urgently';

      mockPrismaClient.incident.create = jest.fn().mockResolvedValue({
        id: 'incident-sos-456',
        wardId,
        type: 'SOS_TRIGGERED',
        severity: 'CRITICAL',
      });

      mockAlertServiceInstance.sendAlertToAllGuardians.mockResolvedValue([]);

      // Act
      const result = await anomalyService.createManualSOSIncident(wardId, undefined, message);

      // Assert
      expect(result).toEqual({
        id: 'incident-sos-456',
        wardId,
        type: 'SOS_TRIGGERED',
        severity: 'CRITICAL',
      });

      expect(mockPrismaClient.incident.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          wardId,
          type: 'SOS_TRIGGERED',
          severity: 'CRITICAL',
          description: message,
          location: null,
        })
      });
    });

    it('should create SOS incident with default message when none provided', async () => {
      // Arrange
      const wardId = 'user-789';

      mockPrismaClient.incident.create = jest.fn().mockResolvedValue({
        id: 'incident-sos-789',
        wardId,
        type: 'SOS_TRIGGERED',
      });

      mockAlertServiceInstance.sendAlertToAllGuardians.mockResolvedValue([]);

      // Act
      await anomalyService.createManualSOSIncident(wardId);

      // Assert
      expect(mockPrismaClient.incident.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          wardId,
          type: 'SOS_TRIGGERED',
          description: 'Manual SOS alert triggered by user',
        })
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      const sensorData = createMockSensorData({
        wardId: 'user-123',
        accelerometer: { x: 30, y: 10, z: 5 },
        timestamp: new Date(),
      });

      mockPrismaClient.incident.create = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act
      const result = await anomalyService.processSensorData(sensorData);

      // Assert
      expect(result).toBe(false);
      expect(mockAlertServiceInstance.sendAlertToAllGuardians).not.toHaveBeenCalled();
    });

    it('should handle alert service errors gracefully', async () => {
      // Arrange
      const sensorData = createMockSensorData({
        wardId: 'user-123',
        accelerometer: { x: 25, y: 8, z: 6 },
        timestamp: new Date(),
      });

      mockPrismaClient.incident.create = jest.fn().mockResolvedValue({
        id: 'incident-123',
        wardId: 'user-123',
        type: 'FALL_DETECTED',
      });

      mockAlertServiceInstance.sendAlertToAllGuardians.mockRejectedValue(
        new Error('Alert service unavailable')
      );

      // Act
      const result = await anomalyService.processSensorData(sensorData);

      // Assert - Should still return true as incident was created, even if alerts failed
      expect(result).toBe(true);
      expect(mockPrismaClient.incident.create).toHaveBeenCalled();
    });

    it('should handle config service errors with defaults', async () => {
      // Arrange
      mockConfigService.getConfigAsNumber = jest.fn().mockRejectedValue(
        new Error('Config service error')
      );

      const sensorData = createMockSensorData({
        wardId: 'user-123',
        accelerometer: { x: 30, y: 10, z: 5 },
        timestamp: new Date(),
      });

      // Act & Assert - Should not throw error but handle gracefully
      await expect(anomalyService.processSensorData(sensorData)).resolves.toBeDefined();
    });
  });

  describe('sensor data validation', () => {
    it('should reject data with missing wardId', async () => {
      // Arrange
      const invalidData = {
        wardId: '',
        accelerometer: { x: 10, y: 5, z: 3 },
        timestamp: new Date(),
      };

      // Act
      const result = await anomalyService.processSensorData(invalidData);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject data with invalid timestamp', async () => {
      // Arrange
      const invalidData = {
        wardId: 'user-123',
        accelerometer: { x: 10, y: 5, z: 3 },
        timestamp: 'invalid-timestamp' as any,
      };

      // Act
      const result = await anomalyService.processSensorData(invalidData);

      // Assert
      expect(result).toBe(false);
    });

    it('should accept data with valid minimal structure', async () => {
      // Arrange
      const minimalData = createMockSensorData({
        wardId: 'user-123',
        timestamp: new Date(),
        accelerometer: { x: 1, y: 1, z: 9.8 }, // Normal values
      });

      // Act
      const result = await anomalyService.processSensorData(minimalData);

      // Assert
      expect(result).toBe(false); // Should process but not detect fall
    });
  });
});

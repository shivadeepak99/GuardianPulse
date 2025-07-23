/**
 * Unit Tests for AnomalyService
 */

import { AnomalyService } from '../../src/services/anomaly.service';
import { AlertService, AlertType } from '../../src/services/alert.service';
import { DatabaseService } from '../../src/services/database.service';
import { configService } from '../../src/services/config.service';
import { redisService } from '../../src/services/redis.service';
import { createMockSensorData, createMockUser, createMockIncident } from '../mocks/data.mock';

// Mock dependencies
jest.mock('../../src/services/alert.service');
jest.mock('../../src/services/database.service');
jest.mock('../../src/services/config.service');
jest.mock('../../src/services/redis.service');
jest.mock('../../src/utils');

const mockAlertService = AlertService as jest.MockedClass<typeof AlertService>;
const mockConfigService = configService as jest.Mocked<typeof configService>;
const mockRedisService = redisService as jest.Mocked<typeof redisService>;

describe('AnomalyService', () => {
  let anomalyService: AnomalyService;
  let mockAlertServiceInstance: jest.Mocked<AlertService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock AlertService instance
    mockAlertServiceInstance = {
      triggerIncidentAlert: jest.fn(),
      getAlertPriority: jest.fn(),
    } as any;
    
    mockAlertService.mockImplementation(() => mockAlertServiceInstance);
    
    // Mock config service
    mockConfigService.get.mockImplementation((key: string) => {
      const config = {
        'detection.fall.threshold': 2.5,
        'detection.fall.timeout': 30000,
        'detection.panic.threshold': 3.0,
        'detection.battery.lowThreshold': 20,
        'detection.location.accuracy': 100,
      };
      return config[key as keyof typeof config];
    });

    // Mock Redis service
    mockRedisService.get.mockResolvedValue(null);
    mockRedisService.set.mockResolvedValue('OK');

    anomalyService = new AnomalyService();
  });

  describe('detectFallFromSensorData', () => {
    it('should detect fall when acceleration exceeds threshold', async () => {
      // Arrange
      const highAccelerationData = createMockSensorData({
        wardId: 'user-123',
        accelerometer: { x: 3.0, y: 3.5, z: 2.8 }, // High acceleration indicating fall
        timestamp: new Date(),
      });

      mockAlertServiceInstance.triggerIncidentAlert.mockResolvedValue({
        alertsSent: 2,
        totalGuardians: 2,
        errors: [],
      });

      // Act
      const result = await anomalyService.detectFallFromSensorData(highAccelerationData);

      // Assert
      expect(result.fallDetected).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(mockAlertServiceInstance.triggerIncidentAlert).toHaveBeenCalledWith(
        'user-123',
        AlertType.FALL_DETECTED,
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should not detect fall with normal acceleration', async () => {
      // Arrange
      const normalAccelerationData = createMockSensorData({
        wardId: 'user-123',
        accelerometer: { x: 0.1, y: 0.2, z: 1.0 }, // Normal acceleration
        timestamp: new Date(),
      });

      // Act
      const result = await anomalyService.detectFallFromSensorData(normalAccelerationData);

      // Assert
      expect(result.fallDetected).toBe(false);
      expect(result.confidence).toBeLessThan(0.3);
      expect(mockAlertServiceInstance.triggerIncidentAlert).not.toHaveBeenCalled();
    });

    it('should calculate confidence based on acceleration magnitude', async () => {
      // Arrange
      const moderateAccelerationData = createMockSensorData({
        wardId: 'user-123',
        accelerometer: { x: 2.0, y: 2.2, z: 1.8 }, // Moderate acceleration
        timestamp: new Date(),
      });

      // Act
      const result = await anomalyService.detectFallFromSensorData(moderateAccelerationData);

      // Assert
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.confidence).toBeLessThan(0.8);
    });

    it('should handle missing accelerometer data', async () => {
      // Arrange
      const dataWithoutAccelerometer = createMockSensorData({
        wardId: 'user-123',
        accelerometer: undefined,
        timestamp: new Date(),
      });

      // Act
      const result = await anomalyService.detectFallFromSensorData(dataWithoutAccelerometer);

      // Assert
      expect(result.fallDetected).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.reason).toContain('No accelerometer data');
    });
  });

  describe('detectPanicPattern', () => {
    it('should detect panic from rapid acceleration changes', async () => {
      // Arrange
      const panicData = createMockSensorData({
        wardId: 'user-123',
        accelerometer: { x: 4.0, y: -3.5, z: 3.8 }, // Rapid, erratic movement
        gyroscope: { x: 2.0, y: -1.8, z: 2.2 },
        timestamp: new Date(),
      });

      // Act
      const result = await anomalyService.detectPanicPattern(panicData);

      // Assert
      expect(result.panicDetected).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should not detect panic from normal movement', async () => {
      // Arrange
      const normalData = createMockSensorData({
        wardId: 'user-123',
        accelerometer: { x: 0.2, y: 0.3, z: 1.1 },
        gyroscope: { x: 0.1, y: 0.1, z: 0.05 },
        timestamp: new Date(),
      });

      // Act
      const result = await anomalyService.detectPanicPattern(normalData);

      // Assert
      expect(result.panicDetected).toBe(false);
      expect(result.confidence).toBeLessThan(0.3);
    });
  });

  describe('detectBatteryAnomaly', () => {
    it('should detect low battery threshold violation', async () => {
      // Arrange
      const lowBatteryData = createMockSensorData({
        wardId: 'user-123',
        deviceInfo: { batteryLevel: 15 }, // Below 20% threshold
        timestamp: new Date(),
      });

      // Act
      const result = await anomalyService.detectBatteryAnomaly(lowBatteryData);

      // Assert
      expect(result.anomalyDetected).toBe(true);
      expect(result.type).toBe('LOW_BATTERY');
      expect(result.severity).toBe('medium');
    });

    it('should detect critical battery level', async () => {
      // Arrange
      const criticalBatteryData = createMockSensorData({
        wardId: 'user-123',
        deviceInfo: { batteryLevel: 5 }, // Critical level
        timestamp: new Date(),
      });

      // Act
      const result = await anomalyService.detectBatteryAnomaly(criticalBatteryData);

      // Assert
      expect(result.anomalyDetected).toBe(true);
      expect(result.type).toBe('CRITICAL_BATTERY');
      expect(result.severity).toBe('high');
    });

    it('should not detect anomaly with normal battery level', async () => {
      // Arrange
      const normalBatteryData = createMockSensorData({
        wardId: 'user-123',
        deviceInfo: { batteryLevel: 65 },
        timestamp: new Date(),
      });

      // Act
      const result = await anomalyService.detectBatteryAnomaly(normalBatteryData);

      // Assert
      expect(result.anomalyDetected).toBe(false);
    });
  });

  describe('detectLocationAnomaly', () => {
    it('should detect location accuracy issues', async () => {
      // Arrange
      const inaccurateLocationData = createMockSensorData({
        wardId: 'user-123',
        location: { latitude: 40.7128, longitude: -74.0060 },
        deviceInfo: { locationAccuracy: 500 }, // Poor accuracy
        timestamp: new Date(),
      });

      // Act
      const result = await anomalyService.detectLocationAnomaly(inaccurateLocationData);

      // Assert
      expect(result.anomalyDetected).toBe(true);
      expect(result.type).toBe('POOR_LOCATION_ACCURACY');
    });

    it('should detect impossible location jumps', async () => {
      // Arrange
      // Mock previous location in Redis
      mockRedisService.get.mockResolvedValue(JSON.stringify({
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: Date.now() - 60000, // 1 minute ago
      }));

      const impossibleLocationData = createMockSensorData({
        wardId: 'user-123',
        location: { latitude: 34.0522, longitude: -118.2437 }, // LA from NYC in 1 minute
        timestamp: new Date(),
      });

      // Act
      const result = await anomalyService.detectLocationAnomaly(impossibleLocationData);

      // Assert
      expect(result.anomalyDetected).toBe(true);
      expect(result.type).toBe('IMPOSSIBLE_LOCATION_JUMP');
    });

    it('should accept normal location updates', async () => {
      // Arrange
      mockRedisService.get.mockResolvedValue(JSON.stringify({
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: Date.now() - 300000, // 5 minutes ago
      }));

      const normalLocationData = createMockSensorData({
        wardId: 'user-123',
        location: { latitude: 40.7130, longitude: -74.0062 }, // Slight movement
        timestamp: new Date(),
      });

      // Act
      const result = await anomalyService.detectLocationAnomaly(normalLocationData);

      // Assert
      expect(result.anomalyDetected).toBe(false);
    });
  });

  describe('processRealTimeData', () => {
    it('should process sensor data and detect multiple anomalies', async () => {
      // Arrange
      const multiAnomalyData = createMockSensorData({
        wardId: 'user-123',
        accelerometer: { x: 3.5, y: 3.0, z: 2.8 }, // Fall-like acceleration
        deviceInfo: { batteryLevel: 10 }, // Low battery
        location: { latitude: 40.7128, longitude: -74.0060 },
        timestamp: new Date(),
      });

      mockAlertServiceInstance.triggerIncidentAlert.mockResolvedValue({
        alertsSent: 1,
        totalGuardians: 1,
        errors: [],
      });

      // Act
      const result = await anomalyService.processRealTimeData(multiAnomalyData);

      // Assert
      expect(result.anomaliesDetected).toHaveLength(2); // Fall + Battery
      expect(result.anomaliesDetected).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'FALL_DETECTED' }),
          expect.objectContaining({ type: 'CRITICAL_BATTERY' }),
        ])
      );
    });

    it('should return no anomalies for normal data', async () => {
      // Arrange
      const normalData = createMockSensorData({
        wardId: 'user-123',
        accelerometer: { x: 0.1, y: 0.2, z: 1.0 },
        deviceInfo: { batteryLevel: 80 },
        location: { latitude: 40.7128, longitude: -74.0060 },
        timestamp: new Date(),
      });

      // Act
      const result = await anomalyService.processRealTimeData(normalData);

      // Assert
      expect(result.anomaliesDetected).toHaveLength(0);
      expect(result.processingTime).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });

  describe('calculateAccelerationMagnitude', () => {
    it('should calculate correct magnitude for acceleration vector', () => {
      // Arrange
      const acceleration = { x: 3, y: 4, z: 0 }; // Should give magnitude of 5

      // Act
      const magnitude = (anomalyService as any).calculateAccelerationMagnitude(acceleration);

      // Assert
      expect(magnitude).toBeCloseTo(5, 2);
    });

    it('should handle zero acceleration', () => {
      // Arrange
      const acceleration = { x: 0, y: 0, z: 0 };

      // Act
      const magnitude = (anomalyService as any).calculateAccelerationMagnitude(acceleration);

      // Assert
      expect(magnitude).toBe(0);
    });
  });

  describe('calculateMovementIntensity', () => {
    it('should calculate high intensity for erratic movement', () => {
      // Arrange
      const accelerometer = { x: 4.0, y: -3.5, z: 3.0 };
      const gyroscope = { x: 2.0, y: -1.5, z: 2.5 };

      // Act
      const intensity = (anomalyService as any).calculateMovementIntensity(accelerometer, gyroscope);

      // Assert
      expect(intensity).toBeGreaterThan(5);
    });

    it('should calculate low intensity for calm movement', () => {
      // Arrange
      const accelerometer = { x: 0.1, y: 0.2, z: 1.0 };
      const gyroscope = { x: 0.05, y: 0.03, z: 0.02 };

      // Act
      const intensity = (anomalyService as any).calculateMovementIntensity(accelerometer, gyroscope);

      // Assert
      expect(intensity).toBeLessThan(2);
    });
  });
});

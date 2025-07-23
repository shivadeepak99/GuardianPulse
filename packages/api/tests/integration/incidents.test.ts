/**
 * Integration Tests for Incident Endpoints
 */

import request from 'supertest';
import { TestApp } from '../helpers/testApp';
import { DatabaseService } from '../../src/services/database.service';
import { createMockUser, createMockIncident, createMockSensorData } from '../mocks/data.mock';
import bcrypt from 'bcryptjs';

describe('Incident Integration Tests', () => {
  let testApp: TestApp;
  let app: any;
  let authToken: string;
  let testUser: any;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.initialize();
    app = testApp.getApp();
  });

  afterAll(async () => {
    await testApp.disconnect();
  });

  beforeEach(async () => {
    await testApp.cleanupDatabase();

    // Create authenticated user for tests
    const userData = {
      email: 'incident@example.com',
      firstName: 'Incident',
      lastName: 'Tester',
      phone: '+1234567890',
      password: 'SecurePassword123!',
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    authToken = registerResponse.body.data.token;
    testUser = registerResponse.body.data.user;
  });

  describe('POST /api/incidents/manual-sos', () => {
    it('should create manual SOS incident successfully', async () => {
      // Arrange
      const sosData = {
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
        },
        note: 'Manual emergency trigger',
      };

      // Act
      const response = await request(app)
        .post('/api/incidents/manual-sos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sosData)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('incident');
      expect(response.body.data).toHaveProperty('alert');
      expect(response.body.data.incident.type).toBe('manual_sos');
      expect(response.body.data.incident.severity).toBe('critical');
      expect(response.body.data.incident.status).toBe('active');
    });

    it('should require authentication for manual SOS', async () => {
      // Arrange
      const sosData = {
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
      };

      // Act
      const response = await request(app)
        .post('/api/incidents/manual-sos')
        .send(sosData)
        .expect(401);

      // Assert
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Access token required');
    });

    it('should validate location data for manual SOS', async () => {
      // Arrange
      const invalidSosData = {
        location: {
          latitude: 'invalid',
          longitude: -74.0060,
        },
      };

      // Act
      const response = await request(app)
        .post('/api/incidents/manual-sos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidSosData)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('validation');
    });
  });

  describe('POST /api/incidents/sensor-data', () => {
    it('should process normal sensor data successfully', async () => {
      // Arrange
      const normalSensorData = createMockSensorData({
        accelerometer: { x: 0.1, y: 0.2, z: 1.0 }, // Normal movement
        gyroscope: { x: 0.05, y: 0.03, z: 0.02 },
        location: { latitude: 40.7128, longitude: -74.0060 },
        deviceInfo: { batteryLevel: 80 },
      });

      // Act
      const response = await request(app)
        .post('/api/incidents/sensor-data')
        .set('Authorization', `Bearer ${authToken}`)
        .send(normalSensorData)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('processed', true);
      expect(response.body.data).toHaveProperty('anomaliesDetected');
      expect(response.body.data.anomaliesDetected).toHaveLength(0);
    });

    it('should detect fall from sensor data and create incident', async () => {
      // Arrange
      const fallSensorData = createMockSensorData({
        accelerometer: { x: 3.5, y: 3.0, z: 2.8 }, // Fall-like acceleration
        gyroscope: { x: 1.5, y: -1.2, z: 2.0 },
        location: { latitude: 40.7128, longitude: -74.0060 },
        deviceInfo: { batteryLevel: 70 },
      });

      // Act
      const response = await request(app)
        .post('/api/incidents/sensor-data')
        .set('Authorization', `Bearer ${authToken}`)
        .send(fallSensorData)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('anomaliesDetected');
      expect(response.body.data.anomaliesDetected.length).toBeGreaterThan(0);
      
      const fallAnomaly = response.body.data.anomaliesDetected.find(
        (anomaly: any) => anomaly.type === 'FALL_DETECTED'
      );
      expect(fallAnomaly).toBeTruthy();
      expect(fallAnomaly.confidence).toBeGreaterThan(0.7);
    });

    it('should require authentication for sensor data', async () => {
      // Arrange
      const sensorData = createMockSensorData();

      // Act
      const response = await request(app)
        .post('/api/incidents/sensor-data')
        .send(sensorData)
        .expect(401);

      // Assert
      expect(response.body).toHaveProperty('success', false);
    });

    it('should validate sensor data format', async () => {
      // Arrange
      const invalidSensorData = {
        invalidField: 'invalid',
      };

      // Act
      const response = await request(app)
        .post('/api/incidents/sensor-data')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidSensorData)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/incidents', () => {
    beforeEach(async () => {
      // Create some test incidents
      const incidents = [
        createMockIncident({
          userId: testUser.id,
          type: 'fall_detection',
          status: 'active',
          createdAt: new Date(Date.now() - 86400000), // 1 day ago
        }),
        createMockIncident({
          userId: testUser.id,
          type: 'manual_sos',
          status: 'resolved',
          createdAt: new Date(Date.now() - 3600000), // 1 hour ago
        }),
      ];

      for (const incident of incidents) {
        await DatabaseService.prisma.incident.create({
          data: incident,
        });
      }
    });

    it('should retrieve user incidents successfully', async () => {
      // Act
      const response = await request(app)
        .get('/api/incidents')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('incidents');
      expect(response.body.data.incidents).toHaveLength(2);
      expect(response.body.data.incidents[0].userId).toBe(testUser.id);
    });

    it('should filter incidents by status', async () => {
      // Act
      const response = await request(app)
        .get('/api/incidents?status=active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.incidents).toHaveLength(1);
      expect(response.body.data.incidents[0].status).toBe('active');
    });

    it('should filter incidents by type', async () => {
      // Act
      const response = await request(app)
        .get('/api/incidents?type=manual_sos')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.incidents).toHaveLength(1);
      expect(response.body.data.incidents[0].type).toBe('manual_sos');
    });

    it('should require authentication for incident retrieval', async () => {
      // Act
      const response = await request(app)
        .get('/api/incidents')
        .expect(401);

      // Assert
      expect(response.body).toHaveProperty('success', false);
    });

    it('should paginate incidents', async () => {
      // Act
      const response = await request(app)
        .get('/api/incidents?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.incidents).toHaveLength(1);
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination.total).toBe(2);
    });
  });

  describe('GET /api/incidents/:id', () => {
    let testIncident: any;

    beforeEach(async () => {
      testIncident = await DatabaseService.prisma.incident.create({
        data: createMockIncident({
          userId: testUser.id,
          type: 'fall_detection',
        }),
      });
    });

    it('should retrieve specific incident successfully', async () => {
      // Act
      const response = await request(app)
        .get(`/api/incidents/${testIncident.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.incident.id).toBe(testIncident.id);
      expect(response.body.data.incident.userId).toBe(testUser.id);
    });

    it('should return 404 for non-existent incident', async () => {
      // Act
      const response = await request(app)
        .get('/api/incidents/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('not found');
    });

    it('should prevent access to other users incidents', async () => {
      // Arrange - Create another user and their incident
      const otherUserData = {
        email: 'other@example.com',
        firstName: 'Other',
        lastName: 'User',
        phone: '+0987654321',
        password: 'SecurePassword123!',
      };

      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send(otherUserData);

      const otherIncident = await DatabaseService.prisma.incident.create({
        data: createMockIncident({
          userId: otherUserResponse.body.data.user.id,
        }),
      });

      // Act - Try to access other user's incident
      const response = await request(app)
        .get(`/api/incidents/${otherIncident.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      // Assert
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('access');
    });
  });

  describe('PATCH /api/incidents/:id/resolve', () => {
    let testIncident: any;

    beforeEach(async () => {
      testIncident = await DatabaseService.prisma.incident.create({
        data: createMockIncident({
          userId: testUser.id,
          status: 'active',
        }),
      });
    });

    it('should resolve incident successfully', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/incidents/${testIncident.id}/resolve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ note: 'False alarm' })
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.incident.status).toBe('resolved');
      expect(response.body.data.incident.resolvedAt).toBeTruthy();
    });

    it('should require authentication for incident resolution', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/incidents/${testIncident.id}/resolve`)
        .send({ note: 'False alarm' })
        .expect(401);

      // Assert
      expect(response.body).toHaveProperty('success', false);
    });

    it('should prevent resolving other users incidents', async () => {
      // Arrange - Create another user and their incident
      const otherUserData = {
        email: 'resolver@example.com',
        firstName: 'Resolver',
        lastName: 'User',
        phone: '+1111111111',
        password: 'SecurePassword123!',
      };

      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send(otherUserData);

      const otherIncident = await DatabaseService.prisma.incident.create({
        data: createMockIncident({
          userId: otherUserResponse.body.data.user.id,
        }),
      });

      // Act
      const response = await request(app)
        .patch(`/api/incidents/${otherIncident.id}/resolve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ note: 'Unauthorized resolution' })
        .expect(403);

      // Assert
      expect(response.body).toHaveProperty('success', false);
    });
  });
});

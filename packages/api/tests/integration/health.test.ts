/**
 * Integration Tests for Health Check Endpoint
 */

import request from 'supertest';
import { TestApp } from '../helpers/testApp';

describe('Health Check Integration Tests', () => {
  let testApp: TestApp;
  let app: any;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.initialize();
    app = testApp.getApp();
  });

  afterAll(async () => {
    await testApp.disconnect();
  });

  describe('GET /health', () => {
    it('should return health status successfully', async () => {
      // Act
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.status).toBe('OK');
    });
  });

  describe('GET /', () => {
    it('should return API information', async () => {
      // Act
      const response = await request(app)
        .get('/')
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('environment');
      expect(response.body.environment).toBe('test');
    });
  });
});

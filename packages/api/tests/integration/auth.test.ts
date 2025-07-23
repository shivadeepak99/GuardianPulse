/**
 * Integration Tests for Authentication Endpoints
 */

import request from 'supertest';
import { TestApp } from '../helpers/testApp';
import { DatabaseService } from '../../src/services/database.service';
import { createMockUser } from '../mocks/data.mock';
import bcrypt from 'bcryptjs';

describe('Authentication Integration Tests', () => {
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

  beforeEach(async () => {
    await testApp.cleanupDatabase();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const newUser = {
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        phone: '+1234567890',
        password: 'SecurePassword123!',
      };

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(newUser.email);
      expect(response.body.data.user).not.toHaveProperty('password');

      // Verify user was created in database
      const dbUser = await DatabaseService.prisma.user.findUnique({
        where: { email: newUser.email },
      });
      expect(dbUser).toBeTruthy();
      expect(dbUser?.firstName).toBe(newUser.firstName);
    });

    it('should reject registration with invalid email', async () => {
      // Arrange
      const invalidUser = {
        email: 'invalid-email',
        firstName: 'Test',
        lastName: 'User',
        phone: '+1234567890',
        password: 'SecurePassword123!',
      };

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidUser)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('email');
    });

    it('should reject registration with weak password', async () => {
      // Arrange
      const userWithWeakPassword = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+1234567890',
        password: '123', // Too weak
      };

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(userWithWeakPassword)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('password');
    });

    it('should reject registration with duplicate email', async () => {
      // Arrange
      const existingUser = createMockUser({
        email: 'existing@example.com',
        password: await bcrypt.hash('password123', 10),
      });

      await DatabaseService.prisma.user.create({
        data: existingUser,
      });

      const duplicateUser = {
        email: 'existing@example.com',
        firstName: 'Duplicate',
        lastName: 'User',
        phone: '+0987654321',
        password: 'AnotherPassword123!',
      };

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateUser)
        .expect(409);

      // Assert
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('already exists');
    });

    it('should reject registration with missing required fields', async () => {
      // Arrange
      const incompleteUser = {
        email: 'incomplete@example.com',
        // Missing firstName, lastName, phone, password
      };

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteUser)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser: any;
    const testPassword = 'TestPassword123!';

    beforeEach(async () => {
      // Create a test user for login tests
      testUser = await DatabaseService.prisma.user.create({
        data: {
          ...createMockUser({
            email: 'login@example.com',
            password: await bcrypt.hash(testPassword, 10),
          }),
        },
      });
    });

    it('should login with valid credentials', async () => {
      // Arrange
      const loginData = {
        email: 'login@example.com',
        password: testPassword,
      };

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should reject login with invalid email', async () => {
      // Arrange
      const invalidLogin = {
        email: 'nonexistent@example.com',
        password: testPassword,
      };

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidLogin)
        .expect(401);

      // Assert
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      // Arrange
      const invalidLogin = {
        email: 'login@example.com',
        password: 'WrongPassword123!',
      };

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidLogin)
        .expect(401);

      // Assert
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should reject login with missing credentials', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('success', false);
    });

    it('should reject login for inactive user', async () => {
      // Arrange
      await DatabaseService.prisma.user.update({
        where: { id: testUser.id },
        data: { isActive: false },
      });

      const loginData = {
        email: 'login@example.com',
        password: testPassword,
      };

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      // Assert
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Account is deactivated');
    });
  });

  describe('JWT Token Validation', () => {
    let authToken: string;
    let testUser: any;

    beforeEach(async () => {
      // Register a user and get auth token
      const registrationData = {
        email: 'tokentest@example.com',
        firstName: 'Token',
        lastName: 'Test',
        phone: '+1234567890',
        password: 'SecurePassword123!',
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      authToken = registerResponse.body.data.token;
      testUser = registerResponse.body.data.user;
    });

    it('should access protected route with valid token', async () => {
      // Act
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.user.id).toBe(testUser.id);
    });

    it('should reject protected route without token', async () => {
      // Act
      const response = await request(app)
        .get('/api/user/profile')
        .expect(401);

      // Assert
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Access token required');
    });

    it('should reject protected route with invalid token', async () => {
      // Act
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer invalid_token_here')
        .expect(401);

      // Assert
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Invalid token');
    });

    it('should reject protected route with malformed authorization header', async () => {
      // Act
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      // Assert
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to login endpoint', async () => {
      const loginData = {
        email: 'ratetest@example.com',
        password: 'password123',
      };

      // Make multiple rapid requests
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(requests);

      // Should have some rate limited responses
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});

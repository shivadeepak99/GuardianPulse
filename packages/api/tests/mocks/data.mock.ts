/**
 * Test data factory for creating mock data
 */

export const createMockUser = (overrides: Partial<any> = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  phone: '+1234567890',
  isVerified: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockGuardian = (overrides: Partial<any> = {}) => ({
  id: 'guardian-123',
  userId: 'user-123',
  guardianUserId: 'guardian-user-123',
  relationship: 'family',
  priority: 1,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockIncident = (overrides: Partial<any> = {}) => ({
  id: 'incident-123',
  userId: 'user-123',
  type: 'fall_detection',
  severity: 'high',
  status: 'active',
  location: {
    latitude: 40.7128,
    longitude: -74.0060,
    address: '123 Test St, New York, NY',
  },
  sensorData: {
    accelerometer: { x: 1.5, y: 2.0, z: 0.5 },
    gyroscope: { x: 0.1, y: 0.2, z: 0.3 },
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockAlert = (overrides: Partial<any> = {}) => ({
  id: 'alert-123',
  incidentId: 'incident-123',
  guardianId: 'guardian-123',
  type: 'sms',
  status: 'sent',
  sentAt: new Date(),
  createdAt: new Date(),
  ...overrides,
});

export const createMockJWTPayload = (overrides: Partial<any> = {}) => ({
  userId: 'user-123',
  email: 'test@example.com',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  ...overrides,
});

export const createMockSensorData = (overrides: Partial<any> = {}) => ({
  accelerometer: {
    x: Math.random() * 2 - 1,
    y: Math.random() * 2 - 1,
    z: Math.random() * 2 - 1,
  },
  gyroscope: {
    x: Math.random() * 0.5,
    y: Math.random() * 0.5,
    z: Math.random() * 0.5,
  },
  magnetometer: {
    x: Math.random() * 100,
    y: Math.random() * 100,
    z: Math.random() * 100,
  },
  ...overrides,
});

export const createMockLocation = (overrides: Partial<any> = {}) => ({
  latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
  longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
  accuracy: 10,
  timestamp: Date.now(),
  ...overrides,
});

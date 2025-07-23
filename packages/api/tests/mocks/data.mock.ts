/**
 * Test data factory for creating mock data
 */

import type { IncidentType } from '../../src/generated/prisma';

export const createMockUser = (overrides: Partial<any> = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  password: '$2b$10$hashedPasswordExample', // Required by Prisma schema
  firstName: 'Test',
  lastName: 'User',
  phoneNumber: '+1234567890', // Changed from phone to phoneNumber to match schema
  emailVerified: true, // Changed from isVerified to emailVerified
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockGuardian = (overrides: Partial<any> = {}) => ({
  id: 'guardian-123',
  wardId: 'user-123', // Changed from userId to wardId to match schema
  guardianId: 'guardian-user-123', // Changed from guardianUserId to guardianId
  isActive: true,
  permissions: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockIncident = (overrides: Partial<any> = {}) => ({
  id: 'incident-123',
  wardId: 'user-123', // Changed from userId to wardId to match Prisma schema
  type: 'FALL_DETECTED' as IncidentType, // Use enum values from Prisma - exact match
  severity: 'high',
  isActive: true,
  latitude: 40.7128,
  longitude: -74.0060,
  triggeredAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  description: 'Fall detected by accelerometer',
  preIncidentData: {
    accelerometer: { x: 1.5, y: 2.0, z: 0.5 },
    gyroscope: { x: 0.1, y: 0.2, z: 0.3 },
  },
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
  wardId: 'ward-123',
  timestamp: new Date(),
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

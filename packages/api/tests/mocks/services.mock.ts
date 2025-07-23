/**
 * Mock implementations for external services
 */

export const mockRedisService = {
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  expire: jest.fn().mockResolvedValue(1),
  flushall: jest.fn().mockResolvedValue('OK'),
  disconnect: jest.fn().mockResolvedValue(undefined),
};

export const mockS3Service = {
  generateUploadUrl: jest.fn().mockResolvedValue('https://test-bucket.s3.amazonaws.com/upload-url'),
  generateDownloadUrl: jest.fn().mockResolvedValue('https://test-bucket.s3.amazonaws.com/download-url'),
};

export const mockTwilioService = {
  sendSMS: jest.fn().mockResolvedValue({
    sid: 'test_message_sid',
    status: 'sent',
    to: '+1234567890',
    from: '+0987654321',
  }),
};

export const mockPrismaClient = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  guardian: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  incident: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  alert: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  $disconnect: jest.fn(),
  $connect: jest.fn(),
};

export const mockJWT = {
  sign: jest.fn().mockReturnValue('mock_jwt_token'),
  verify: jest.fn().mockReturnValue({ userId: 'test-user-id', email: 'test@example.com' }),
  decode: jest.fn().mockReturnValue({ userId: 'test-user-id', email: 'test@example.com' }),
};

export const mockBcrypt = {
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
};

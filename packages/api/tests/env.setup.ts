/**
 * Test Environment Setup
 * Sets environment variables for testing
 */

process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'silent'; // Minimize logs during testing
process.env['PORT'] = '3001'; // Different port for testing

// For unit tests, use a simple file-based database that doesn't require external dependencies
// Integration tests can override this with a real database
process.env['DATABASE_URL_TEST'] = process.env['DATABASE_URL_TEST'] || 'file:./test.db';

// Use test database URL for Prisma
process.env['DATABASE_URL'] = process.env['DATABASE_URL_TEST'];

// Test JWT secrets
process.env['JWT_SECRET'] = 'test_jwt_secret_key_for_testing_only';
process.env['JWT_REFRESH_SECRET'] = 'test_refresh_secret_key_for_testing_only';

// Test Redis URL (use memory store for testing)
process.env['REDIS_URL'] = 'redis://localhost:6379/1'; // Different Redis DB for testing

// Test AWS/S3 credentials (mock)
process.env['AWS_ACCESS_KEY_ID'] = 'test_access_key';
process.env['AWS_SECRET_ACCESS_KEY'] = 'test_secret_key';
process.env['AWS_REGION'] = 'us-east-1';
process.env['S3_BUCKET_NAME'] = 'test-guardian-pulse-evidence';

// Test Twilio credentials (mock)
process.env['TWILIO_ACCOUNT_SID'] = 'test_account_sid';
process.env['TWILIO_AUTH_TOKEN'] = 'test_auth_token';
process.env['TWILIO_PHONE_NUMBER'] = '+1234567890';

// Disable external services in testing
process.env['DISABLE_EXTERNAL_SERVICES'] = 'true';

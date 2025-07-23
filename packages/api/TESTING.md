# Testing Infrastructure

This document outlines the comprehensive Jest-based testing infrastructure for the GuardianPulse API backend.

## 🧪 Testing Framework

### Core Technologies

- **Jest**: JavaScript testing framework with built-in assertion library
- **ts-jest**: TypeScript support for Jest
- **Supertest**: HTTP integration testing
- **@types/jest**: TypeScript definitions for Jest

### Dependencies Installed

```json
{
  "jest": "^30.0.5",
  "ts-jest": "^29.4.0",
  "supertest": "^7.1.4",
  "@types/jest": "^29.5.14",
  "@types/supertest": "^6.0.2"
}
```

## 📁 Test Structure

```
tests/
├── env.setup.ts          # Environment configuration for tests
├── setup.ts               # Global test setup and teardown
├── unit/                  # Unit tests (isolated, no external dependencies)
│   ├── logger.simple.test.ts
│   ├── alert.service.test.ts
│   └── anomaly.service.test.ts
├── integration/           # Integration tests (API endpoints, real interactions)
│   ├── health.simple.test.ts
│   ├── auth.test.ts
│   └── incidents.test.ts
├── mocks/                 # Mock implementations
│   ├── database.mock.ts
│   ├── twilio.mock.ts
│   └── s3.mock.ts
└── helpers/               # Test utilities and helpers
    ├── testApp.ts
    └── testData.ts
```

## 🚀 Running Tests

### Available Scripts

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test tests/unit/logger.simple.test.ts

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch

# Run only unit tests
pnpm test:unit

# Run only integration tests
pnpm test:integration

# Run tests with specific pattern
pnpm test -- --testPathPatterns="simple"
```

### Test Commands

```bash
# Basic test execution
npm run test

# Coverage reporting
npm run test:coverage

# Watch mode for development
npm run test:watch

# Verbose output
npm run test -- --verbose
```

## 🔧 Configuration

### Jest Configuration (`jest.config.js`)

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/generated/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  setupFiles: ['<rootDir>/tests/env.setup.ts'],
  testTimeout: 30000,
  maxWorkers: '50%',
};
```

### Environment Setup

- **Unit Tests**: No database connection required, all dependencies mocked
- **Integration Tests**: Real API testing with test database
- **Test Database**: Configurable via environment variables

## 📋 Test Categories

### Unit Tests

- **Purpose**: Test individual functions/classes in isolation
- **Characteristics**: Fast, no external dependencies, comprehensive mocking
- **Examples**: Logger utility, service methods, utility functions

### Integration Tests

- **Purpose**: Test API endpoints and service interactions
- **Characteristics**: Slower, uses test database, tests real workflows
- **Examples**: Authentication flows, CRUD operations, API responses

## 📊 Coverage Reporting

Coverage is configured to track:

- Statement coverage
- Branch coverage
- Function coverage
- Line coverage

Reports are generated in multiple formats:

- Console output for quick feedback
- HTML reports for detailed analysis
- LCOV format for CI/CD integration

## 🎯 Testing Best Practices

### Unit Testing

1. **Mock all external dependencies** (database, APIs, file system)
2. **Test single responsibility** - one function/method per test suite
3. **Use descriptive test names** that explain the expected behavior
4. **Follow AAA pattern**: Arrange, Act, Assert

### Integration Testing

1. **Use test database** separate from development/production
2. **Clean up after each test** to ensure test isolation
3. **Test happy paths and error scenarios**
4. **Use real HTTP requests** with Supertest

### Mock Strategy

- **DatabaseService**: Mock all database operations
- **External APIs**: Mock HTTP requests (Twilio, AWS S3)
- **File system**: Mock file operations
- **Time/Date**: Mock for consistent test results

## 🔍 Test Examples

### Unit Test Example

```typescript
describe('AlertService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create incident alert successfully', async () => {
    // Arrange
    mockDatabaseService.incident.create.mockResolvedValue(mockIncident);

    // Act
    const result = await AlertService.createIncidentAlert(alertData);

    // Assert
    expect(result.success).toBe(true);
    expect(mockDatabaseService.incident.create).toHaveBeenCalledWith(alertData);
  });
});
```

### Integration Test Example

```typescript
describe('POST /api/auth/register', () => {
  it('should register new user successfully', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'securePassword123',
      name: 'Test User',
    };

    const response = await request(app).post('/api/auth/register').send(userData).expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(userData.email);
  });
});
```

## ✅ Infrastructure Status

### Completed ✅

- [x] Jest framework setup and configuration
- [x] TypeScript support with ts-jest
- [x] Test scripts in package.json
- [x] Test directory structure
- [x] Environment setup for testing
- [x] Coverage reporting configuration
- [x] Mock patterns and utilities
- [x] Basic unit tests (Logger utility)
- [x] Basic integration tests (Health checks)
- [x] Global test setup and teardown

### Ready for Development 🚀

- [x] Unit test infrastructure
- [x] Integration test infrastructure
- [x] Mock service patterns
- [x] Test data factories
- [x] Coverage reporting
- [x] CI/CD ready configuration

The testing infrastructure is now fully operational and ready for comprehensive test development across all backend services and API endpoints.

## 🎯 Next Steps

1. **Expand Unit Tests**: Create comprehensive unit tests for all services
2. **Add Integration Tests**: Test all API endpoints with real HTTP requests
3. **Database Testing**: Set up test database with proper seed data
4. **Performance Tests**: Add performance benchmarks for critical operations
5. **E2E Tests**: Connect with frontend testing for full user workflows

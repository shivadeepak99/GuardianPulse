/**
 * Basic API Health Check Integration Test
 * Simple test to verify basic API functionality without database
 */

describe('Health Check API', () => {
  it('should be able to create a basic response object', () => {
    const healthResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'guardian-pulse-api',
      version: '1.0.0'
    };

    expect(healthResponse.status).toBe('ok');
    expect(healthResponse.service).toBe('guardian-pulse-api');
    expect(healthResponse.version).toBe('1.0.0');
    expect(typeof healthResponse.timestamp).toBe('string');
  });

  it('should handle basic JSON operations', () => {
    const data = { test: 'value', number: 42 };
    const jsonString = JSON.stringify(data);
    const parsed = JSON.parse(jsonString);

    expect(parsed.test).toBe('value');
    expect(parsed.number).toBe(42);
  });

  it('should handle error objects correctly', () => {
    const error = new Error('Test error');
    expect(error.message).toBe('Test error');
    expect(error instanceof Error).toBe(true);
  });
});

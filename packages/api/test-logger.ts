import { Logger } from './src/utils/Logger';

/**
 * Test script to verify Winston logger functionality
 */
console.log('Testing Winston Logger Implementation...\n');

// Test different log levels
Logger.info('Logger initialized successfully', { 
  timestamp: new Date().toISOString(),
  service: 'test-logger' 
});

Logger.warn('This is a warning message', { 
  context: 'logger-test',
  severity: 'medium' 
});

Logger.error('This is an error message', { 
  context: 'logger-test',
  error: new Error('Test error for logging'),
  stack: true 
});

Logger.debug('Debug message (only visible in development)', { 
  environment: process.env['NODE_ENV'],
  debugLevel: 'verbose' 
});

Logger.http('HTTP request logged', {
  method: 'POST',
  url: '/api/test',
  statusCode: 200,
  responseTime: '45ms'
});

// Test current log level
console.log(`\nCurrent log level: ${Logger.getLevel()}`);

// Test level configuration
Logger.setLevel('debug');
console.log(`Updated log level: ${Logger.getLevel()}`);

Logger.debug('Debug message after level change - should now be visible');

console.log('\nLogger test completed. Check console output and logs/ directory for file outputs.');

/**
 * Unit Tests for Logger Utility
 */

import { Logger } from '../../src/utils/Logger';

describe('Logger Unit Tests', () => {
  beforeEach(() => {
    // Reset logger level for each test
    Logger.setLevel('info');
  });

  describe('setLevel and getLevel', () => {
    it('should set and get log level correctly', () => {
      // Act
      Logger.setLevel('debug');
      const level = Logger.getLevel();

      // Assert
      expect(level).toBe('debug');
    });

    it('should handle different log levels', () => {
      const levels = ['error', 'warn', 'info', 'debug'];
      
      levels.forEach(level => {
        Logger.setLevel(level);
        expect(Logger.getLevel()).toBe(level);
      });
    });
  });

  describe('logging methods', () => {
    beforeEach(() => {
      // Mock console methods to prevent actual logging during tests
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'warn').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should have info method', () => {
      expect(typeof Logger.info).toBe('function');
      
      // Should not throw
      expect(() => {
        Logger.info('Test info message');
      }).not.toThrow();
    });

    it('should have warn method', () => {
      expect(typeof Logger.warn).toBe('function');
      
      // Should not throw
      expect(() => {
        Logger.warn('Test warning message');
      }).not.toThrow();
    });

    it('should have error method', () => {
      expect(typeof Logger.error).toBe('function');
      
      // Should not throw
      expect(() => {
        Logger.error('Test error message');
      }).not.toThrow();
    });

    it('should have debug method', () => {
      expect(typeof Logger.debug).toBe('function');
      
      // Should not throw
      expect(() => {
        Logger.debug('Test debug message');
      }).not.toThrow();
    });

    it('should accept metadata objects', () => {
      const metadata = { userId: '123', action: 'test' };
      
      expect(() => {
        Logger.info('Test with metadata', metadata);
        Logger.warn('Test with metadata', metadata);
        Logger.error('Test with metadata', metadata);
        Logger.debug('Test with metadata', metadata);
      }).not.toThrow();
    });
  });

  describe('http logging', () => {
    it('should have http method', () => {
      expect(typeof Logger.http).toBe('function');
      
      // Should not throw
      expect(() => {
        Logger.http('HTTP request', {
          method: 'GET',
          url: '/test',
          statusCode: 200,
        });
      }).not.toThrow();
    });
  });
});

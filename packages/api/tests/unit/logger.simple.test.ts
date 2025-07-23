/**
 * Logger Unit Tests
 * Tests for the logging utility without external dependencies
 */

import { Logger } from '../../src/utils';

describe('Logger Unit Tests', () => {
  beforeEach(() => {
    // Reset logger state before each test
    Logger.setLevel('debug');
  });

  describe('setLevel and getLevel', () => {
    it('should set and get log level correctly', () => {
      Logger.setLevel('info');
      expect(Logger.getLevel()).toBe('info');
      
      Logger.setLevel('error');
      expect(Logger.getLevel()).toBe('error');
    });

    it('should handle different log levels', () => {
      const levels = ['error', 'warn', 'info', 'debug'];
      
      levels.forEach(level => {
        Logger.setLevel(level as any);
        expect(Logger.getLevel()).toBe(level);
      });
    });
  });

  describe('logging methods', () => {
    // Capture console output for testing
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should have info method', () => {
      expect(typeof Logger.info).toBe('function');
      Logger.info('Test info message');
      // Logger should exist and be callable
    });

    it('should have warn method', () => {
      expect(typeof Logger.warn).toBe('function');
      Logger.warn('Test warn message');
    });

    it('should have error method', () => {
      expect(typeof Logger.error).toBe('function');
      Logger.error('Test error message');
    });

    it('should have debug method', () => {
      expect(typeof Logger.debug).toBe('function');
      Logger.debug('Test debug message');
    });

    it('should accept metadata objects', () => {
      const metadata = { userId: '123', action: 'test' };
      expect(() => {
        Logger.info('Test with metadata', metadata);
      }).not.toThrow();
    });
  });

  describe('http logging', () => {
    it('should have http method', () => {
      expect(typeof Logger.http).toBe('function');
      Logger.http('Test HTTP log');
    });
  });
});

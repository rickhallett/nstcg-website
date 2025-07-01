import { describe, it, expect, beforeEach } from 'bun:test';
import { LoggerService } from './LoggerService';

describe('LoggerService', () => {
  let loggerService: LoggerService;

  beforeEach(() => {
    // Reset instances
    LoggerService._resetInstance();
    
    // Get fresh instance
    loggerService = LoggerService.getInstance();
  });

  it('should be a singleton, always returning the same instance', () => {
    const instance1 = LoggerService.getInstance();
    const instance2 = LoggerService.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should have log level constants (DEBUG, INFO, WARN, ERROR)', () => {
    expect(LoggerService.LOG_LEVELS.DEBUG).toBe(0);
    expect(LoggerService.LOG_LEVELS.INFO).toBe(1);
    expect(LoggerService.LOG_LEVELS.WARN).toBe(2);
    expect(LoggerService.LOG_LEVELS.ERROR).toBe(3);
  });

  it('should accept setLevel with string values', () => {
    loggerService.setLevel('DEBUG');
    expect(loggerService.getCurrentLevel()).toBe(LoggerService.LOG_LEVELS.DEBUG);
    
    loggerService.setLevel('ERROR');
    expect(loggerService.getCurrentLevel()).toBe(LoggerService.LOG_LEVELS.ERROR);
  });

  it('should have info, warn, error, and debug methods', () => {
    expect(typeof loggerService.info).toBe('function');
    expect(typeof loggerService.warn).toBe('function');
    expect(typeof loggerService.error).toBe('function');
    expect(typeof loggerService.debug).toBe('function');
  });
});
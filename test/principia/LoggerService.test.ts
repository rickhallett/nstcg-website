import { describe, it, expect, beforeEach } from 'bun:test';
import { LoggerService } from '../../src/principia/LoggerService/LoggerService';

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
});
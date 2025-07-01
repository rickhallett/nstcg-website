import { describe, it, beforeEach, expect, jest } from '@jest/globals';
import { ErrorHandlerService } from '../../src/principia/ErrorHandlerService/ErrorHandlerService';
import { LoggerService } from '../../src/principia/LoggerService/LoggerService';
import { EventBus } from '../../src/principia/EventBus/EventBus';

// Mock dependencies
jest.mock('../../src/principia/LoggerService/LoggerService');
jest.mock('../../src/principia/EventBus/EventBus');

describe('ErrorHandlerService', () => {
  let errorHandlerService: ErrorHandlerService;
  let mockLoggerInstance: jest.Mocked<LoggerService>;
  let mockEventBusInstance: jest.Mocked<EventBus>;

  beforeEach(() => {
    // Reset all instances before each test
    ErrorHandlerService._resetInstance();
    
    // Get fresh instance
    errorHandlerService = ErrorHandlerService.getInstance();
    
    // Get mocked instances
    mockLoggerInstance = LoggerService.getInstance() as jest.Mocked<LoggerService>;
    mockEventBusInstance = EventBus.getInstance() as jest.Mocked<EventBus>;
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  it('should be a singleton', () => {
    const instance2 = ErrorHandlerService.getInstance();
    expect(errorHandlerService).toBe(instance2);
  });
});
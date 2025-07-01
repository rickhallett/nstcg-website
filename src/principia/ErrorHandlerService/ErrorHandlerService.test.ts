import { describe, it, beforeEach, expect, spyOn } from 'bun:test';
import { ErrorHandlerService } from './ErrorHandlerService';
import { LoggerService } from '../LoggerService';
import { EventBus } from '../EventBus';

describe('ErrorHandlerService', () => {
  let errorHandlerService: ErrorHandlerService;
  let mockLogger: LoggerService;
  let mockEventBus: EventBus;

  beforeEach(() => {
    // Reset instances
    ErrorHandlerService._resetInstance();
    EventBus._resetInstance();
    LoggerService._resetInstance();
    
    // Create real instances (we'll spy on their methods)
    mockEventBus = EventBus.getInstance();
    mockLogger = LoggerService.getInstance();
    
    // Spy on the methods we want to track
    spyOn(mockLogger, 'error');
    spyOn(mockEventBus, 'emit');
    
    // Get ErrorHandlerService instance
    errorHandlerService = ErrorHandlerService.getInstance(mockEventBus, mockLogger);
  });

  it('should be a singleton', () => {
    const instance2 = ErrorHandlerService.getInstance();
    expect(errorHandlerService).toBe(instance2);
  });

  it('should require EventBus and LoggerService on first getInstance call', () => {
    ErrorHandlerService._resetInstance();
    expect(() => ErrorHandlerService.getInstance()).toThrow(
      'EventBus and LoggerService instances must be provided on first call to getInstance'
    );
  });

  it('should log errors and emit UI events', () => {
    const error = new Error('Test error');
    const context = { source: 'test' };
    
    errorHandlerService.handleError(error, context);
    
    expect(mockLogger.error).toHaveBeenCalledWith('Test error', {
      source: 'test',
      stack: error.stack,
      name: 'Error'
    });
    
    expect(mockEventBus.emit).toHaveBeenCalledWith('ui:show:error', {
      message: 'An unexpected error occurred. Please try again later.'
    });
  });

  it('should not emit UI events for silent errors', () => {
    const error = new Error('Silent error');
    (error as any).silent = true;
    
    errorHandlerService.handleError(error);
    
    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockEventBus.emit).not.toHaveBeenCalled();
  });
});
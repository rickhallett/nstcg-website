import { ErrorHandlerService } from '../src/ErrorHandlerService';
import { EventBus } from '../src/EventBus';
import { LoggerService } from '../LoggerService';

jest.mock('../EventBus');
jest.mock('../LoggerService');

describe('ErrorHandlerService', () => {
  let errorHandlerService: ErrorHandlerService;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockLogger: jest.Mocked<LoggerService>;

  beforeEach(() => {
    ErrorHandlerService._resetInstance();
    mockEventBus = new (EventBus as any)() as jest.Mocked<EventBus>;
    mockLogger = new (LoggerService as any)() as jest.Mocked<LoggerService>;
    errorHandlerService = ErrorHandlerService.getInstance(mockEventBus, mockLogger);
  });

  it('should be a singleton', () => {
    const instance2 = ErrorHandlerService.getInstance();
    expect(errorHandlerService).toBe(instance2);
  });

  it('should attach global error listeners on init()', () => {
    const windowSpy = jest.spyOn(window, 'addEventListener');
    errorHandlerService.init();
    expect(windowSpy).toHaveBeenCalledWith('error', expect.any(Function));
    expect(windowSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
  });

  describe('handleError()', () => {
    it('should log the error with level "ERROR" using the LoggerService', () => {
      const error = new Error('A critical failure');
      errorHandlerService.handleError(error, { source: 'test' });
      expect(mockLogger.error).toHaveBeenCalledWith('A critical failure', expect.objectContaining({
        source: 'test',
        stack: expect.any(String)
      }));
    });

    it('should emit a "ui:show:error" event on the EventBus with a user-friendly message', () => {
      const error = new Error('A critical failure');
      errorHandlerService.handleError(error);
      expect(mockEventBus.emit).toHaveBeenCalledWith('ui:show:error', {
        message: 'An unexpected error occurred. Please try again later.'
      });
    });

    it('should extract and use a custom user-friendly message if the error has a userMessage property', () => {
      const apiError = new Error('Not Found');
      (apiError as any).userMessage = 'The requested resource could not be found.';
      errorHandlerService.handleError(apiError);
      expect(mockEventBus.emit).toHaveBeenCalledWith('ui:show:error', {
        message: 'The requested resource could not be found.'
      });
    });

    it('should not emit a "ui:show:error" event if the error has a "silent" flag', () => {
      const silentError = new Error('Silent failure');
      (silentError as any).silent = true;
      errorHandlerService.handleError(silentError);
      expect(mockLogger.error).toHaveBeenCalled(); // Should still be logged
      expect(mockEventBus.emit).not.toHaveBeenCalledWith('ui:show:error', expect.any(Object));
    });
  });
});
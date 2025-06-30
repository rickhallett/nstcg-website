[<- Back to Index](./000_master_blueprint.md)

# Blueprint: ErrorHandlerService.js

**Objective:** To create a centralized service for catching and handling all unhandled exceptions.

**Test Specification:** `tests/core/ErrorHandlerService.test.js`

```javascript
import { ErrorHandlerService } from '../../js/core/ErrorHandlerService.js';
import { LoggerService } from '../../js/core/LoggerService.js';
import { EventBus } from '../../js/core/EventBus.js';
import { expect } from '../../js/testing/expect.js';
import { describe, it, beforeEach, mockFn, mockSpy } from '../../js/testing/veritas.js';

// Mock dependencies
jest.mock('../../js/core/LoggerService.js');
jest.mock('../../js/core/EventBus.js');

describe('ErrorHandlerService', () => {
  let errorHandlerService;
  let mockLoggerInstance;
  let mockEventBusInstance;

  beforeEach(() => {
    ErrorHandlerService._resetInstance();
    LoggerService._resetInstance();
    EventBus._resetInstance();
    
    errorHandlerService = ErrorHandlerService.getInstance();
    mockLoggerInstance = LoggerService.getInstance();
    mockEventBusInstance = EventBus.getInstance();
  });

  it('should be a singleton', () => {
    const instance2 = ErrorHandlerService.getInstance();
    expect(errorHandlerService).toBe(instance2);
  });

  it('should attach global error listeners on init()', () => {
    const windowSpy = mockSpy(window, 'addEventListener');
    errorHandlerService.init();
    expect(windowSpy).toHaveBeenCalledWith('error', expect.any(Function));
    expect(windowSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
  });

  describe('handleError()', () => {
    it('should log the error with level "ERROR" using the LoggerService', () => {
      const error = new Error('A critical failure');
      errorHandlerService.handleError(error, { source: 'test' });
      expect(mockLoggerInstance.error).toHaveBeenCalledWith('A critical failure', expect.objectContaining({
        source: 'test',
        stack: expect.any(String)
      }));
    });

    it('should emit a "ui:show:error" event on the EventBus with a user-friendly message', () => {
      const error = new Error('A critical failure');
      errorHandlerService.handleError(error);
      expect(mockEventBusInstance.emit).toHaveBeenCalledWith('ui:show:error', {
        message: 'An unexpected error occurred. Please try again later.'
      });
    });

    it('should extract and use a custom user-friendly message if the error is an ApplicationError', () => {
      // Assuming a custom error class like: class APIError extends Error { constructor(msg, userMsg) { super(msg); this.userMessage = userMsg; } }
      const apiError = new APIError('Not Found', 'The requested resource could not be found.');
      errorHandlerService.handleError(apiError);
      expect(mockEventBusInstance.emit).toHaveBeenCalledWith('ui:show:error', {
        message: 'The requested resource could not be found.'
      });
    });

    it('should not emit a "ui:show:error" event if the error has a "silent" flag', () => {
      const silentError = new Error('Silent failure');
      silentError.silent = true;
      errorHandlerService.handleError(silentError);
      expect(mockLoggerInstance.error).toHaveBeenCalled(); // Should still be logged
      expect(mockEventBusInstance.emit).not.toHaveBeenCalledWith('ui:show:error', expect.any(Object));
    });
  });
});
```

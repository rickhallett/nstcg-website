# ErrorHandlerService Implementation Instructions (Blueprint 003)

## Your Mission
You are responsible for implementing the ErrorHandlerService module - the centralized error handling system for the Principia.js architecture. This service catches, logs, and gracefully handles all application errors.

## Setup Instructions

1. Create a new git worktree:
```bash
git worktree add ../principia-003 -b feature/blueprint-003
cd ../principia-003
```

2. Your implementation files:
- Main implementation: `src/ErrorHandlerService.ts`
- Test file: `test/ErrorHandlerService.test.ts`
- Integration: Update `src/index.ts` to export your module

## Blueprint Specification

### Core Requirements
1. **Singleton Pattern**: Only one ErrorHandlerService instance
2. **Global Error Handling**: Catch window.onerror and unhandledrejection
3. **Error Logging**: Integrate with LoggerService for error logging
4. **Error Recovery**: Provide graceful error recovery strategies
5. **Error Context**: Capture and store error context information
6. **Event Emission**: Notify other modules of critical errors

### Required Methods

```typescript
interface ErrorHandlerService {
  getInstance(): ErrorHandlerService;
  _resetInstance(): void; // For testing only
  
  initialize(): void;
  handleError(error: Error, context?: any): void;
  setErrorHandler(handler: Function): void;
  getLastError(): ErrorInfo | null;
  clearErrors(): void;
}

interface ErrorInfo {
  error: Error;
  context?: any;
  timestamp: Date;
  handled: boolean;
}
```

## Test-Driven Development Process

Follow this EXACT order - write one test at a time, make it pass, then commit:

### Test 1: Singleton Pattern
```typescript
it('should be a singleton, always returning the same instance')
// Verify getInstance() returns same instance
```

### Test 2: Initialize Global Handlers
```typescript
it('should set up global error handlers on initialize')
// Mock window.onerror and window.addEventListener
```

### Test 3: Handle Errors
```typescript
it('should handle errors and log them via LoggerService')
// Test handleError() integration with LoggerService
```

### Test 4: Store Error Information
```typescript
it('should store error information with context and timestamp')
// Verify error storage and retrieval
```

### Test 5: Custom Error Handlers
```typescript
it('should allow setting custom error handlers')
// Test setErrorHandler() functionality
```

### Test 6: Emit Error Events
```typescript
it('should emit error events via EventBus')
// Test EventBus integration for error broadcasting
```

### Test 7: Error Recovery
```typescript
it('should not throw when handling errors in error handlers')
// Test recursive error protection
```

### Test 8: Clear Error History
```typescript
it('should clear stored errors on demand')
// Test clearErrors() functionality
```

## Implementation Guidelines

### Dependencies
```typescript
import { EventBus } from './EventBus';
import { LoggerService } from './LoggerService';
```

### Error Storage
```typescript
private errors: ErrorInfo[] = [];
private customHandler?: Function;
private maxStoredErrors = 100;
```

### Global Handler Setup
```typescript
initialize(): void {
  // Window error handler
  window.onerror = (message, source, lineno, colno, error) => {
    this.handleError(error || new Error(String(message)), {
      source,
      lineno,
      colno
    });
    return true; // Prevent default error handling
  };

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    this.handleError(
      new Error(`Unhandled Promise Rejection: ${event.reason}`),
      { promise: event.promise }
    );
    event.preventDefault();
  });
}
```

### Error Handling Logic
```typescript
handleError(error: Error, context?: any): void {
  try {
    // Create error info
    const errorInfo: ErrorInfo = {
      error,
      context,
      timestamp: new Date(),
      handled: false
    };

    // Store error (with limit)
    this.errors.push(errorInfo);
    if (this.errors.length > this.maxStoredErrors) {
      this.errors.shift();
    }

    // Log via LoggerService
    const logger = LoggerService.getInstance();
    logger.error(`${error.name}: ${error.message}`, {
      stack: error.stack,
      context
    });

    // Call custom handler if set
    if (this.customHandler) {
      try {
        this.customHandler(error, context);
        errorInfo.handled = true;
      } catch (handlerError) {
        // Prevent recursive errors
        logger.error('Error in custom error handler', handlerError);
      }
    }

    // Emit error event
    EventBus.getInstance().emit('error:occurred', {
      error: error.message,
      name: error.name,
      context
    });

  } catch (fatalError) {
    // Last resort - log to console
    console.error('Fatal error in error handler:', fatalError);
  }
}
```

## Integration Points

### With LoggerService
- All errors MUST be logged through LoggerService
- Use appropriate log levels (error for errors, warn for warnings)

### With EventBus
- Emit `error:occurred` for recoverable errors
- Emit `error:critical` for fatal errors that require app restart

### Error Recovery Strategies
```typescript
// Example recovery strategy for network errors
if (error.name === 'NetworkError') {
  EventBus.getInstance().emit('network:retry-required', {
    error,
    retryCount: context?.retryCount || 0
  });
}
```

## Commit Process

After EACH test passes:
```bash
git add -A
git commit -m "feat(ErrorHandlerService): <specific feature implemented>"
```

Example commits:
- `feat(ErrorHandlerService): implement singleton pattern`
- `feat(ErrorHandlerService): add global error handler setup`
- `feat(ErrorHandlerService): integrate error logging with LoggerService`

## Final Steps

1. After all tests pass, update `src/index.ts`:
```typescript
export { ErrorHandlerService } from './ErrorHandlerService';
```

2. Run all tests to ensure no regressions:
```bash
bun test
```

3. Create PR:
```bash
gh pr create --title "feat(ErrorHandlerService): Implement Blueprint 003 - Error Handling" \
  --body "Implements centralized error handling with LoggerService integration and EventBus notifications"
```

## Architecture Notes

- ErrorHandlerService is the ONLY place for global error handling
- All modules should use this service instead of try/catch everywhere
- Critical errors should trigger application recovery procedures
- Non-critical errors should be logged and monitored
- Error context is crucial for debugging - always include it

## Success Criteria

✅ All 8 tests passing
✅ 100% test coverage
✅ Proper integration with LoggerService and EventBus
✅ Global error handlers properly set up
✅ No recursive error loops
✅ Graceful degradation on errors
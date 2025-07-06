# ErrorBoundary Component System

The Principia.js ErrorBoundary system provides comprehensive error handling for components, preventing individual component failures from crashing the entire application.

## Overview

ErrorBoundary catches JavaScript errors anywhere in a component tree, logs those errors, and displays a fallback UI instead of the component tree that crashed. It's inspired by React's error boundaries but adapted for vanilla JavaScript.

## Key Features

### 1. Error Catching
- Catches errors during render phase
- Handles errors in lifecycle methods
- Logs errors with detailed context
- Prevents application crashes

### 2. Error Recovery
- Configurable retry mechanism
- Clear error state on successful updates
- Manual retry capability
- Automatic recovery attempts

### 3. Error UI Customization
- Default error UI with development/production modes
- Customizable fallback UI
- Error context display in development
- User-friendly messages in production

### 4. Parent-Child Error Propagation
- Errors bubble up to parent components
- Parents can handle or ignore child errors
- Automatic UI updates when errors are handled

### 5. Error History & Debugging
- Tracks all errors with timestamps
- Maintains error context (props, state, phase)
- Provides debugging information
- Component stack traces in development

## Usage

### Basic Usage

```typescript
import { ErrorBoundaryComponent } from '@/principia/Component';

class MyComponent extends ErrorBoundaryComponent {
  doRender(): HTMLElement {
    const div = document.createElement('div');
    // Your component logic here
    return div;
  }
}
```

### Configuration Options

```typescript
const component = new MyComponent(host, {
  maxRetries: 3,              // Number of retry attempts
  isDevelopment: true,        // Show detailed errors
  logErrors: true,           // Log errors to console
  onError: (error, info) => { // Custom error handler
    console.error('Component error:', error);
  },
  fallbackUI: (error, info) => { // Custom error UI
    const div = document.createElement('div');
    div.textContent = 'Oops! Something went wrong.';
    return div;
  }
});
```

### Error Recovery

```typescript
// Automatic recovery with retries
class RetryableComponent extends ErrorBoundaryComponent {
  attempts = 0;
  
  constructor(host: HTMLElement) {
    super(host, { maxRetries: 3 });
  }
  
  doRender(): HTMLElement {
    this.attempts++;
    if (this.attempts < 3) {
      throw new Error('Temporary error');
    }
    // Success on third attempt
    return this.renderSuccess();
  }
}

// Manual recovery
component.retry(); // Clear error and re-render
```

### Parent-Child Error Handling

```typescript
class ParentComponent extends ErrorBoundaryComponent {
  onChildError(error: Error, child: ErrorBoundary): boolean {
    // Handle child error
    console.log('Child component failed:', error);
    
    // Return true to stop propagation
    return true;
  }
  
  doRender(): HTMLElement {
    // Parent continues to work even if child fails
  }
}

// Add child relationship
parent.addChild(childComponent);
```

### Custom Error UI

```typescript
class CustomErrorComponent extends ErrorBoundaryComponent {
  constructor(host: HTMLElement) {
    super(host, {
      fallbackUI: (error, info) => {
        const container = document.createElement('div');
        container.className = 'error-container';
        
        if (info.phase === 'render') {
          container.innerHTML = `
            <h2>Unable to display content</h2>
            <p>Please try refreshing the page.</p>
            <button onclick="location.reload()">Refresh</button>
          `;
        }
        
        return container;
      }
    });
  }
}
```

## Implementation Details

### Error Phases

Errors are caught and categorized by phase:
- `constructor`: Errors during component creation
- `render`: Errors during the render phase
- `attach`: Errors when attaching to DOM
- `update`: Errors during updates
- `destroy`: Errors during cleanup
- `lifecycle`: Errors in lifecycle hooks
- `event`: Errors in event handlers (limited support)

### Error Information

Each error includes detailed context:
```typescript
interface ErrorInfo {
  phase: string;          // Where the error occurred
  method?: string;        // Specific method name
  componentName: string;  // Component class name
  props: any;            // Component props at error time
  state: any;            // Component state at error time
  timestamp: number;      // When the error occurred
}
```

### Lifecycle Methods

ErrorBoundary provides these lifecycle hooks:
- `componentDidCatch(error, errorInfo)`: Called when an error is caught
- `onChildError(error, child)`: Called when a child component errors
- `doRender()`: The actual render method (replaces `render()`)

## Best Practices

1. **Use ErrorBoundary for all user-facing components** to prevent crashes
2. **Configure appropriate retry counts** based on component stability
3. **Provide user-friendly error messages** in production
4. **Log errors to monitoring services** using the `onError` callback
5. **Test error scenarios** to ensure graceful degradation
6. **Use parent error boundaries** for groups of related components

## Migration Guide

### From Regular Component

```typescript
// Before
class MyComponent extends Component {
  render(): HTMLElement {
    // Component logic
  }
}

// After
class MyComponent extends ErrorBoundaryComponent {
  doRender(): HTMLElement {
    // Same component logic
  }
}
```

### Adding Error Handling

```typescript
class MyComponent extends ErrorBoundaryComponent {
  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log to error tracking service
    errorTracker.log(error, {
      component: info.componentName,
      phase: info.phase,
      props: info.props
    });
  }
  
  doRender(): HTMLElement {
    // Component logic
  }
}
```

## Limitations

1. **Event Handler Errors**: Inline event handlers (`onclick`, etc.) execute outside the component lifecycle, so errors may not be caught automatically.
2. **Async Errors**: Errors in promises and setTimeout/setInterval are not automatically caught.
3. **Error Boundaries Can't Catch Their Own Errors**: An error boundary can't catch errors within itself.

## Performance Considerations

- Error boundaries add minimal overhead during normal operation
- Error state tracking uses memory proportional to error frequency
- Retry mechanisms may cause multiple render attempts
- Production mode reduces error detail verbosity for better performance
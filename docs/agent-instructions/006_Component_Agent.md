# Component Implementation Instructions (Blueprint 006)

## Your Mission
You are responsible for implementing the Component base class - the foundation for all UI components in the Principia.js architecture. This abstract class provides lifecycle management, state subscriptions, and efficient rendering using dom-diff.

## Setup Instructions

1. Create a new git worktree:
```bash
git worktree add ../principia-006 -b feature/blueprint-006
cd ../principia-006
```

2. Your implementation files:
- Main implementation: `src/Component.ts`
- Test file: `test/Component.test.ts`
- Integration: Update `src/index.ts` to export your module

## Blueprint Specification

### Core Requirements
1. **Abstract Base Class**: Cannot be instantiated directly
2. **Props & State**: Accept props, subscribe to state changes
3. **Lifecycle Methods**: Initialize, attach, destroy phases
4. **Render Method**: Abstract method that returns DOM elements
5. **Automatic Re-rendering**: Re-render on subscribed state changes
6. **Event Delegation**: Emit events via EventBus, not handle logic

### Required Interface

```typescript
abstract class Component {
  protected props: any;
  protected host: Element;
  protected currentElement?: Element;
  private subscriptions: Function[] = [];
  
  constructor(host: Element, props: any = {});
  
  // Lifecycle methods
  attach(): void;
  destroy(): void;
  
  // State subscription
  protected subscribeToState(path: string): void;
  
  // Abstract render method
  protected abstract render(): Element;
  
  // Event emission helper
  protected emit(eventName: string, data?: any): void;
}
```

## Test-Driven Development Process

Since Component is abstract, create a TestComponent for testing:

```typescript
class TestComponent extends Component {
  protected render(): Element {
    const div = document.createElement('div');
    div.className = 'test-component';
    div.textContent = this.props.text || 'Test';
    return div;
  }
}
```

### Test 1: Constructor and Props
```typescript
it('should store host element and props')
// Verify props are accessible and host is stored
```

### Test 2: Attach Lifecycle
```typescript
it('should render and attach to host element on attach()')
// Test initial render and DOM attachment
```

### Test 3: State Subscription
```typescript
it('should subscribe to state paths and re-render on changes')
// Test StateManager integration
```

### Test 4: Efficient Re-rendering
```typescript
it('should use dom-diff for efficient updates')
// Verify dom-diff is used, not innerHTML
```

### Test 5: Multiple Subscriptions
```typescript
it('should handle multiple state subscriptions')
// Test subscribing to multiple paths
```

### Test 6: Event Emission
```typescript
it('should emit events through EventBus')
// Test the emit helper method
```

### Test 7: Destroy Lifecycle
```typescript
it('should clean up on destroy()')
// Test subscription cleanup and DOM removal
```

### Test 8: Error Handling
```typescript
it('should handle render errors gracefully')
// Test error boundaries
```

## Implementation Guidelines

### Dependencies
```typescript
import { EventBus } from './EventBus';
import { StateManager } from './StateManager';
import { diff } from './dom-diff';
```

### Constructor Implementation
```typescript
constructor(host: Element, props: any = {}) {
  if (new.target === Component) {
    throw new Error('Component is an abstract class and cannot be instantiated directly');
  }
  
  this.host = host;
  this.props = { ...props }; // Shallow clone to prevent external mutations
  this.subscriptions = [];
}
```

### Attach Method
```typescript
attach(): void {
  try {
    // Initial render
    const newElement = this.render();
    
    if (this.currentElement) {
      // Update existing element
      diff(this.currentElement, newElement);
    } else {
      // First render
      this.host.appendChild(newElement);
      this.currentElement = newElement;
    }
  } catch (error) {
    this.handleRenderError(error);
  }
}
```

### State Subscription
```typescript
protected subscribeToState(path: string): void {
  const handler = () => {
    this.update();
  };
  
  // Subscribe via StateManager
  const unsubscribe = StateManager.getInstance().subscribe(path, handler);
  this.subscriptions.push(unsubscribe);
  
  // Also listen for specific state change events
  const eventHandler = (data: any) => {
    if (data.path === path || data.path.startsWith(path + '.')) {
      this.update();
    }
  };
  
  EventBus.getInstance().on('state:changed', eventHandler);
  this.subscriptions.push(() => {
    EventBus.getInstance().off('state:changed', eventHandler);
  });
}
```

### Update Method (Private)
```typescript
private update(): void {
  if (!this.currentElement) return;
  
  try {
    const newElement = this.render();
    diff(this.currentElement, newElement);
  } catch (error) {
    this.handleRenderError(error);
  }
}
```

### Event Emission Helper
```typescript
protected emit(eventName: string, data?: any): void {
  EventBus.getInstance().emit(eventName, {
    component: this.constructor.name,
    ...data
  });
}
```

### Destroy Method
```typescript
destroy(): void {
  // Clean up subscriptions
  this.subscriptions.forEach(unsubscribe => unsubscribe());
  this.subscriptions = [];
  
  // Remove from DOM
  if (this.currentElement && this.currentElement.parentElement) {
    this.currentElement.parentElement.removeChild(this.currentElement);
  }
  
  this.currentElement = undefined;
}
```

### Error Handling
```typescript
private handleRenderError(error: any): void {
  console.error('Component render error:', error);
  
  // Render error state
  const errorElement = document.createElement('div');
  errorElement.className = 'component-error';
  errorElement.textContent = 'Component failed to render';
  
  if (this.currentElement) {
    diff(this.currentElement, errorElement);
  } else {
    this.host.appendChild(errorElement);
    this.currentElement = errorElement;
  }
  
  // Emit error event
  this.emit('component:error', { error: error.message });
}
```

## Example Component Implementation

Show agents how to extend Component:

```typescript
// Example: CounterComponent
class CounterComponent extends Component {
  constructor(host: Element, props: any) {
    super(host, props);
    this.subscribeToState('counter.value');
  }
  
  protected render(): Element {
    const div = document.createElement('div');
    div.className = 'counter';
    
    const value = StateManager.getInstance().get('counter.value') || 0;
    
    const span = document.createElement('span');
    span.textContent = `Count: ${value}`;
    
    const button = document.createElement('button');
    button.textContent = 'Increment';
    button.onclick = () => {
      this.emit('counter:increment');
    };
    
    div.appendChild(span);
    div.appendChild(button);
    
    return div;
  }
}
```

## Commit Process

After EACH test passes:
```bash
git add -A
git commit -m "feat(Component): <specific feature implemented>"
```

Example commits:
- `feat(Component): implement abstract base class with constructor`
- `feat(Component): add attach lifecycle with initial render`
- `feat(Component): implement state subscription system`

## Final Steps

1. After all tests pass, update `src/index.ts`:
```typescript
export { Component } from './Component';
```

2. Run all tests to ensure no regressions:
```bash
bun test
```

3. Create PR:
```bash
gh pr create --title "feat(Component): Implement Blueprint 006 - Component Base Class" \
  --body "Implements abstract Component class with lifecycle, state subscriptions, and dom-diff integration"
```

## Architecture Notes

- Component is the base for ALL UI components
- Components are "dumb" - they only render and emit events
- Business logic lives in Models and View Controllers
- State subscriptions trigger automatic re-renders
- dom-diff ensures efficient updates
- Components should be small and focused

## Success Criteria

✅ All 8 tests passing
✅ 100% test coverage
✅ Proper abstract class that can't be instantiated
✅ Clean integration with StateManager, EventBus, and dom-diff
✅ Robust error handling
✅ Clear examples for extending the class
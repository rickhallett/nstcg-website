# EventBus with Automatic Memory Management

The Principia.js EventBus has been enhanced with automatic memory management to prevent memory leaks from orphaned event handlers.

## The Problem

In traditional event systems, when a component subscribes to events but is destroyed without unsubscribing, the event handlers remain in memory. This creates memory leaks as:
- The handler functions can't be garbage collected
- Any data captured in the handler's closure remains in memory
- The component itself might be retained through the handler reference

## The Solution: ManagedEventBus

The `ManagedEventBus` extends the base `EventBus` with WeakMap-based ownership tracking:

```typescript
// Subscribe with an owner (typically a component)
eventBus.on('user:login', handleLogin, ownerComponent);

// When the owner is destroyed, all its subscriptions are automatically cleaned up
ownerComponent.destroy(); // All event handlers are removed
```

### Key Features

1. **Automatic Cleanup**: When an owner object is garbage collected, all its event subscriptions are automatically removed
2. **WeakMap Storage**: Uses WeakMap for zero memory overhead - no references are retained
3. **Backward Compatible**: Fully compatible with the original EventBus API
4. **Debugging Support**: Provides inspection methods to monitor subscriptions

## Usage

### Basic Usage with ManagedEventBus

```typescript
import { ManagedEventBus } from '@/principia/EventBus';

const eventBus = ManagedEventBus.getInstance();

// Subscribe with owner
const owner = { name: 'MyModule' };
eventBus.on('data:update', (data) => {
  console.log('Data updated:', data);
}, owner);

// Clean up all subscriptions for an owner
eventBus.cleanupOwner(owner);
```

### Component Integration with ManagedComponent

The `ManagedComponent` base class automatically integrates with `ManagedEventBus`:

```typescript
import { ManagedComponent } from '@/principia/Component';

class MyComponent extends ManagedComponent {
  constructor(host: HTMLElement, props: any) {
    super(host, props);
    
    // Subscribe to events - automatically cleaned up on destroy
    this.on('user:login', this.handleLogin);
    this.on('data:update', this.handleDataUpdate);
    
    // One-time subscription
    this.once('app:ready', () => {
      console.log('App is ready!');
    });
  }
  
  private handleLogin = (user: User) => {
    // Handle login
  }
  
  private handleDataUpdate = (data: any) => {
    // Handle data update
  }
  
  render(): HTMLElement {
    // Render component
  }
}

// When component is destroyed, all event subscriptions are automatically removed
component.destroy();
```

### Migrating Legacy Components

Use the `withManagedEvents` mixin to add automatic cleanup to existing components:

```typescript
import { Component } from '@/principia/Component';
import { withManagedEvents } from '@/principia/Component/ManagedComponent';

// Legacy component
class LegacyComponent extends Component {
  // ... existing code
}

// Enhanced with managed events
const ManagedLegacyComponent = withManagedEvents(LegacyComponent);

// Now it has automatic cleanup
const component = new ManagedLegacyComponent(host);
component.on('event', handler); // Automatically cleaned up on destroy
```

## API Reference

### ManagedEventBus

```typescript
class ManagedEventBus extends EventBus {
  // Subscribe with optional owner
  on(eventName: string, handler: Function, owner?: object): () => void;
  
  // Clean up all subscriptions for an owner
  cleanupOwner(owner: object): void;
  
  // Debugging methods
  hasHandlers(eventName: string): boolean;
  getEventInfo(eventName: string): EventInfo;
  getAllEvents(): string[];
  getOwnerInfo(owner: object): OwnerInfo;
}
```

### ManagedComponent

```typescript
abstract class ManagedComponent extends Component {
  // Subscribe with automatic cleanup
  protected on(eventName: string, handler: Function): () => void;
  
  // Subscribe once
  protected once(eventName: string, handler: Function): () => void;
  
  // Get subscription info for debugging
  public getSubscriptionInfo(): SubscriptionInfo;
}
```

## Best Practices

1. **Always use ManagedComponent** for new components to get automatic cleanup
2. **Pass owner parameter** when subscribing from non-component code
3. **Use debugging methods** to monitor subscriptions during development
4. **Migrate gradually** using the `withManagedEvents` mixin
5. **Call cleanupOwner** when destroying custom objects that subscribe to events

## Performance Considerations

- **Zero overhead**: WeakMap storage means no performance impact
- **Automatic GC**: Relies on JavaScript's garbage collector for cleanup
- **No reference retention**: Owner objects can be freely garbage collected
- **Efficient cleanup**: O(n) cleanup where n is the number of subscriptions for an owner

## Migration Guide

### From EventBus to ManagedEventBus

```typescript
// Before
const eventBus = EventBus.getInstance();
const unsubscribe = eventBus.on('event', handler);
// Must manually unsubscribe
unsubscribe();

// After
const eventBus = ManagedEventBus.getInstance();
eventBus.on('event', handler, owner);
// Automatic cleanup when owner is GC'd
```

### From Component to ManagedComponent

```typescript
// Before
class MyComponent extends Component {
  private unsubscribers: Function[] = [];
  
  constructor(host: HTMLElement) {
    super(host);
    const unsub = this.eventBus.on('event', this.handler);
    this.unsubscribers.push(unsub);
  }
  
  destroy() {
    this.unsubscribers.forEach(fn => fn());
    super.destroy();
  }
}

// After
class MyComponent extends ManagedComponent {
  constructor(host: HTMLElement) {
    super(host);
    this.on('event', this.handler); // Auto cleanup!
  }
  // No manual cleanup needed
}
```
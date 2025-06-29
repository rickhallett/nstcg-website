[<- Back to Index](./000_master_blueprint.md)

# Blueprint: EventBus.js

**Objective:** To create a singleton event bus for decoupled module communication.

**Test Specification:** `tests/core/EventBus.test.js`

```javascript
import { EventBus } from '../../js/core/EventBus.js';
import { expect } from '../../js/testing/expect.js';
import { describe, it, beforeEach, mockFn } from '../../js/testing/veritas.js';

describe('EventBus', () => {
  let eventBus;

  beforeEach(() => {
    EventBus._resetInstance(); // Assuming a test-only reset method
    eventBus = EventBus.getInstance();
  });

  it('should be a singleton, always returning the same instance', () => {
    const instance2 = EventBus.getInstance();
    expect(eventBus).toBe(instance2);
  });

  it('should subscribe a single handler to an event and trigger it on emit', () => {
    const handler = mockFn();
    eventBus.on('test-event', handler);
    eventBus.emit('test-event');
    expect(handler).toHaveBeenCalled();
  });

  it('should pass payload data from emit to the subscribed handler', () => {
    const handler = mockFn();
    const payload = { message: 'hello' };
    eventBus.on('test-event', handler);
    eventBus.emit('test-event', payload);
    expect(handler).toHaveBeenCalledWith(payload);
  });

  it('should allow multiple handlers for the same event', () => {
    const handler1 = mockFn();
    const handler2 = mockFn();
    eventBus.on('multi-event', handler1);
    eventBus.on('multi-event', handler2);
    eventBus.emit('multi-event');
    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });

  it('should unsubscribe a specific handler, leaving others intact', () => {
    const handlerToKeep = mockFn();
    const handlerToRemove = mockFn();
    const off = eventBus.on('mixed-event', handlerToKeep);
    eventBus.on('mixed-event', handlerToRemove);
    
    eventBus.off('mixed-event', handlerToRemove);
    
    eventBus.emit('mixed-event');
    expect(handlerToKeep).toHaveBeenCalled();
    expect(handlerToRemove).not.toHaveBeenCalled();
  });
  
  it('should allow unsubscribing via a returned function', () => {
    const handler = mockFn();
    const unsubscribe = eventBus.on('test-event', handler);
    unsubscribe();
    eventBus.emit('test-event');
    expect(handler).not.toHaveBeenCalled();
  });
});
```

import { describe, it, beforeEach, expect, mock } from 'bun:test';
import { EventBus } from './EventBus';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    EventBus._resetInstance(); // Assuming a test-only reset method
    eventBus = EventBus.getInstance();
  });

  it('should be a singleton, always returning the same instance', () => {
    const instance2 = EventBus.getInstance();
    expect(eventBus).toBe(instance2);
  });

  it('should subscribe a single handler to an event and trigger it on emit', () => {
    const handler = mock();
    eventBus.on('test-event', handler);
    eventBus.emit('test-event');
    expect(handler).toHaveBeenCalled();
  });

  it('should pass payload data from emit to the subscribed handler', () => {
    const handler = mock();
    const payload = { message: 'hello' };
    eventBus.on('test-event', handler);
    eventBus.emit('test-event', payload);
    expect(handler).toHaveBeenCalledWith(payload);
  });

  it('should allow multiple handlers for the same event', () => {
    const handler1 = mock();
    const handler2 = mock();
    eventBus.on('multi-event', handler1);
    eventBus.on('multi-event', handler2);
    eventBus.emit('multi-event');
    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });

  it('should unsubscribe a specific handler, leaving others intact', () => {
    const handlerToKeep = mock();
    const handlerToRemove = mock();
    eventBus.on('mixed-event', handlerToKeep);
    eventBus.on('mixed-event', handlerToRemove);
    
    eventBus.off('mixed-event', handlerToRemove);
    
    eventBus.emit('mixed-event');
    expect(handlerToKeep).toHaveBeenCalled();
    expect(handlerToRemove).not.toHaveBeenCalled();
  });
  
  it('should allow unsubscribing via a returned function', () => {
    const handler = mock();
    const unsubscribe = eventBus.on('test-event', handler);
    unsubscribe();
    eventBus.emit('test-event');
    expect(handler).not.toHaveBeenCalled();
  });
});
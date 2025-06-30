import { EventBus, EventHandler } from '../src/EventBus';

describe('EventBus Singleton', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    EventBus._resetInstance(); // Reset instance before each test
    eventBus = EventBus.getInstance();
  });

  it('should be a singleton, always returning the same instance', () => {
    const instance1 = EventBus.getInstance();
    const instance2 = EventBus.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should subscribe a single handler to an event and trigger it on emit', () => {
    const handler: EventHandler = jest.fn();
    eventBus.on('test-event', handler);
    eventBus.emit('test-event');
    expect(handler).toHaveBeenCalled();
  });

  it('should pass payload data from emit to the subscribed handler', () => {
    const handler: EventHandler<{ message: string }> = jest.fn();
    const payload = { message: 'hello' };
    eventBus.on('test-event', handler);
    eventBus.emit('test-event', payload);
    expect(handler).toHaveBeenCalledWith(payload);
  });

  it('should allow multiple handlers for the same event', () => {
    const handler1: EventHandler = jest.fn();
    const handler2: EventHandler = jest.fn();
    eventBus.on('multi-event', handler1);
    eventBus.on('multi-event', handler2);
    eventBus.emit('multi-event');
    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });

  it('should unsubscribe a specific handler, leaving others intact', () => {
    const handlerToKeep: EventHandler = jest.fn();
    const handlerToRemove: EventHandler = jest.fn();
    eventBus.on('mixed-event', handlerToKeep);
    eventBus.on('mixed-event', handlerToRemove);
    
    eventBus.off('mixed-event', handlerToRemove);
    
    eventBus.emit('mixed-event');
    expect(handlerToKeep).toHaveBeenCalled();
    expect(handlerToRemove).not.toHaveBeenCalled();
  });
  
  it('should allow unsubscribing via a returned function', () => {
    const handler: EventHandler = jest.fn();
    const unsubscribe = eventBus.on('test-event', handler);
    unsubscribe();
    eventBus.emit('test-event');
    expect(handler).not.toHaveBeenCalled();
  });
});


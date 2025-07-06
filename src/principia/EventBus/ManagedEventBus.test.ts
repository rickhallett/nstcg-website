import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ManagedEventBus } from './ManagedEventBus';
import { Component } from '../Component';

// Mock component for testing
class MockComponent extends Component {
  render(): HTMLElement {
    const div = document.createElement('div');
    div.textContent = 'Mock Component';
    return div;
  }
}

describe('ManagedEventBus', () => {
  let eventBus: ManagedEventBus;
  
  beforeEach(() => {
    // Reset singleton
    ManagedEventBus._resetInstance();
    eventBus = ManagedEventBus.getInstance();
  });
  
  describe('singleton behavior', () => {
    it('should return the same instance', () => {
      const instance1 = ManagedEventBus.getInstance();
      const instance2 = ManagedEventBus.getInstance();
      expect(instance1).toBe(instance2);
    });
  });
  
  describe('automatic cleanup with WeakMap', () => {
    it('should track subscriptions by owner', () => {
      const owner1 = {};
      const owner2 = {};
      const handler1 = mock();
      const handler2 = mock();
      
      eventBus.on('test', handler1, owner1);
      eventBus.on('test', handler2, owner2);
      
      eventBus.emit('test', 'data');
      
      expect(handler1).toHaveBeenCalledWith('data');
      expect(handler2).toHaveBeenCalledWith('data');
    });
    
    it('should clean up subscriptions when owner is garbage collected', () => {
      const handler = mock();
      let owner: any = {};
      
      eventBus.on('test', handler, owner);
      eventBus.emit('test', 'first');
      expect(handler).toHaveBeenCalledTimes(1);
      
      // Simulate owner being garbage collected
      // In real usage, WeakMap will handle this automatically
      eventBus.cleanupOwner(owner);
      owner = null;
      
      eventBus.emit('test', 'second');
      // Handler should not be called after cleanup
      expect(handler).toHaveBeenCalledTimes(1);
    });
    
    it('should handle multiple events for same owner', () => {
      const owner = {};
      const handler1 = mock();
      const handler2 = mock();
      const handler3 = mock();
      
      eventBus.on('event1', handler1, owner);
      eventBus.on('event2', handler2, owner);
      eventBus.on('event3', handler3, owner);
      
      eventBus.emit('event1', 'data1');
      eventBus.emit('event2', 'data2');
      eventBus.emit('event3', 'data3');
      
      expect(handler1).toHaveBeenCalledWith('data1');
      expect(handler2).toHaveBeenCalledWith('data2');
      expect(handler3).toHaveBeenCalledWith('data3');
      
      // Clean up all events for owner
      eventBus.cleanupOwner(owner);
      
      eventBus.emit('event1', 'again');
      eventBus.emit('event2', 'again');
      eventBus.emit('event3', 'again');
      
      // No handlers should be called after cleanup
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
    });
    
    it('should not affect other owners when one is cleaned up', () => {
      const owner1 = {};
      const owner2 = {};
      const handler1 = mock();
      const handler2 = mock();
      
      eventBus.on('shared-event', handler1, owner1);
      eventBus.on('shared-event', handler2, owner2);
      
      // Clean up owner1
      eventBus.cleanupOwner(owner1);
      
      eventBus.emit('shared-event', 'test');
      
      // Only handler2 should be called
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledWith('test');
    });
  });
  
  describe('backward compatibility', () => {
    it('should support subscriptions without owner (global handlers)', () => {
      const handler = mock();
      
      const unsubscribe = eventBus.on('global-event', handler);
      eventBus.emit('global-event', 'data');
      
      expect(handler).toHaveBeenCalledWith('data');
      
      // Manual unsubscribe should still work
      unsubscribe();
      eventBus.emit('global-event', 'again');
      expect(handler).toHaveBeenCalledTimes(1);
    });
    
    it('should support off() method', () => {
      const handler = mock();
      
      eventBus.on('test', handler);
      eventBus.emit('test', 'first');
      expect(handler).toHaveBeenCalledTimes(1);
      
      const removed = eventBus.off('test', handler);
      expect(removed).toBe(true);
      
      eventBus.emit('test', 'second');
      expect(handler).toHaveBeenCalledTimes(1);
    });
    
    it('should handle mixed owned and unowned subscriptions', () => {
      const owner = {};
      const ownedHandler = mock();
      const globalHandler = mock();
      
      eventBus.on('mixed', ownedHandler, owner);
      eventBus.on('mixed', globalHandler);
      
      eventBus.emit('mixed', 'test');
      expect(ownedHandler).toHaveBeenCalledWith('test');
      expect(globalHandler).toHaveBeenCalledWith('test');
      
      // Clean up owner
      eventBus.cleanupOwner(owner);
      
      eventBus.emit('mixed', 'again');
      expect(ownedHandler).toHaveBeenCalledTimes(1); // Not called again
      expect(globalHandler).toHaveBeenCalledTimes(2); // Still active
    });
  });
  
  describe('component integration', () => {
    it('should automatically clean up component subscriptions', () => {
      const host = document.createElement('div');
      const component = new MockComponent(host);
      const handler = mock();
      
      // Simulate component subscribing to events
      eventBus.on('component:event', handler, component);
      
      component.attach();
      eventBus.emit('component:event', 'data');
      expect(handler).toHaveBeenCalledWith('data');
      
      // Destroy component
      component.destroy();
      eventBus.cleanupOwner(component);
      
      // Event should not trigger handler after component is destroyed
      eventBus.emit('component:event', 'after-destroy');
      expect(handler).toHaveBeenCalledTimes(1);
    });
    
    it('should support component lifecycle with multiple subscriptions', () => {
      const host = document.createElement('div');
      const component = new MockComponent(host);
      const handler1 = mock();
      const handler2 = mock();
      const handler3 = mock();
      
      // Multiple subscriptions from same component
      eventBus.on('user:login', handler1, component);
      eventBus.on('user:logout', handler2, component);
      eventBus.on('data:update', handler3, component);
      
      // All handlers work
      eventBus.emit('user:login', { id: 1 });
      eventBus.emit('user:logout');
      eventBus.emit('data:update', { value: 42 });
      
      expect(handler1).toHaveBeenCalledWith({ id: 1 });
      expect(handler2).toHaveBeenCalled();
      expect(handler3).toHaveBeenCalledWith({ value: 42 });
      
      // Cleanup component
      component.destroy();
      eventBus.cleanupOwner(component);
      
      // No handlers should fire
      eventBus.emit('user:login', { id: 2 });
      eventBus.emit('user:logout');
      eventBus.emit('data:update', { value: 100 });
      
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('memory efficiency', () => {
    it('should remove empty event arrays', () => {
      const owner = {};
      const handler = mock();
      
      eventBus.on('temp-event', handler, owner);
      expect(eventBus.hasHandlers('temp-event')).toBe(true);
      
      eventBus.cleanupOwner(owner);
      expect(eventBus.hasHandlers('temp-event')).toBe(false);
    });
    
    it('should handle large numbers of subscriptions efficiently', () => {
      const owners: any[] = [];
      const handlers: any[] = [];
      
      // Create many subscriptions
      for (let i = 0; i < 1000; i++) {
        const owner = { id: i };
        const handler = mock();
        owners.push(owner);
        handlers.push(handler);
        eventBus.on(`event-${i % 10}`, handler, owner);
      }
      
      // Clean up half of them
      for (let i = 0; i < 500; i++) {
        eventBus.cleanupOwner(owners[i]);
      }
      
      // Emit events
      for (let i = 0; i < 10; i++) {
        eventBus.emit(`event-${i}`, 'test');
      }
      
      // Check that only non-cleaned handlers were called
      for (let i = 0; i < 500; i++) {
        expect(handlers[i]).not.toHaveBeenCalled();
      }
      for (let i = 500; i < 1000; i++) {
        expect(handlers[i]).toHaveBeenCalled();
      }
    });
  });
  
  describe('error handling', () => {
    it('should handle errors in handlers gracefully', () => {
      const owner = {};
      const goodHandler = mock();
      const badHandler = mock(() => {
        throw new Error('Handler error');
      });
      const anotherGoodHandler = mock();
      
      eventBus.on('error-test', goodHandler, owner);
      eventBus.on('error-test', badHandler, owner);
      eventBus.on('error-test', anotherGoodHandler, owner);
      
      // Should not throw
      expect(() => eventBus.emit('error-test', 'data')).not.toThrow();
      
      // Good handlers should still be called
      expect(goodHandler).toHaveBeenCalledWith('data');
      expect(badHandler).toHaveBeenCalledWith('data');
      expect(anotherGoodHandler).toHaveBeenCalledWith('data');
    });
    
    it('should validate inputs', () => {
      const owner = {};
      const handler = mock();
      
      // Invalid event names
      expect(() => eventBus.on('', handler, owner)).toThrow();
      expect(() => eventBus.on(null as any, handler, owner)).toThrow();
      
      // Invalid handlers
      expect(() => eventBus.on('test', null as any, owner)).toThrow();
      expect(() => eventBus.on('test', 'not a function' as any, owner)).toThrow();
    });
  });
  
  describe('debugging support', () => {
    it('should provide inspection methods', () => {
      const owner1 = { name: 'owner1' };
      const owner2 = { name: 'owner2' };
      
      eventBus.on('event1', () => {}, owner1);
      eventBus.on('event1', () => {}, owner2);
      eventBus.on('event2', () => {}, owner1);
      
      // Get event info
      const event1Info = eventBus.getEventInfo('event1');
      expect(event1Info.handlerCount).toBe(2);
      expect(event1Info.hasOwnedHandlers).toBe(true);
      
      // Get all events
      const allEvents = eventBus.getAllEvents();
      expect(allEvents).toContain('event1');
      expect(allEvents).toContain('event2');
      
      // Get owner info
      const owner1Info = eventBus.getOwnerInfo(owner1);
      expect(owner1Info.eventCount).toBe(2);
      expect(owner1Info.events).toContain('event1');
      expect(owner1Info.events).toContain('event2');
    });
  });
});
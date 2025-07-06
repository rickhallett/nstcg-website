import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { ManagedComponent, isManagedComponent, withManagedEvents } from './ManagedComponent';
import { Component } from './Component';
import { ManagedEventBus } from '../EventBus/ManagedEventBus';
import { StateManager } from '../StateManager';
import { EventBus } from '../EventBus';

// Mock component for testing
class TestManagedComponent extends ManagedComponent {
  render(): HTMLElement {
    const div = document.createElement('div');
    div.textContent = `Test Component: ${this.props.text || 'default'}`;
    return div;
  }
}

// Legacy component for mixin testing
class LegacyComponent extends Component {
  render(): HTMLElement {
    const div = document.createElement('div');
    div.textContent = 'Legacy Component';
    return div;
  }
}

describe('ManagedComponent', () => {
  let host: HTMLElement;
  let component: TestManagedComponent;
  let managedEventBus: ManagedEventBus;
  
  beforeEach(() => {
    // Reset singletons
    ManagedEventBus._resetInstance();
    EventBus._resetInstance();
    StateManager._resetInstance();
    
    // Create host element
    host = document.createElement('div');
    document.body.appendChild(host);
    
    // Get ManagedEventBus instance
    managedEventBus = ManagedEventBus.getInstance();
    
    // Create component
    component = new TestManagedComponent(host, { text: 'test' });
  });
  
  afterEach(() => {
    // Clean up DOM
    if (host.parentNode) {
      host.parentNode.removeChild(host);
    }
  });
  
  describe('automatic event cleanup', () => {
    it('should subscribe to events with automatic cleanup', () => {
      const handler = mock();
      
      // Subscribe to event
      component.on('test:event', handler);
      
      // Verify subscription info
      const info = component.getSubscriptionInfo();
      expect(info.eventCount).toBe(1);
      expect(info.events).toContain('test:event');
      expect(info.subscriptionCount).toBe(1);
      
      // Emit event
      managedEventBus.emit('test:event', 'data');
      expect(handler).toHaveBeenCalledWith('data');
    });
    
    it('should clean up all subscriptions on destroy', () => {
      const handler1 = mock();
      const handler2 = mock();
      const handler3 = mock();
      
      // Subscribe to multiple events
      component.on('event1', handler1);
      component.on('event2', handler2);
      component.on('event3', handler3);
      
      // Verify all handlers work
      managedEventBus.emit('event1', 'data1');
      managedEventBus.emit('event2', 'data2');
      managedEventBus.emit('event3', 'data3');
      
      expect(handler1).toHaveBeenCalledWith('data1');
      expect(handler2).toHaveBeenCalledWith('data2');
      expect(handler3).toHaveBeenCalledWith('data3');
      
      // Destroy component
      component.destroy();
      
      // Emit events again
      managedEventBus.emit('event1', 'again');
      managedEventBus.emit('event2', 'again');
      managedEventBus.emit('event3', 'again');
      
      // Handlers should not be called after destroy
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
      
      // Verify subscription info is cleared
      const info = component.getSubscriptionInfo();
      expect(info.eventCount).toBe(0);
      expect(info.events).toEqual([]);
      expect(info.subscriptionCount).toBe(0);
    });
    
    it('should support manual unsubscribe', () => {
      const handler = mock();
      
      // Subscribe and get unsubscribe function
      const unsubscribe = component.on('manual:event', handler);
      
      // Emit event
      managedEventBus.emit('manual:event', 'first');
      expect(handler).toHaveBeenCalledWith('first');
      
      // Manually unsubscribe
      unsubscribe();
      
      // Emit again
      managedEventBus.emit('manual:event', 'second');
      expect(handler).toHaveBeenCalledTimes(1);
      
      // Verify subscription was removed from tracking
      const info = component.getSubscriptionInfo();
      expect(info.eventCount).toBe(0);
      expect(info.subscriptionCount).toBe(0);
    });
    
    it('should not affect other components when destroyed', () => {
      const component2 = new TestManagedComponent(host, { text: 'component2' });
      
      const handler1 = mock();
      const handler2 = mock();
      
      // Both components subscribe to same event
      component.on('shared:event', handler1);
      component2.on('shared:event', handler2);
      
      // Destroy first component
      component.destroy();
      
      // Emit event
      managedEventBus.emit('shared:event', 'test');
      
      // Only second component's handler should be called
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledWith('test');
      
      // Clean up
      component2.destroy();
    });
  });
  
  describe('once() method', () => {
    it('should subscribe to event and auto-unsubscribe after first emission', () => {
      const handler = mock();
      
      // Subscribe with once
      component.once('once:event', handler);
      
      // First emission
      managedEventBus.emit('once:event', 'first');
      expect(handler).toHaveBeenCalledWith('first');
      
      // Second emission - handler should not be called
      managedEventBus.emit('once:event', 'second');
      expect(handler).toHaveBeenCalledTimes(1);
      
      // Verify subscription was removed
      const info = component.getSubscriptionInfo();
      expect(info.eventCount).toBe(0);
    });
    
    it('should support manual unsubscribe before emission', () => {
      const handler = mock();
      
      // Subscribe with once and get unsubscribe
      const unsubscribe = component.once('once:manual', handler);
      
      // Unsubscribe before any emission
      unsubscribe();
      
      // Emit event - handler should not be called
      managedEventBus.emit('once:manual', 'data');
      expect(handler).not.toHaveBeenCalled();
    });
  });
  
  describe('emit() method', () => {
    it('should emit events through ManagedEventBus', () => {
      const handler = mock();
      
      // Subscribe from outside
      managedEventBus.on('component:emit', handler);
      
      // Emit from component
      component.emit('component:emit', { value: 42 });
      
      expect(handler).toHaveBeenCalledWith({ value: 42 });
    });
  });
  
  describe('component lifecycle integration', () => {
    it('should handle attach and destroy lifecycle correctly', () => {
      const handler = mock();
      
      // Subscribe before attach
      component.on('lifecycle:event', handler);
      
      // Attach component
      component.attach();
      expect(host.children.length).toBe(1);
      
      // Emit event while attached
      managedEventBus.emit('lifecycle:event', 'attached');
      expect(handler).toHaveBeenCalledWith('attached');
      
      // Destroy component
      component.destroy();
      expect(host.children.length).toBe(0);
      
      // Emit after destroy - should not be called
      managedEventBus.emit('lifecycle:event', 'destroyed');
      expect(handler).toHaveBeenCalledTimes(1);
    });
    
    it('should handle multiple attach/destroy cycles', () => {
      const handler = mock();
      
      // First cycle
      component.on('cycle:event', handler);
      component.attach();
      managedEventBus.emit('cycle:event', 'cycle1');
      expect(handler).toHaveBeenCalledTimes(1);
      component.destroy();
      
      // Create new component for second cycle
      component = new TestManagedComponent(host, { text: 'cycle2' });
      component.on('cycle:event', handler);
      component.attach();
      managedEventBus.emit('cycle:event', 'cycle2');
      expect(handler).toHaveBeenCalledTimes(2);
      component.destroy();
      
      // No handlers should remain
      managedEventBus.emit('cycle:event', 'after');
      expect(handler).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('memory leak prevention', () => {
    it('should prevent memory leaks with many subscriptions', () => {
      const handlers: any[] = [];
      
      // Create many subscriptions
      for (let i = 0; i < 100; i++) {
        const handler = mock();
        handlers.push(handler);
        component.on(`event-${i}`, handler);
      }
      
      // Verify all subscriptions work
      const info = component.getSubscriptionInfo();
      expect(info.eventCount).toBe(100);
      expect(info.subscriptionCount).toBe(100);
      
      // Destroy component
      component.destroy();
      
      // Emit all events
      for (let i = 0; i < 100; i++) {
        managedEventBus.emit(`event-${i}`, 'test');
      }
      
      // No handlers should be called
      handlers.forEach(handler => {
        expect(handler).not.toHaveBeenCalled();
      });
      
      // Verify all subscriptions are cleaned
      const finalInfo = component.getSubscriptionInfo();
      expect(finalInfo.eventCount).toBe(0);
      expect(finalInfo.subscriptionCount).toBe(0);
    });
  });
  
  describe('type guard', () => {
    it('should correctly identify ManagedComponent instances', () => {
      const managedComponent = new TestManagedComponent(host);
      const legacyComponent = new LegacyComponent(host);
      
      expect(isManagedComponent(managedComponent)).toBe(true);
      expect(isManagedComponent(legacyComponent)).toBe(false);
      expect(isManagedComponent({})).toBe(false);
      expect(isManagedComponent(null)).toBe(false);
    });
  });
  
  describe('withManagedEvents mixin', () => {
    it('should enhance legacy components with managed events', () => {
      const EnhancedLegacy = withManagedEvents(LegacyComponent);
      const enhanced = new EnhancedLegacy(host);
      
      const handler = mock();
      
      // Should have managed event methods
      enhanced.on('mixin:event', handler);
      
      // Emit event
      managedEventBus.emit('mixin:event', 'data');
      expect(handler).toHaveBeenCalledWith('data');
      
      // Should have getSubscriptionInfo
      const info = enhanced.getSubscriptionInfo();
      expect(info.eventCount).toBe(1);
      expect(info.events).toContain('mixin:event');
      
      // Destroy should clean up
      enhanced.destroy();
      managedEventBus.emit('mixin:event', 'after-destroy');
      expect(handler).toHaveBeenCalledTimes(1);
    });
    
    it('should support once() in mixin', () => {
      const EnhancedLegacy = withManagedEvents(LegacyComponent);
      const enhanced = new EnhancedLegacy(host);
      
      const handler = mock();
      
      enhanced.once('mixin:once', handler);
      
      managedEventBus.emit('mixin:once', 'first');
      managedEventBus.emit('mixin:once', 'second');
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('first');
      
      enhanced.destroy();
    });
  });
  
  describe('error handling', () => {
    it('should handle errors in event handlers gracefully', () => {
      const goodHandler = mock();
      const badHandler = mock(() => {
        throw new Error('Handler error');
      });
      const anotherGoodHandler = mock();
      
      // Subscribe multiple handlers
      component.on('error:test', goodHandler);
      component.on('error:test', badHandler);
      component.on('error:test', anotherGoodHandler);
      
      // Should not throw when emitting
      expect(() => component.emit('error:test', 'data')).not.toThrow();
      
      // Good handlers should still be called
      expect(goodHandler).toHaveBeenCalledWith('data');
      expect(badHandler).toHaveBeenCalledWith('data');
      expect(anotherGoodHandler).toHaveBeenCalledWith('data');
    });
  });
});
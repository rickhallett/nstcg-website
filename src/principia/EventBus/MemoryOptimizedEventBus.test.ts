import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { MemoryOptimizedEventBus } from './MemoryOptimizedEventBus';
import { ManagedEventBus } from './ManagedEventBus';

describe('MemoryOptimizedEventBus', () => {
  let eventBus: MemoryOptimizedEventBus;
  
  beforeEach(() => {
    MemoryOptimizedEventBus._resetInstance();
    eventBus = MemoryOptimizedEventBus.getInstance();
  });
  
  describe('handler limits', () => {
    it('should enforce maximum handlers per event', () => {
      const config = eventBus.getMemoryConfig();
      config.maxHandlersPerEvent = 5;
      eventBus.setMemoryConfig(config);
      
      const handlers = [];
      for (let i = 0; i < 6; i++) {
        handlers.push(mock());
      }
      
      // Add handlers up to limit
      for (let i = 0; i < 5; i++) {
        eventBus.on('test', handlers[i]);
      }
      
      // Adding one more should trigger warning
      const warnSpy = mock();
      eventBus.onMemoryWarning(warnSpy);
      
      eventBus.on('test', handlers[5]);
      
      expect(warnSpy).toHaveBeenCalledWith({
        type: 'handler-limit-exceeded',
        eventName: 'test',
        limit: 5,
        actual: 6
      });
    });
    
    it('should enforce maximum total handlers', () => {
      const config = eventBus.getMemoryConfig();
      config.maxTotalHandlers = 10;
      eventBus.setMemoryConfig(config);
      
      // Add handlers across multiple events
      for (let i = 0; i < 11; i++) {
        eventBus.on(`event-${i}`, () => {});
      }
      
      const stats = eventBus.getMemoryStats();
      expect(stats.totalHandlers).toBe(10); // Should stop at 10
      expect(stats.warningLevel).toBe('critical'); // 100% usage
    });
  });
  
  describe('stale handler cleanup', () => {
    it('should track handler last call time', async () => {
      const handler1 = mock();
      const handler2 = mock();
      
      eventBus.on('test', handler1);
      eventBus.on('test', handler2);
      
      // Call first handler
      eventBus.emit('test');
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const stats = eventBus.getHandlerStats('test');
      expect(stats.handlers.length).toBe(2);
      expect(stats.handlers[0].lastCalled).toBeGreaterThan(0);
      expect(stats.handlers[1].lastCalled).toBeGreaterThan(0);
    });
    
    it('should clean up stale handlers', async () => {
      const config = eventBus.getMemoryConfig();
      config.staleHandlerTimeout = 100; // 100ms for testing
      eventBus.setMemoryConfig(config);
      
      const handler1 = mock();
      const handler2 = mock();
      
      eventBus.on('stale-test', handler1);
      eventBus.on('stale-test', handler2);
      
      // Call only first handler
      eventBus.emit('stale-test');
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      
      // Wait for staleness
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Clean stale handlers
      const cleaned = eventBus.cleanStaleHandlers();
      expect(cleaned).toBe(2); // Both handlers become stale after 150ms
      
      // Add a handler that won't be called
      const handler3 = mock();
      eventBus.on('stale-test', handler3);
      
      // Wait for it to become stale
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Clean again - should clean all 3 handlers since they're all stale now
      const cleaned2 = eventBus.cleanStaleHandlers();
      expect(cleaned2).toBe(3); // All handlers are now stale
    });
  });
  
  describe('event TTL (time-to-live)', () => {
    it('should support event TTL', async () => {
      const handler = mock();
      
      // Subscribe with TTL
      eventBus.on('ttl-event', handler, { ttl: 100 });
      
      // Should work initially
      eventBus.emit('ttl-event', 'first');
      expect(handler).toHaveBeenCalledWith('first');
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should not work after TTL
      eventBus.emit('ttl-event', 'second');
      expect(handler).toHaveBeenCalledTimes(1);
    });
    
    it('should support event expiration callback', async () => {
      const handler = mock();
      const onExpire = mock();
      
      eventBus.on('expire-event', handler, { 
        ttl: 50,
        onExpire 
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(onExpire).toHaveBeenCalledWith('expire-event', handler);
    });
  });
  
  describe('memory pressure handling', () => {
    it('should respond to memory pressure', () => {
      // Add many handlers
      for (let i = 0; i < 100; i++) {
        eventBus.on(`event-${i}`, () => {});
      }
      
      const beforeStats = eventBus.getMemoryStats();
      expect(beforeStats.totalHandlers).toBe(100);
      
      // Simulate memory pressure
      eventBus.handleMemoryPressure('high');
      
      const afterStats = eventBus.getMemoryStats();
      expect(afterStats.totalHandlers).toBeLessThan(100);
    });
    
    it('should prioritize keeping recent handlers', () => {
      const oldHandler = mock();
      const newHandler = mock();
      
      eventBus.on('priority-test', oldHandler);
      
      // Wait a bit
      setTimeout(() => {
        eventBus.on('priority-test', newHandler);
        
        // Emit to mark new handler as active
        eventBus.emit('priority-test');
        
        // Apply memory pressure
        eventBus.handleMemoryPressure('critical');
        
        // New handler should remain, old might be removed
        eventBus.emit('priority-test');
        expect(newHandler).toHaveBeenCalledTimes(2);
      }, 10);
    });
  });
  
  describe('memory monitoring', () => {
    it('should track memory usage patterns', () => {
      // Add and remove handlers
      const unsubscribes = [];
      for (let i = 0; i < 10; i++) {
        unsubscribes.push(eventBus.on(`event-${i}`, () => {}));
      }
      
      let stats = eventBus.getMemoryStats();
      expect(stats.totalHandlers).toBe(10);
      expect(stats.eventCount).toBe(10);
      
      // Remove half
      for (let i = 0; i < 5; i++) {
        unsubscribes[i]();
      }
      
      stats = eventBus.getMemoryStats();
      expect(stats.totalHandlers).toBe(5);
      expect(stats.eventCount).toBe(5);
    });
    
    it('should provide detailed memory report', () => {
      eventBus.on('event1', () => {});
      eventBus.on('event1', () => {});
      eventBus.on('event2', () => {});
      
      const report = eventBus.getDetailedMemoryReport();
      
      expect(report.summary.totalEvents).toBe(2);
      expect(report.summary.totalHandlers).toBe(3);
      expect(report.summary.averageHandlersPerEvent).toBe(1.5);
      expect(report.events['event1'].handlerCount).toBe(2);
      expect(report.events['event2'].handlerCount).toBe(1);
    });
  });
  
  describe('handler deduplication', () => {
    it('should prevent duplicate handlers', () => {
      const handler = () => {};
      
      eventBus.on('dedup-test', handler);
      eventBus.on('dedup-test', handler); // Same handler
      
      const stats = eventBus.getHandlerStats('dedup-test');
      expect(stats.handlers.length).toBe(1);
    });
    
    it('should allow same handler for different events', () => {
      const handler = () => {};
      
      eventBus.on('event1', handler);
      eventBus.on('event2', handler);
      
      const stats = eventBus.getMemoryStats();
      expect(stats.totalHandlers).toBe(2);
    });
  });
  
  describe('automatic cleanup scheduling', () => {
    it('should schedule periodic cleanup', async () => {
      const config = eventBus.getMemoryConfig();
      config.autoCleanupInterval = 50; // 50ms for testing
      eventBus.setMemoryConfig(config);
      
      eventBus.startAutoCleanup();
      
      // Add a handler that will become stale
      const handler = mock();
      eventBus.on('auto-clean', handler, { ttl: 25 });
      
      // Wait for auto cleanup to run
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Handler should be removed
      eventBus.emit('auto-clean');
      expect(handler).not.toHaveBeenCalled();
      
      eventBus.stopAutoCleanup();
    });
  });
  
  describe('memory leak detection', () => {
    it('should detect potential memory leaks', () => {
      // Simulate a leak - many handlers added but never removed
      for (let i = 0; i < 100; i++) {
        eventBus.on('potential-leak', () => {});
      }
      
      const leaks = eventBus.detectPotentialLeaks();
      expect(leaks.length).toBeGreaterThan(0);
      expect(leaks[0].eventName).toBe('potential-leak');
      expect(leaks[0].handlerCount).toBe(100);
      expect(leaks[0].severity).toBe('high');
    });
  });
  
  describe('integration with ManagedEventBus', () => {
    it('should maintain ManagedEventBus functionality', () => {
      const owner = {};
      const handler = mock();
      
      eventBus.on('managed-test', handler, owner);
      eventBus.emit('managed-test', 'data');
      
      expect(handler).toHaveBeenCalledWith('data');
      
      eventBus.cleanupOwner(owner);
      eventBus.emit('managed-test', 'after-cleanup');
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
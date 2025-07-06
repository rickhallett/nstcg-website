import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { PerformanceMonitor, MetricType } from './PerformanceMonitor';
import { EventBus } from '../EventBus/EventBus';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;
  let eventBus: EventBus;
  
  beforeEach(() => {
    PerformanceMonitor.resetInstance();
    eventBus = EventBus.getInstance();
    monitor = PerformanceMonitor.getInstance({ 
      enabled: true,
      reportInterval: 1000000 // Disable auto-reporting for tests
    });
  });
  
  describe('basic measurements', () => {
    it('should measure component render time', async () => {
      const id = monitor.startMeasurement(
        MetricType.COMPONENT_RENDER,
        'TestComponent',
        { props: { id: 1 } }
      );
      
      // Simulate render time
      await new Promise(resolve => setTimeout(resolve, 10));
      
      monitor.endMeasurement(id);
      
      const metrics = monitor.getMetrics();
      expect(metrics.length).toBe(1);
      expect(metrics[0].type).toBe(MetricType.COMPONENT_RENDER);
      expect(metrics[0].name).toBe('TestComponent');
      expect(metrics[0].duration).toBeGreaterThan(5);
    });
    
    it('should add marks to measurements', async () => {
      const id = monitor.startMeasurement(MetricType.API_CALL, 'fetchUser');
      
      await new Promise(resolve => setTimeout(resolve, 5));
      monitor.mark(id, 'auth');
      
      await new Promise(resolve => setTimeout(resolve, 5));
      monitor.mark(id, 'response');
      
      monitor.endMeasurement(id);
      
      const metrics = monitor.getMetrics();
      expect(metrics[0].marks).toBeDefined();
      expect(metrics[0].marks!.auth).toBeGreaterThan(0);
      expect(metrics[0].marks!.response).toBeGreaterThan(metrics[0].marks!.auth);
    });
    
    it('should measure async functions', async () => {
      const asyncFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'result';
      };
      
      const result = await monitor.measure(
        MetricType.CUSTOM,
        'asyncOperation',
        asyncFn,
        { context: 'test' }
      );
      
      expect(result).toBe('result');
      
      const metrics = monitor.getMetrics();
      expect(metrics.length).toBe(1);
      expect(metrics[0].metadata?.success).toBe(true);
    });
    
    it('should track failed operations', async () => {
      const failingFn = async () => {
        throw new Error('Test error');
      };
      
      try {
        await monitor.measure(
          MetricType.API_CALL,
          'failingCall',
          failingFn
        );
      } catch (e) {
        // Expected
      }
      
      const metrics = monitor.getMetrics();
      expect(metrics.length).toBe(1);
      expect(metrics[0].metadata?.success).toBe(false);
      expect(metrics[0].metadata?.error).toBe('Test error');
    });
  });
  
  describe('threshold warnings', () => {
    it('should emit slow event for operations exceeding threshold', async () => {
      const slowHandler = mock();
      eventBus.on('performance:slow', slowHandler);
      
      PerformanceMonitor.resetInstance();
      monitor = PerformanceMonitor.getInstance({
        thresholds: {
          componentRender: 5
        },
        enableWarnings: true
      });
      
      const id = monitor.startMeasurement(
        MetricType.COMPONENT_RENDER,
        'SlowComponent'
      );
      
      await new Promise(resolve => setTimeout(resolve, 10));
      monitor.endMeasurement(id);
      
      expect(slowHandler).toHaveBeenCalled();
      expect(slowHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MetricType.COMPONENT_RENDER,
          name: 'SlowComponent'
        })
      );
    });
    
    it('should respect custom thresholds', () => {
      monitor = PerformanceMonitor.getInstance({
        thresholds: {
          custom: {
            'heavyOperation': 100
          }
        }
      });
      
      const id = monitor.startMeasurement(
        MetricType.CUSTOM,
        'heavyOperation'
      );
      
      // Should not warn for 50ms
      monitor.endMeasurement(id, { duration: 50 });
    });
  });
  
  describe('metrics summary', () => {
    it('should calculate average durations by type', async () => {
      // Add multiple measurements with actual timing
      for (let i = 0; i < 3; i++) {
        const id = monitor.startMeasurement(
          MetricType.COMPONENT_RENDER,
          `Component${i}`
        );
        // Simulate different durations
        await new Promise(resolve => setTimeout(resolve, 5 + i * 2));
        monitor.endMeasurement(id);
      }
      
      const summary = monitor.getSummary();
      expect(summary.totalEntries).toBe(3);
      expect(summary.avgDuration[MetricType.COMPONENT_RENDER]).toBeGreaterThan(0);
    });
    
    it('should identify slow entries', async () => {
      PerformanceMonitor.resetInstance();
      monitor = PerformanceMonitor.getInstance({
        thresholds: {
          apiCall: 5 // Very low threshold
        }
      });
      
      // Fast call
      let id = monitor.startMeasurement(MetricType.API_CALL, 'fast');
      await new Promise(resolve => setTimeout(resolve, 1));
      monitor.endMeasurement(id);
      
      // Slow call
      id = monitor.startMeasurement(MetricType.API_CALL, 'slow');
      await new Promise(resolve => setTimeout(resolve, 10));
      monitor.endMeasurement(id);
      
      const summary = monitor.getSummary();
      expect(summary.slowEntries.length).toBeGreaterThan(0);
    });
    
    it('should calculate error rate', async () => {
      // Success
      await monitor.measure(MetricType.API_CALL, 'call1', async () => 'ok');
      
      // Failure
      try {
        await monitor.measure(MetricType.API_CALL, 'call2', async () => {
          throw new Error('fail');
        });
      } catch {}
      
      // Another success
      await monitor.measure(MetricType.API_CALL, 'call3', async () => 'ok');
      
      const summary = monitor.getSummary();
      expect(summary.errorRate).toBeCloseTo(0.333, 2); // 1/3 failed
    });
  });
  
  describe('decorator', () => {
    it('should work as method decorator', async () => {
      const decorator = monitor.createDecorator(MetricType.API_CALL, 'UserService');
      
      class UserService {
        @decorator
        async getUser(id: number) {
          await new Promise(resolve => setTimeout(resolve, 10));
          return { id, name: 'Test' };
        }
      }
      
      const service = new UserService();
      const user = await service.getUser(1);
      
      expect(user).toEqual({ id: 1, name: 'Test' });
      
      const metrics = monitor.getMetrics();
      expect(metrics.length).toBe(1);
      expect(metrics[0].name).toBe('UserService.getUser');
      expect(metrics[0].metadata?.className).toBe('UserService');
    });
  });
  
  describe('state management', () => {
    it('should clear metrics', () => {
      const id = monitor.startMeasurement(MetricType.CUSTOM, 'test');
      monitor.endMeasurement(id);
      
      expect(monitor.getMetrics().length).toBe(1);
      
      monitor.clear();
      expect(monitor.getMetrics().length).toBe(0);
    });
    
    it('should enable/disable monitoring', () => {
      monitor.setEnabled(false);
      
      const id = monitor.startMeasurement(MetricType.CUSTOM, 'test');
      expect(id).toBe(''); // Should return empty ID when disabled
      
      monitor.endMeasurement(id);
      expect(monitor.getMetrics().length).toBe(0);
      
      monitor.setEnabled(true);
      const id2 = monitor.startMeasurement(MetricType.CUSTOM, 'test2');
      expect(id2).not.toBe('');
      monitor.endMeasurement(id2);
      expect(monitor.getMetrics().length).toBe(1);
    });
    
    it('should maintain max entries limit', () => {
      PerformanceMonitor.resetInstance();
      monitor = PerformanceMonitor.getInstance({
        maxEntries: 5
      });
      
      // Add 10 measurements
      for (let i = 0; i < 10; i++) {
        const id = monitor.startMeasurement(MetricType.CUSTOM, `test${i}`);
        monitor.endMeasurement(id);
      }
      
      const metrics = monitor.getMetrics();
      expect(metrics.length).toBe(5);
      expect(metrics[0].name).toBe('test5'); // Oldest entries removed
    });
  });
  
  describe('event integration', () => {
    it('should emit performance entries', () => {
      const entryHandler = mock();
      eventBus.on('performance:entry', entryHandler);
      
      const id = monitor.startMeasurement(MetricType.CUSTOM, 'test');
      monitor.endMeasurement(id);
      
      expect(entryHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MetricType.CUSTOM,
          name: 'test'
        })
      );
    });
    
    it('should monitor component renders via events', async () => {
      eventBus.emit('component:render', {
        name: 'MyComponent',
        props: { id: 1 }
      });
      
      // Wait for async measurement
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const metrics = monitor.getMetrics();
      expect(metrics.length).toBe(1);
      expect(metrics[0].type).toBe(MetricType.COMPONENT_RENDER);
      expect(metrics[0].name).toBe('MyComponent');
    });
    
    it('should monitor state changes via events', async () => {
      eventBus.emit('state:changed', {
        path: 'user.name',
        value: 'John'
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const metrics = monitor.getMetrics();
      expect(metrics.length).toBe(1);
      expect(metrics[0].type).toBe(MetricType.STATE_CHANGE);
      expect(metrics[0].name).toBe('user.name');
    });
  });
});
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ServiceRegistry } from './ServiceRegistry';
import type { IService } from '../IService';

describe('ServiceRegistry', () => {
  let registry: ServiceRegistry;

  beforeEach(() => {
    ServiceRegistry._resetInstance();
    registry = ServiceRegistry.getInstance();
  });

  it('should be a singleton', () => {
    const instance2 = ServiceRegistry.getInstance();
    expect(registry).toBe(instance2);
  });

  it('should register and start all services', async () => {
    const service1: IService = {
      start: mock().mockResolvedValue(undefined),
      stop: mock().mockResolvedValue(undefined)
    };
    const service2: IService = {
      start: mock().mockResolvedValue(undefined),
      stop: mock().mockResolvedValue(undefined)
    };

    registry.register('service1', service1);
    registry.register('service2', service2);
    
    await registry.startAll();
    
    expect(service1.start).toHaveBeenCalled();
    expect(service2.start).toHaveBeenCalled();
  });

  it('should register and stop all services in reverse order', async () => {
    const callOrder: string[] = [];
    const service1: IService = {
      start: mock().mockResolvedValue(undefined),
      stop: mock().mockImplementation(async () => {
        callOrder.push('service1');
      })
    };
    const service2: IService = {
      start: mock().mockResolvedValue(undefined),
      stop: mock().mockImplementation(async () => {
        callOrder.push('service2');
      })
    };

    registry.register('service1', service1);
    registry.register('service2', service2);
    
    await registry.stopAll();
    
    expect(service1.stop).toHaveBeenCalled();
    expect(service2.stop).toHaveBeenCalled();
    expect(callOrder).toEqual(['service2', 'service1']); // Reverse order
  });

  it('should throw error when registering duplicate service name', () => {
    const service: IService = {
      start: mock().mockResolvedValue(undefined),
      stop: mock().mockResolvedValue(undefined)
    };

    registry.register('service1', service);
    
    expect(() => registry.register('service1', service)).toThrow(
      "Service 'service1' is already registered"
    );
  });

  it('should get a registered service by name', () => {
    const service: IService = {
      start: mock().mockResolvedValue(undefined),
      stop: mock().mockResolvedValue(undefined)
    };

    registry.register('testService', service);
    
    expect(registry.get('testService')).toBe(service);
    expect(registry.get('nonExistent')).toBeUndefined();
  });

  it('should check if a service is registered', () => {
    const service: IService = {
      start: mock().mockResolvedValue(undefined),
      stop: mock().mockResolvedValue(undefined)
    };

    registry.register('testService', service);
    
    expect(registry.has('testService')).toBe(true);
    expect(registry.has('nonExistent')).toBe(false);
  });
});
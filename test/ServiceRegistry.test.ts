// test/ServiceRegistry.test.ts
import { describe, it, expect, createMock } from '../src/PrincipiaTest';
import { ServiceRegistry } from '../src/ServiceRegistry';
import { IService } from '../src/IService';

describe('ServiceRegistry', () => {
    it('should register and start all services', async () => {
        const service1 = createMock(['start', 'stop']);
        const service2 = createMock(['start', 'stop']);
        const registry = new ServiceRegistry();
        registry.register(service1 as unknown as IService);
        registry.register(service2 as unknown as IService);
        await registry.startAll();
        expect(service1.start).toHaveBeenCalled();
        expect(service2.start).toHaveBeenCalled();
    });

    it('should register and stop all services', async () => {
        const service1 = createMock(['start', 'stop']);
        const service2 = createMock(['start', 'stop']);
        const registry = new ServiceRegistry();
        registry.register(service1 as unknown as IService);
        registry.register(service2 as unknown as IService);
        await registry.stopAll();
        expect(service1.stop).toHaveBeenCalled();
        expect(service2.stop).toHaveBeenCalled();
    });
});

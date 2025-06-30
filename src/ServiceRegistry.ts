// src/ServiceRegistry.ts
import { IService } from './IService';

export class ServiceRegistry {
    private services: IService[] = [];

    register(service: IService) {
        this.services.push(service);
    }

    async startAll() {
        for (const service of this.services) {
            await service.start();
        }
    }

    async stopAll() {
        for (const service of this.services) {
            await service.stop();
        }
    }
}

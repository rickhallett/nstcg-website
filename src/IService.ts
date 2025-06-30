// src/IService.ts
export interface IService {
    start(): Promise<void>;
    stop(): Promise<void>;
}

import type { IService } from '../IService';
import type { LoggerService } from '../LoggerService';

/**
 * ServiceRegistry - Manages the lifecycle of all services in the application
 * Follows Principia.js architectural canon: Services are Sentinels
 */
export class ServiceRegistry {
  private static instance: ServiceRegistry | null = null;
  private services: Map<string, IService> = new Map();
  private startOrder: string[] = [];
  private logger: LoggerService | null = null;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    if (ServiceRegistry.instance) {
      throw new Error('Use getInstance() instead');
    }
  }

  /**
   * Get the singleton instance of ServiceRegistry
   * @returns The singleton instance
   */
  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  /**
   * Reset the singleton instance (for testing purposes only)
   * @private
   */
  static _resetInstance(): void {
    ServiceRegistry.instance = null;
  }

  /**
   * Set the logger for the registry
   * @param logger The LoggerService instance
   */
  setLogger(logger: LoggerService): void {
    this.logger = logger;
  }

  /**
   * Register a service with a unique name
   * @param name Unique identifier for the service
   * @param service The service instance implementing IService
   */
  register(name: string, service: IService): void {
    if (this.services.has(name)) {
      throw new Error(`Service '${name}' is already registered`);
    }
    this.services.set(name, service);
    this.startOrder.push(name);
    this.logger?.info(`Service registered: ${name}`);
  }

  /**
   * Get a registered service by name
   * @param name The service name
   * @returns The service instance or undefined
   */
  get<T extends IService>(name: string): T | undefined {
    return this.services.get(name) as T | undefined;
  }

  /**
   * Check if a service is registered
   * @param name The service name
   * @returns True if the service is registered
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Start all registered services in order
   * @returns Promise that resolves when all services are started
   */
  async startAll(): Promise<void> {
    this.logger?.info('Starting all services...');
    
    for (const name of this.startOrder) {
      const service = this.services.get(name);
      if (service) {
        try {
          this.logger?.info(`Starting service: ${name}`);
          await service.start();
          this.logger?.info(`Service started: ${name}`);
        } catch (error) {
          this.logger?.error(`Failed to start service: ${name}`, error);
          throw new Error(`Failed to start service '${name}': ${error}`);
        }
      }
    }
    
    this.logger?.info('All services started successfully');
  }

  /**
   * Stop all registered services in reverse order
   * @returns Promise that resolves when all services are stopped
   */
  async stopAll(): Promise<void> {
    this.logger?.info('Stopping all services...');
    
    // Stop in reverse order
    const stopOrder = [...this.startOrder].reverse();
    
    for (const name of stopOrder) {
      const service = this.services.get(name);
      if (service) {
        try {
          this.logger?.info(`Stopping service: ${name}`);
          await service.stop();
          this.logger?.info(`Service stopped: ${name}`);
        } catch (error) {
          this.logger?.error(`Failed to stop service: ${name}`, error);
          // Continue stopping other services even if one fails
        }
      }
    }
    
    this.logger?.info('All services stopped');
  }

  /**
   * Get all registered service names
   * @returns Array of service names
   */
  getServiceNames(): string[] {
    return [...this.startOrder];
  }

  /**
   * Clear all registered services
   */
  clear(): void {
    this.services.clear();
    this.startOrder = [];
  }
}
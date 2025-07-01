/**
 * Base interface for all Principia services
 * 
 * Defines the lifecycle methods that all services must implement
 * to participate in the application's startup and shutdown sequence.
 */
export interface IService {
    /**
     * Initialize and start the service
     * Called during application startup
     */
    start(): Promise<void>;
    
    /**
     * Stop and cleanup the service
     * Called during application shutdown
     */
    stop(): Promise<void>;
}
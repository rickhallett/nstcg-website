/**
 * @module app
 * @description Main entry point for the Principia.js application
 * 
 * The ignition switch that initializes all core singleton services
 * in the correct order and starts the application.
 */

import { EventBus } from '../EventBus';
import { StateManager } from '../StateManager';
import { LoggerService } from '../LoggerService';
import { ErrorHandlerService } from '../ErrorHandlerService';
import { Router } from '../Router';
import { ApiService } from '../ApiService';
import { NotionService } from '../NotionService';
import { UserModel } from '../UserModel';
import { ParticipantModel } from '../ParticipantModel';

/**
 * Application configuration
 */
export interface AppConfig {
  apiUrl: string;
  notionToken: string;
  notionDatabaseId: string;
  routes: Record<string, { view: string; handler?: Function }>;
  initialState: Record<string, any>;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Application instance
 */
export interface App {
  destroy: () => Promise<void>;
}

/**
 * Initialize the application
 * 
 * @param config Application configuration
 * @returns Application instance
 */
export async function initializeApp(config: AppConfig): Promise<App> {
  try {
    // Validate configuration
    if (!config.apiUrl) {
      throw new Error('API URL is required');
    }
    if (!config.notionToken) {
      throw new Error('Notion token is required');
    }
    if (!config.notionDatabaseId) {
      throw new Error('Notion database ID is required');
    }
    
    // 1. Initialize core services
    const eventBus = EventBus.getInstance();
    const stateManager = StateManager.getInstance();
    const logger = LoggerService.getInstance();
    const errorHandler = ErrorHandlerService.getInstance(eventBus, logger);
    
    // Configure logger
    if (config.logLevel) {
      logger.setLevel(config.logLevel);
    }
    
    logger.info('Initializing Principia.js application');
    
    // 2. Initialize state
    stateManager.initialize(config.initialState);
    
    // 3. Initialize error handling
    errorHandler.init();
    
    // 4. Initialize API services
    const apiService = new ApiService({
      eventBus,
      logger,
      baseURL: config.apiUrl
    });
    await apiService.start();
    
    const notionService = new NotionService({
      apiService,
      token: config.notionToken,
      databaseId: config.notionDatabaseId
    });
    
    // 5. Initialize models
    const userModel = new UserModel({ notionService, stateManager, eventBus });
    const participantModel = new ParticipantModel({ notionService, stateManager, eventBus });
    
    // 6. Initialize router
    const router = new Router({ 
      eventBus, 
      logger,
      contentSelector: '#main-content'
    });
    
    // Add routes
    for (const [path, routeConfig] of Object.entries(config.routes)) {
      router.addRoute(path, routeConfig.handler || (() => {
        logger.debug(`Route handler for ${path} - view: ${routeConfig.view}`);
      }));
    }
    
    // Start router
    await router.start();
    
    logger.info('Application initialized successfully');
    
    // Return app instance with destroy method
    return {
      destroy: async () => {
        logger.info('Destroying application');
        await router.stop();
        await apiService.stop();
        // Note: ErrorHandlerService and other singletons don't have destroy methods but could be added if needed
      }
    };
    
  } catch (error) {
    console.error('Failed to initialize application:', error);
    throw error;
  }
}

// Auto-initialize when DOM is ready (for browser environment)
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
    // Check if there's a global config
    const config = (window as any).__PRINCIPIA_CONFIG__;
    
    if (config) {
      try {
        const app = await initializeApp(config);
        // Make app available globally for debugging
        (window as any).__PRINCIPIA_APP__ = app;
      } catch (error) {
        console.error('Failed to auto-initialize application:', error);
      }
    }
  });
}

// Export for use in other environments
export default { initializeApp };
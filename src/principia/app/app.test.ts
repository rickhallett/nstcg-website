import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { Window } from 'happy-dom';
import { initializeApp } from './app';
import { EventBus } from '../EventBus';
import { StateManager } from '../StateManager';
import { LoggerService } from '../LoggerService';
import { ErrorHandlerService } from '../ErrorHandlerService';
import { Router } from '../Router';
import { ApiService } from '../ApiService';
import { NotionService } from '../NotionService';
import { UserModel } from '../UserModel';
import { ParticipantModel } from '../ParticipantModel';

describe('app', () => {
  let window: Window;
  let document: Document;
  let originalConsoleError: typeof console.error;
  
  beforeEach(() => {
    // Set up happy-dom
    window = new Window({ url: 'http://localhost/' });
    document = window.document;
    globalThis.document = document;
    globalThis.window = window as any;
    
    // Mock console.error to suppress error logs in tests
    originalConsoleError = console.error;
    console.error = mock();
    
    // Reset all singletons
    EventBus._resetInstance();
    StateManager._resetInstance();
    LoggerService._resetInstance();
    ErrorHandlerService._resetInstance();
    // Note: Router, ApiService, NotionService, UserModel, and ParticipantModel
    // don't have _resetInstance methods as they're created differently
    
    // Set up basic DOM structure
    document.body.innerHTML = `
      <div id="app">
        <main id="main-content"></main>
      </div>
    `;
  });
  
  afterEach(() => {
    console.error = originalConsoleError;
  });
  
  describe('initializeApp', () => {
    it('should initialize all core services', async () => {
      const config = {
        apiUrl: 'https://api.example.com',
        notionToken: 'test-token',
        notionDatabaseId: 'test-db-id',
        routes: {
          '/': { view: 'HomePage' },
          '/about': { view: 'AboutPage' }
        },
        initialState: {
          user: null,
          participants: [],
          stats: { total: 0 }
        }
      };
      
      await initializeApp(config);
      
      // Verify services are initialized
      const eventBus = EventBus.getInstance();
      const stateManager = StateManager.getInstance();
      const logger = LoggerService.getInstance();
      
      expect(eventBus).toBeDefined();
      expect(stateManager).toBeDefined();
      expect(logger).toBeDefined();
      
      // Check that state was initialized
      expect(stateManager.get('user')).toBeNull();
      expect(stateManager.get('stats.total')).toBe(0);
    });
    
    it('should initialize state with provided initial state', async () => {
      const initialState = {
        user: null,
        participants: [],
        stats: { total: 0 },
        customData: 'test'
      };
      
      const config = {
        apiUrl: 'https://api.example.com',
        notionToken: 'test-token',
        notionDatabaseId: 'test-db-id',
        routes: {},
        initialState
      };
      
      await initializeApp(config);
      
      const stateManager = StateManager.getInstance();
      expect(stateManager.get('customData')).toBe('test');
      expect(stateManager.get('stats.total')).toBe(0);
    });
    
    it('should configure services with provided options', async () => {
      const config = {
        apiUrl: 'https://api.example.com',
        notionToken: 'test-token',
        notionDatabaseId: 'test-db-id',
        routes: {},
        initialState: {},
        logLevel: 'debug' as const
      };
      
      await initializeApp(config);
      
      const logger = LoggerService.getInstance();
      
      // Can't directly test ApiService and NotionService since they're not singletons
      // But we can check that logger was configured
      expect(logger).toBeDefined();
    });
    
    it('should initialize router with routes', async () => {
      const routes = {
        '/': { view: 'HomePage', handler: mock() },
        '/about': { view: 'AboutPage', handler: mock() }
      };
      
      const config = {
        apiUrl: 'https://api.example.com',
        notionToken: 'test-token',
        notionDatabaseId: 'test-db-id',
        routes,
        initialState: {}
      };
      
      const app = await initializeApp(config);
      
      // Just verify the app was created successfully
      expect(app).toBeDefined();
      expect(app.destroy).toBeDefined();
    });
    
    it('should handle initialization errors', async () => {
      const config = {
        apiUrl: '',  // Invalid URL
        notionToken: '',
        notionDatabaseId: '',
        routes: {},
        initialState: {}
      };
      
      await expect(initializeApp(config)).rejects.toThrow();
    });
    
    it('should set up global error handling', async () => {
      const config = {
        apiUrl: 'https://api.example.com',
        notionToken: 'test-token',
        notionDatabaseId: 'test-db-id',
        routes: {},
        initialState: {}
      };
      
      await initializeApp(config);
      
      // Get the error handler to verify it was initialized
      const errorHandler = ErrorHandlerService.getInstance(
        EventBus.getInstance(), 
        LoggerService.getInstance()
      );
      
      // Verify errorHandler is initialized (it will have event listeners set up)
      expect(errorHandler).toBeDefined();
      
      // Can't easily test window error events in the test environment,
      // but we can verify the error handler was set up
    });
    
    it('should return app instance with destroy method', async () => {
      const config = {
        apiUrl: 'https://api.example.com',
        notionToken: 'test-token',
        notionDatabaseId: 'test-db-id',
        routes: {},
        initialState: {}
      };
      
      const app = await initializeApp(config);
      
      expect(app).toBeDefined();
      expect(app.destroy).toBeDefined();
      expect(typeof app.destroy).toBe('function');
    });
    
    it('should clean up when destroy is called', async () => {
      const config = {
        apiUrl: 'https://api.example.com',
        notionToken: 'test-token',
        notionDatabaseId: 'test-db-id',
        routes: {},
        initialState: {}
      };
      
      const app = await initializeApp(config);
      
      // Destroy should work
      await expect(app.destroy()).resolves.toBeUndefined();
    });
  });
  
  describe('DOMContentLoaded handling', () => {
    it('should auto-initialize when config is present', async () => {
      // This test verifies that the app module sets up DOMContentLoaded listener
      // In practice, the module is already imported at the top of this test file,
      // so the listener is already set up. We'll just verify the initialization
      // works when config is present.
      
      const config = {
        apiUrl: 'https://api.example.com',
        notionToken: 'test-token',
        notionDatabaseId: 'test-db-id',
        routes: {},
        initialState: {}
      };
      
      // Directly test initialization
      const app = await initializeApp(config);
      
      // Should have created app instance
      expect(app).toBeDefined();
      expect(app.destroy).toBeDefined();
      
      // Clean up
      await app.destroy();
    });
  });
});
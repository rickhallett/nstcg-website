import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { Window } from 'happy-dom';
import { HomePage } from './HomePage';
import { EventBus } from '../EventBus';
import { StateManager } from '../StateManager';
import { LoggerService } from '../LoggerService';
import { UserModel } from '../UserModel';
import { ParticipantModel } from '../ParticipantModel';
import type { Component } from '../Component';

// Mock component class for testing
class MockComponent {
  constructor(public host: HTMLElement, public props: any) {}
  attach = mock();
  destroy = mock();
}

describe('HomePage', () => {
  let window: Window;
  let document: Document;
  let homePage: HomePage;
  let eventBus: EventBus;
  let stateManager: StateManager;
  let logger: LoggerService;
  let userModel: UserModel;
  let participantModel: ParticipantModel;
  
  beforeEach(() => {
    // Set up happy-dom
    window = new Window({ url: 'http://localhost/' });
    document = window.document;
    globalThis.document = document;
    globalThis.window = window as any;
    
    // Reset singletons
    EventBus._resetInstance();
    StateManager._resetInstance();
    LoggerService._resetInstance();
    
    // Get instances
    eventBus = EventBus.getInstance();
    stateManager = StateManager.getInstance();
    logger = LoggerService.getInstance();
    
    // Initialize state
    stateManager.initialize({
      user: null,
      participants: [],
      stats: { total: 0 }
    });
    
    // Create mock models
    userModel = {
      register: mock(() => Promise.resolve({ id: '123', email: 'test@example.com' })),
      login: mock(() => Promise.resolve({ id: '123', email: 'test@example.com' }))
    } as any;
    
    participantModel = {
      getAll: mock(() => Promise.resolve([]))
    } as any;
    
    // Set up DOM structure
    document.body.innerHTML = `
      <div id="signup-form">
        <div id="signup-form-container"></div>
      </div>
      <div id="stats-counter">
        <div id="stats-counter-container"></div>
      </div>
    `;
  });
  
  afterEach(() => {
    if (homePage) {
      homePage.destroy();
    }
  });
  
  describe('constructor', () => {
    it('should initialize with required dependencies', () => {
      homePage = new HomePage({
        eventBus,
        stateManager,
        logger,
        userModel,
        participantModel
      });
      
      expect(homePage).toBeDefined();
    });
  });
  
  describe('init', () => {
    it('should initialize components when DOM elements exist', async () => {
      // Create HomePage with mocked component constructors
      const mockFormComponent = mock((host: HTMLElement, props: any) => new MockComponent(host, props));
      const mockCounterComponent = mock((host: HTMLElement, props: any) => new MockComponent(host, props));
      
      homePage = new HomePage({
        eventBus,
        stateManager,
        logger,
        userModel,
        participantModel,
        components: {
          FormComponent: mockFormComponent,
          CounterComponent: mockCounterComponent
        }
      });
      
      await homePage.init();
      
      // Should have created components
      expect(mockFormComponent).toHaveBeenCalledTimes(1);
      expect(mockCounterComponent).toHaveBeenCalledTimes(1);
      
      // Should have attached components
      const formInstance = mockFormComponent.mock.results[0].value;
      const counterInstance = mockCounterComponent.mock.results[0].value;
      
      expect(formInstance.attach).toHaveBeenCalled();
      expect(counterInstance.attach).toHaveBeenCalled();
    });
    
    it('should set up event listeners', async () => {
      const handlers: Record<string, Function[]> = {};
      const mockEventBus = {
        on: mock((event: string, handler: Function) => {
          if (!handlers[event]) handlers[event] = [];
          handlers[event].push(handler);
        }),
        off: mock(),
        emit: mock()
      };
      
      homePage = new HomePage({
        eventBus: mockEventBus as any,
        stateManager,
        logger,
        userModel,
        participantModel
      });
      
      await homePage.init();
      
      // Should listen for form submit events
      expect(mockEventBus.on).toHaveBeenCalledWith('form:submit', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('user:registered', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('user:error', expect.any(Function));
    });
    
    it('should log initialization', async () => {
      const infoSpy = mock();
      logger.info = infoSpy;
      
      homePage = new HomePage({
        eventBus,
        stateManager,
        logger,
        userModel,
        participantModel
      });
      
      await homePage.init();
      
      expect(infoSpy).toHaveBeenCalledWith('HomePage initialized');
    });
  });
  
  describe('event handling', () => {
    beforeEach(async () => {
      homePage = new HomePage({
        eventBus,
        stateManager,
        logger,
        userModel,
        participantModel
      });
      
      await homePage.init();
    });
    
    it('should handle form:submit event', async () => {
      const formData = {
        email: 'test@example.com',
        name: 'Test User'
      };
      
      // Trigger form submit event
      eventBus.emit('form:submit', formData);
      
      // Should call userModel.register
      expect(userModel.register).toHaveBeenCalledWith(formData);
    });
    
    it('should update state after successful registration', async () => {
      const formData = {
        email: 'test@example.com',
        name: 'Test User'
      };
      
      const setSpy = mock();
      stateManager.set = setSpy;
      
      // Trigger form submit
      eventBus.emit('form:submit', formData);
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should update user state
      expect(setSpy).toHaveBeenCalledWith('user', { 
        id: '123', 
        email: 'test@example.com' 
      });
    });
    
    it('should emit success event after registration', async () => {
      const emitCalls: Array<[string, any]> = [];
      const mockEventBus = {
        on: eventBus.on.bind(eventBus),
        off: eventBus.off.bind(eventBus),
        emit: mock((event: string, data: any) => {
          emitCalls.push([event, data]);
          eventBus.emit(event, data);
        })
      };
      
      homePage = new HomePage({
        eventBus: mockEventBus as any,
        stateManager,
        logger,
        userModel,
        participantModel
      });
      
      await homePage.init();
      
      const formData = {
        email: 'test@example.com',
        name: 'Test User'
      };
      
      // Manually call the handler
      await homePage['handleFormSubmit'](formData);
      
      // Should emit user:registered event
      const registeredCall = emitCalls.find(([event]) => event === 'user:registered');
      expect(registeredCall).toBeDefined();
      expect(registeredCall![1]).toEqual({ 
        id: '123', 
        email: 'test@example.com' 
      });
    });
    
    it('should handle registration errors', async () => {
      const error = new Error('Registration failed');
      userModel.register = mock(() => Promise.reject(error));
      
      const errorSpy = mock();
      logger.error = errorSpy;
      
      const emitCalls: Array<[string, any]> = [];
      const mockEventBus = {
        on: eventBus.on.bind(eventBus),
        off: eventBus.off.bind(eventBus),
        emit: mock((event: string, data: any) => {
          emitCalls.push([event, data]);
        })
      };
      
      homePage = new HomePage({
        eventBus: mockEventBus as any,
        stateManager,
        logger,
        userModel,
        participantModel
      });
      
      await homePage.init();
      
      const formData = {
        email: 'test@example.com',
        name: 'Test User'
      };
      
      // Manually call the handler
      await homePage['handleFormSubmit'](formData);
      
      // Should log error
      expect(errorSpy).toHaveBeenCalledWith('Registration error', { error });
      
      // Should emit error event
      const errorCall = emitCalls.find(([event]) => event === 'user:error');
      expect(errorCall).toBeDefined();
      expect(errorCall![1]).toEqual({ 
        message: 'Registration failed',
        error 
      });
    });
  });
  
  describe('destroy', () => {
    it('should clean up components', async () => {
      const mockFormComponent = mock((host: HTMLElement, props: any) => new MockComponent(host, props));
      const mockCounterComponent = mock((host: HTMLElement, props: any) => new MockComponent(host, props));
      
      homePage = new HomePage({
        eventBus,
        stateManager,
        logger,
        userModel,
        participantModel,
        components: {
          FormComponent: mockFormComponent,
          CounterComponent: mockCounterComponent
        }
      });
      
      await homePage.init();
      
      const formInstance = mockFormComponent.mock.results[0].value;
      const counterInstance = mockCounterComponent.mock.results[0].value;
      
      homePage.destroy();
      
      // Should destroy all components
      expect(formInstance.destroy).toHaveBeenCalled();
      expect(counterInstance.destroy).toHaveBeenCalled();
    });
    
    it('should remove event listeners', async () => {
      const offCalls: Array<[string, Function]> = [];
      const mockEventBus = {
        on: eventBus.on.bind(eventBus),
        off: mock((event: string, handler: Function) => {
          offCalls.push([event, handler]);
        }),
        emit: eventBus.emit.bind(eventBus)
      };
      
      homePage = new HomePage({
        eventBus: mockEventBus as any,
        stateManager,
        logger,
        userModel,
        participantModel
      });
      
      await homePage.init();
      homePage.destroy();
      
      // Should remove event listeners
      const events = offCalls.map(([event]) => event);
      expect(events).toContain('form:submit');
      expect(events).toContain('user:registered');
      expect(events).toContain('user:error');
    });
    
    it('should log destruction', async () => {
      const infoSpy = mock();
      logger.info = infoSpy;
      
      homePage = new HomePage({
        eventBus,
        stateManager,
        logger,
        userModel,
        participantModel
      });
      
      await homePage.init();
      homePage.destroy();
      
      expect(infoSpy).toHaveBeenCalledWith('HomePage destroyed');
    });
  });
  
  describe('edge cases', () => {
    it('should handle missing DOM elements gracefully', async () => {
      // Remove the signup form container from DOM
      document.getElementById('signup-form-container')?.remove();
      document.getElementById('stats-counter-container')?.remove();
      
      homePage = new HomePage({
        eventBus,
        stateManager,
        logger,
        userModel,
        participantModel
      });
      
      // Should not throw
      await expect(homePage.init()).resolves.toBeUndefined();
    });
    
    it('should handle component initialization errors', async () => {
      const errorComponent = mock(() => {
        throw new Error('Component error');
      });
      
      const errorSpy = mock();
      logger.error = errorSpy;
      
      homePage = new HomePage({
        eventBus,
        stateManager,
        logger,
        userModel,
        participantModel,
        components: {
          FormComponent: errorComponent
        }
      });
      
      await homePage.init();
      
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to initialize component', 
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });
});
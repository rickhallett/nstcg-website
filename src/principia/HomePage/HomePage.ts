/**
 * @module HomePage
 * @description View controller for the home page
 * 
 * Orchestrates components and coordinates with models for the home page functionality.
 * Follows Principia.js architectural canon:
 * - Views are the Conductors
 * - Components are Dumb Artisans
 * - Events are the Messengers
 */

import type { EventBus } from '../EventBus';
import type { StateManager } from '../StateManager';
import type { LoggerService } from '../LoggerService';
import type { UserModel } from '../UserModel';
import type { ParticipantModel } from '../ParticipantModel';
import type { Component } from '../Component';

/**
 * HomePage configuration
 */
export interface HomePageConfig {
  eventBus: EventBus;
  stateManager: StateManager;
  logger: LoggerService;
  userModel: UserModel;
  participantModel: ParticipantModel;
  components?: {
    FormComponent?: any;
    CounterComponent?: any;
  };
}

/**
 * HomePage view controller
 * 
 * Manages the home page view, coordinating between components and models
 */
export class HomePage {
  private eventBus: EventBus;
  private stateManager: StateManager;
  private logger: LoggerService;
  private userModel: UserModel;
  private participantModel: ParticipantModel;
  private components: Component[] = [];
  private componentClasses: HomePageConfig['components'];
  private eventHandlers: Map<string, Function> = new Map();
  
  /**
   * Create a new HomePage instance
   * 
   * @param config HomePage configuration
   */
  constructor(config: HomePageConfig) {
    this.eventBus = config.eventBus;
    this.stateManager = config.stateManager;
    this.logger = config.logger;
    this.userModel = config.userModel;
    this.participantModel = config.participantModel;
    this.componentClasses = config.components || {};
  }
  
  /**
   * Initialize the home page
   */
  async init(): Promise<void> {
    try {
      // Initialize components
      this.initializeComponents();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Load initial data
      await this.loadInitialData();
      
      this.logger.info('HomePage initialized');
    } catch (error) {
      this.logger.error('HomePage initialization error', { error });
    }
  }
  
  /**
   * Destroy the home page
   */
  destroy(): void {
    // Destroy all components
    this.components.forEach(component => {
      component.destroy();
    });
    this.components = [];
    
    // Remove event listeners
    this.removeEventListeners();
    
    this.logger.info('HomePage destroyed');
  }
  
  /**
   * Initialize components
   * 
   * @private
   */
  private initializeComponents(): void {
    // Initialize signup form component
    if (this.componentClasses.FormComponent) {
      const formContainer = document.getElementById('signup-form')?.querySelector('#signup-form-container');
      if (formContainer) {
        try {
          const formComponent = new this.componentClasses.FormComponent(
            formContainer as HTMLElement,
            {
              fields: [
                { name: 'email', type: 'email', required: true },
                { name: 'name', type: 'text', required: true }
              ],
              submitText: 'Join Waiting List'
            }
          );
          formComponent.attach();
          this.components.push(formComponent);
        } catch (error) {
          this.logger.error('Failed to initialize component', { 
            component: 'FormComponent', 
            error 
          });
        }
      }
    }
    
    // Initialize counter component
    if (this.componentClasses.CounterComponent) {
      const counterContainer = document.getElementById('stats-counter')?.querySelector('#stats-counter-container');
      if (counterContainer) {
        try {
          const counterComponent = new this.componentClasses.CounterComponent(
            counterContainer as HTMLElement,
            {
              statePath: 'stats.total',
              label: 'Participants'
            }
          );
          counterComponent.attach();
          this.components.push(counterComponent);
        } catch (error) {
          this.logger.error('Failed to initialize component', { 
            component: 'CounterComponent', 
            error 
          });
        }
      }
    }
  }
  
  /**
   * Set up event listeners
   * 
   * @private
   */
  private setupEventListeners(): void {
    // Handle form submissions
    const formSubmitHandler = this.handleFormSubmit.bind(this);
    this.eventBus.on('form:submit', formSubmitHandler);
    this.eventHandlers.set('form:submit', formSubmitHandler);
    
    // Handle user registration success
    const registeredHandler = this.handleUserRegistered.bind(this);
    this.eventBus.on('user:registered', registeredHandler);
    this.eventHandlers.set('user:registered', registeredHandler);
    
    // Handle errors
    const errorHandler = this.handleError.bind(this);
    this.eventBus.on('user:error', errorHandler);
    this.eventHandlers.set('user:error', errorHandler);
  }
  
  /**
   * Remove event listeners
   * 
   * @private
   */
  private removeEventListeners(): void {
    this.eventHandlers.forEach((handler, event) => {
      this.eventBus.off(event, handler);
    });
    this.eventHandlers.clear();
  }
  
  /**
   * Load initial data
   * 
   * @private
   */
  private async loadInitialData(): Promise<void> {
    try {
      // Load participants count
      const participants = await this.participantModel.getAll();
      this.stateManager.set('stats.total', participants.length);
    } catch (error) {
      this.logger.error('Failed to load initial data', { error });
    }
  }
  
  /**
   * Handle form submission
   * 
   * @private
   */
  private async handleFormSubmit(data: any): Promise<void> {
    try {
      this.logger.debug('Form submitted', { data });
      
      // Register user
      const user = await this.userModel.register(data);
      
      // Update state
      this.stateManager.set('user', user);
      
      // Emit success event
      this.eventBus.emit('user:registered', user);
      
    } catch (error) {
      this.logger.error('Registration error', { error });
      this.eventBus.emit('user:error', {
        message: 'Registration failed',
        error
      });
    }
  }
  
  /**
   * Handle successful user registration
   * 
   * @private
   */
  private handleUserRegistered(user: any): void {
    this.logger.info('User registered successfully', { userId: user.id });
    
    // Update participant count
    const currentTotal = this.stateManager.get('stats.total') || 0;
    this.stateManager.set('stats.total', currentTotal + 1);
    
    // Show success message (would emit event for notification component)
    this.eventBus.emit('notification:show', {
      type: 'success',
      message: 'Welcome to the waiting list!'
    });
  }
  
  /**
   * Handle errors
   * 
   * @private
   */
  private handleError(error: any): void {
    this.logger.error('User error event', { error });
    
    // Show error notification
    this.eventBus.emit('notification:show', {
      type: 'error',
      message: error.message || 'Something went wrong'
    });
  }
}
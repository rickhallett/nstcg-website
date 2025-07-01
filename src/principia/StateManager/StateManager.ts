/**
 * StateManager - The single source of truth for application state
 * Follows Principia.js architectural canon: The State is Singular
 */
import type { EventBus } from '../EventBus';

export class StateManager {
  private static instance: StateManager | null = null;
  private state: any = {};
  private subscribers: Map<string, Set<Function>> = new Map();
  private eventBus: EventBus | null = null;
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    if (StateManager.instance) {
      throw new Error('Use getInstance() instead');
    }
  }
  
  /**
   * Get the singleton instance of StateManager
   * @returns The singleton instance
   */
  static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }
  
  /**
   * Reset the singleton instance (for testing purposes only)
   * @private
   */
  static _resetInstance(): void {
    StateManager.instance = null;
  }
  
  /**
   * Set the EventBus instance for state change notifications
   * @param eventBus The EventBus instance
   */
  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }
  
  /**
   * Initialize the state with initial data
   * @param initialState The initial state object
   */
  initialize(initialState: any): void {
    this.state = this.deepClone(initialState);
    this.emitStateChange('state:initialized', this.state);
  }
  
  /**
   * Deep clone helper to prevent mutation
   * @param obj Object to clone
   * @returns Deep cloned object
   * @private
   */
  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (Array.isArray(obj)) return obj.map(item => this.deepClone(item));
    
    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }

  /**
   * Get a value from the state by path
   * @param path Dot-notation path (e.g., 'user.profile.name')
   * @returns Deep cloned value at path, or entire state if no path
   */
  get(path?: string): any {
    if (!path) {
      return this.deepClone(this.state);
    }
    
    const keys = path.split('.');
    let current = this.state;
    for (const key of keys) {
      if (current == null) return undefined;
      current = current[key];
    }
    return this.deepClone(current);
  }
  
  /**
   * Set a value in the state at the given path
   * @param path Dot-notation path
   * @param value Value to set (will be deep cloned)
   */
  set(path: string, value: any): void {
    const keys = path.split('.');
    let current = this.state;
    
    // Navigate to the parent of the target
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    // Set the value
    const lastKey = keys[keys.length - 1];
    current[lastKey] = this.deepClone(value);
    
    // Emit state change event
    this.emitStateChange('state:changed', {
      path: path,
      value: value
    });
    
    // Notify path-specific subscribers
    this.notifySubscribers(path, value);
  }
  
  /**
   * Update multiple paths in a single batch
   * @param updates Object with paths as keys and values to set
   */
  update(updates: Record<string, any>): void {
    // Apply all updates without emitting individual events
    for (const [path, value] of Object.entries(updates)) {
      const keys = path.split('.');
      let current = this.state;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in current) || typeof current[key] !== 'object') {
          current[key] = {};
        }
        current = current[key];
      }
      
      const lastKey = keys[keys.length - 1];
      current[lastKey] = this.deepClone(value);
    }
    
    // Emit single batch change event
    this.emitStateChange('state:batch-changed', updates);
    
    // Notify subscribers for each path
    for (const [path, value] of Object.entries(updates)) {
      this.notifySubscribers(path, value);
    }
  }
  
  /**
   * Subscribe to changes at a specific path
   * @param path Dot-notation path to watch
   * @param handler Function to call when path changes
   * @returns Unsubscribe function
   */
  subscribe(path: string, handler: Function): Function {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, new Set());
    }
    this.subscribers.get(path)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.subscribers.get(path);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.subscribers.delete(path);
        }
      }
    };
  }
  
  /**
   * Notify subscribers of a path change
   * @param path The path that changed
   * @param value The new value
   * @private
   */
  private notifySubscribers(path: string, value: any): void {
    const handlers = this.subscribers.get(path);
    if (handlers) {
      handlers.forEach(handler => handler(value));
    }
  }
  
  /**
   * Emit state change event via EventBus if available
   * @param eventName The event name
   * @param data The event data
   * @private
   */
  private emitStateChange(eventName: string, data: any): void {
    if (this.eventBus) {
      this.eventBus.emit(eventName, data);
    }
  }
  
  /**
   * Reset the state (useful for testing)
   */
  reset(): void {
    this.state = {};
    this.subscribers.clear();
  }
}
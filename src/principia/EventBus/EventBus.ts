/**
 * @module EventBus
 * @singleton
 * @architecture Events are the Messengers - All module communication happens through EventBus
 * 
 * EventBus is a singleton event management system that enables decoupled communication
 * between modules in the Principia.js architecture. No module should directly import
 * or reference another module; all communication flows through events.
 */

/**
 * Type definition for event handler functions
 */
export type EventHandler = (payload?: any) => void;

/**
 * Type definition for event names
 */
export type EventName = string;

/**
 * Map type for storing event handlers
 */
type EventRegistry = Map<EventName, EventHandler[]>;

/**
 * EventBus - Singleton event management system for decoupled module communication
 * 
 * @class EventBus
 * @singleton
 */
export class EventBus {
  private static instance: EventBus | null = null;
  private events: EventRegistry;

  /**
   * Private constructor to enforce singleton pattern
   * @private
   */
  private constructor() {
    this.events = new Map<EventName, EventHandler[]>();
  }

  /**
   * Get the singleton instance of EventBus
   * 
   * @static
   * @returns {EventBus} The singleton EventBus instance
   * 
   * @example
   * const eventBus = EventBus.getInstance();
   */
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
      // Freeze the instance to prevent modification
      Object.freeze(EventBus.instance);
    }
    return EventBus.instance;
  }

  /**
   * Reset the singleton instance (for testing purposes only)
   * 
   * @static
   * @private
   */
  public static _resetInstance(): void {
    EventBus.instance = null;
  }

  /**
   * Subscribe to an event with a handler function
   * 
   * @param {EventName} eventName - The name of the event to subscribe to
   * @param {EventHandler} handler - The handler function to call when the event is emitted
   * @returns {() => void} Unsubscribe function that removes the handler when called
   * 
   * @throws {Error} If eventName is empty or handler is not a function
   * 
   * @example
   * const unsubscribe = eventBus.on('user:login', (userData) => {
   *   console.log('User logged in:', userData);
   * });
   * 
   * // Later, to unsubscribe:
   * unsubscribe();
   */
  public on(eventName: EventName, handler: EventHandler): () => void {
    // Validate parameters
    if (!eventName || typeof eventName !== 'string') {
      throw new Error('Event name must be a non-empty string');
    }
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }

    // Get or create handler array for this event
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }
    
    const handlers = this.events.get(eventName)!;
    handlers.push(handler);

    // Return unsubscribe function
    return () => {
      const currentHandlers = this.events.get(eventName);
      if (currentHandlers) {
        const index = currentHandlers.indexOf(handler);
        if (index > -1) {
          currentHandlers.splice(index, 1);
          // Clean up empty arrays
          if (currentHandlers.length === 0) {
            this.events.delete(eventName);
          }
        }
      }
    };
  }

  /**
   * Emit an event with optional payload data
   * 
   * @param {EventName} eventName - The name of the event to emit
   * @param {any} [payload] - Optional data to pass to event handlers
   * 
   * @example
   * eventBus.emit('user:login', { userId: 123, username: 'john' });
   */
  public emit(eventName: EventName, payload?: any): void {
    // Validate event name
    if (!eventName || typeof eventName !== 'string') {
      return; // Silently return for invalid event names
    }

    const handlers = this.events.get(eventName);
    if (!handlers || handlers.length === 0) {
      return; // No handlers, return silently
    }

    // Call each handler with try-catch to prevent one handler's error from stopping others
    handlers.forEach(handler => {
      try {
        handler(payload);
      } catch (error) {
        console.error(`Error in event handler for '${eventName}':`, error);
      }
    });
  }

  /**
   * Remove a specific handler from an event
   * 
   * @param {EventName} eventName - The name of the event
   * @param {EventHandler} handler - The handler function to remove
   * @returns {boolean} True if the handler was found and removed, false otherwise
   * 
   * @example
   * const success = eventBus.off('user:login', myHandler);
   */
  public off(eventName: EventName, handler: EventHandler): boolean {
    if (!eventName || typeof eventName !== 'string' || typeof handler !== 'function') {
      return false;
    }

    const handlers = this.events.get(eventName);
    if (!handlers) {
      return false;
    }

    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      // Clean up empty arrays
      if (handlers.length === 0) {
        this.events.delete(eventName);
      }
      return true;
    }

    return false;
  }
}

/**
 * EventBus Interface for type definitions
 */
export interface EventBusInterface {
  getInstance(): EventBus;
  on(eventName: EventName, handler: EventHandler): () => void;
  emit(eventName: EventName, payload?: any): void;
  off(eventName: EventName, handler: EventHandler): boolean;
}
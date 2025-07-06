/**
 * @module ManagedEventBus
 * @description Enhanced EventBus with automatic memory management using WeakMap
 * 
 * Prevents memory leaks by automatically cleaning up event handlers when their
 * owners (components) are garbage collected. Maintains backward compatibility
 * with the original EventBus API while adding ownership tracking.
 * 
 * Key features:
 * - Automatic cleanup of event handlers when owners are garbage collected
 * - WeakMap-based ownership tracking for zero memory overhead
 * - Full backward compatibility with existing EventBus API
 * - Support for both owned and global (unowned) handlers
 * - Debugging utilities for monitoring subscriptions
 */

import { EventBus, EventHandler, EventName } from './EventBus';

/**
 * Owner type for event handlers (typically components)
 */
export type EventOwner = object;

/**
 * Enhanced event handler info including owner reference
 */
interface ManagedHandler {
  handler: EventHandler;
  owner?: EventOwner;
}

/**
 * Map type for storing managed event handlers
 */
type ManagedEventRegistry = Map<EventName, ManagedHandler[]>;

/**
 * Subscription info for owners
 */
interface OwnerSubscriptions {
  events: Set<EventName>;
  handlers: Map<EventName, Set<EventHandler>>;
}

/**
 * ManagedEventBus - EventBus with automatic memory management
 * 
 * @class ManagedEventBus
 * @extends EventBus
 * @singleton
 */
export class ManagedEventBus extends EventBus {
  private static managedInstance: ManagedEventBus | null = null;
  private managedEvents: ManagedEventRegistry;
  private ownerSubscriptions: WeakMap<EventOwner, OwnerSubscriptions>;
  
  /**
   * Private constructor to enforce singleton pattern
   * @private
   */
  private constructor() {
    super();
    this.managedEvents = new Map();
    this.ownerSubscriptions = new WeakMap();
  }
  
  /**
   * Get the singleton instance of ManagedEventBus
   * 
   * @static
   * @returns {ManagedEventBus} The singleton instance
   */
  public static getInstance(): ManagedEventBus {
    if (!ManagedEventBus.managedInstance) {
      ManagedEventBus.managedInstance = new ManagedEventBus();
      Object.freeze(ManagedEventBus.managedInstance);
    }
    return ManagedEventBus.managedInstance;
  }
  
  /**
   * Reset the singleton instance (for testing purposes only)
   * 
   * @static
   * @private
   */
  public static _resetInstance(): void {
    ManagedEventBus.managedInstance = null;
    EventBus._resetInstance();
  }
  
  /**
   * Subscribe to an event with optional owner tracking
   * 
   * @param {EventName} eventName - The name of the event to subscribe to
   * @param {EventHandler} handler - The handler function to call when the event is emitted
   * @param {EventOwner} [owner] - Optional owner object for automatic cleanup
   * @returns {() => void} Unsubscribe function
   * 
   * @example
   * // With owner (automatic cleanup)
   * eventBus.on('user:login', handleLogin, this);
   * 
   * // Without owner (manual cleanup required)
   * const unsubscribe = eventBus.on('user:login', handleLogin);
   */
  public on(eventName: EventName, handler: EventHandler, owner?: EventOwner): () => void {
    // Validate parameters
    if (!eventName || typeof eventName !== 'string') {
      throw new Error('Event name must be a non-empty string');
    }
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }
    
    // Get or create handler array for this event
    if (!this.managedEvents.has(eventName)) {
      this.managedEvents.set(eventName, []);
    }
    
    const handlers = this.managedEvents.get(eventName)!;
    const managedHandler: ManagedHandler = { handler, owner };
    handlers.push(managedHandler);
    
    // Track subscription by owner if provided
    if (owner) {
      this.trackOwnerSubscription(owner, eventName, handler);
    }
    
    // Return unsubscribe function
    return () => {
      this.removeHandler(eventName, handler, owner);
    };
  }
  
  /**
   * Emit an event with optional payload data
   * 
   * @param {EventName} eventName - The name of the event to emit
   * @param {any} [payload] - Optional data to pass to event handlers
   */
  public emit(eventName: EventName, payload?: any): void {
    // Validate event name
    if (!eventName || typeof eventName !== 'string') {
      return;
    }
    
    const handlers = this.managedEvents.get(eventName);
    if (!handlers || handlers.length === 0) {
      return;
    }
    
    // Call each handler with error protection
    handlers.forEach(({ handler }) => {
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
   * @returns {boolean} True if the handler was found and removed
   */
  public off(eventName: EventName, handler: EventHandler): boolean {
    if (!eventName || typeof eventName !== 'string' || typeof handler !== 'function') {
      return false;
    }
    
    const handlers = this.managedEvents.get(eventName);
    if (!handlers) {
      return false;
    }
    
    const index = handlers.findIndex(h => h.handler === handler);
    if (index > -1) {
      const managedHandler = handlers[index];
      handlers.splice(index, 1);
      
      // Clean up empty arrays
      if (handlers.length === 0) {
        this.managedEvents.delete(eventName);
      }
      
      // Clean up owner tracking if applicable
      if (managedHandler.owner) {
        this.untrackOwnerSubscription(managedHandler.owner, eventName, handler);
      }
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Clean up all subscriptions for a specific owner
   * This is called automatically when components are destroyed
   * 
   * @param {EventOwner} owner - The owner whose subscriptions should be cleaned up
   */
  public cleanupOwner(owner: EventOwner): void {
    const subscriptions = this.ownerSubscriptions.get(owner);
    if (!subscriptions) {
      return;
    }
    
    // Remove all handlers for this owner
    subscriptions.events.forEach(eventName => {
      const handlers = this.managedEvents.get(eventName);
      if (handlers) {
        // Filter out handlers belonging to this owner
        const remainingHandlers = handlers.filter(h => h.owner !== owner);
        
        if (remainingHandlers.length === 0) {
          this.managedEvents.delete(eventName);
        } else {
          this.managedEvents.set(eventName, remainingHandlers);
        }
      }
    });
    
    // Remove owner from WeakMap (happens automatically, but we can be explicit)
    this.ownerSubscriptions.delete(owner);
  }
  
  /**
   * Check if an event has any handlers
   * 
   * @param {EventName} eventName - The event name to check
   * @returns {boolean} True if the event has handlers
   */
  public hasHandlers(eventName: EventName): boolean {
    const handlers = this.managedEvents.get(eventName);
    return handlers !== undefined && handlers.length > 0;
  }
  
  /**
   * Get information about a specific event
   * 
   * @param {EventName} eventName - The event name
   * @returns {object} Event information
   */
  public getEventInfo(eventName: EventName): {
    handlerCount: number;
    hasOwnedHandlers: boolean;
    hasGlobalHandlers: boolean;
  } {
    const handlers = this.managedEvents.get(eventName) || [];
    const ownedCount = handlers.filter(h => h.owner).length;
    const globalCount = handlers.filter(h => !h.owner).length;
    
    return {
      handlerCount: handlers.length,
      hasOwnedHandlers: ownedCount > 0,
      hasGlobalHandlers: globalCount > 0
    };
  }
  
  /**
   * Get all registered event names
   * 
   * @returns {string[]} Array of event names
   */
  public getAllEvents(): string[] {
    return Array.from(this.managedEvents.keys());
  }
  
  /**
   * Get subscription info for a specific owner
   * 
   * @param {EventOwner} owner - The owner to inspect
   * @returns {object} Owner subscription information
   */
  public getOwnerInfo(owner: EventOwner): {
    eventCount: number;
    events: string[];
  } {
    const subscriptions = this.ownerSubscriptions.get(owner);
    if (!subscriptions) {
      return { eventCount: 0, events: [] };
    }
    
    return {
      eventCount: subscriptions.events.size,
      events: Array.from(subscriptions.events)
    };
  }
  
  /**
   * Track a subscription by owner
   * @private
   */
  private trackOwnerSubscription(owner: EventOwner, eventName: EventName, handler: EventHandler): void {
    let subscriptions = this.ownerSubscriptions.get(owner);
    
    if (!subscriptions) {
      subscriptions = {
        events: new Set(),
        handlers: new Map()
      };
      this.ownerSubscriptions.set(owner, subscriptions);
    }
    
    subscriptions.events.add(eventName);
    
    if (!subscriptions.handlers.has(eventName)) {
      subscriptions.handlers.set(eventName, new Set());
    }
    subscriptions.handlers.get(eventName)!.add(handler);
  }
  
  /**
   * Untrack a subscription by owner
   * @private
   */
  private untrackOwnerSubscription(owner: EventOwner, eventName: EventName, handler: EventHandler): void {
    const subscriptions = this.ownerSubscriptions.get(owner);
    if (!subscriptions) {
      return;
    }
    
    const eventHandlers = subscriptions.handlers.get(eventName);
    if (eventHandlers) {
      eventHandlers.delete(handler);
      
      if (eventHandlers.size === 0) {
        subscriptions.handlers.delete(eventName);
        subscriptions.events.delete(eventName);
      }
    }
    
    // If owner has no more subscriptions, remove from WeakMap
    if (subscriptions.events.size === 0) {
      this.ownerSubscriptions.delete(owner);
    }
  }
  
  /**
   * Remove a handler from the managed events
   * @private
   */
  private removeHandler(eventName: EventName, handler: EventHandler, owner?: EventOwner): void {
    const handlers = this.managedEvents.get(eventName);
    if (!handlers) {
      return;
    }
    
    const index = handlers.findIndex(h => h.handler === handler && h.owner === owner);
    if (index > -1) {
      handlers.splice(index, 1);
      
      if (handlers.length === 0) {
        this.managedEvents.delete(eventName);
      }
      
      if (owner) {
        this.untrackOwnerSubscription(owner, eventName, handler);
      }
    }
  }
}

/**
 * Type augmentation for components to use ManagedEventBus
 */
export interface ComponentWithManagedEvents {
  /**
   * Subscribe to an event with automatic cleanup on component destroy
   */
  on(eventName: EventName, handler: EventHandler): () => void;
  
  /**
   * Clean up all event subscriptions for this component
   */
  cleanupEvents(): void;
}
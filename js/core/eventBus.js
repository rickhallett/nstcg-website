/**
 * EventBus - Cross-component event communication system
 * @module EventBus
 */

class EventBus {
  constructor() {
    this._events = new Map();
    this._onceEvents = new Map();
    this._eventHistory = [];
    this._maxHistorySize = 100;
    this._debug = false;
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   * @returns {Function} Unsubscribe function
   */
  on(event, handler) {
    if (!this._events.has(event)) {
      this._events.set(event, new Set());
    }
    
    this._events.get(event).add(handler);
    
    if (this._debug) {
      console.log(`EventBus: Subscribed to "${event}"`, handler);
    }
    
    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first emission)
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   * @returns {Function} Unsubscribe function
   */
  once(event, handler) {
    const wrappedHandler = (...args) => {
      handler(...args);
      this.off(event, wrappedHandler);
    };
    
    // Store reference for manual unsubscribe
    if (!this._onceEvents.has(event)) {
      this._onceEvents.set(event, new Map());
    }
    this._onceEvents.get(event).set(handler, wrappedHandler);
    
    return this.on(event, wrappedHandler);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function to remove
   */
  off(event, handler) {
    // Remove regular handler
    const handlers = this._events.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this._events.delete(event);
      }
    }
    
    // Remove once handler
    const onceHandlers = this._onceEvents.get(event);
    if (onceHandlers && onceHandlers.has(handler)) {
      const wrappedHandler = onceHandlers.get(handler);
      onceHandlers.delete(handler);
      this.off(event, wrappedHandler);
      
      if (onceHandlers.size === 0) {
        this._onceEvents.delete(event);
      }
    }
    
    if (this._debug) {
      console.log(`EventBus: Unsubscribed from "${event}"`, handler);
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {...*} args - Arguments to pass to handlers
   */
  emit(event, ...args) {
    // Record event in history
    this._recordEvent(event, args);
    
    const handlers = this._events.get(event);
    if (!handlers || handlers.size === 0) {
      if (this._debug) {
        console.log(`EventBus: No handlers for "${event}"`, args);
      }
      return;
    }
    
    if (this._debug) {
      console.log(`EventBus: Emitting "${event}" to ${handlers.size} handlers`, args);
    }
    
    // Execute handlers
    handlers.forEach(handler => {
      try {
        handler(...args);
      } catch (error) {
        console.error(`EventBus: Error in handler for "${event}"`, error);
      }
    });
  }

  /**
   * Alias for emit
   */
  trigger(event, ...args) {
    this.emit(event, ...args);
  }

  /**
   * Remove all handlers for an event
   * @param {string} event - Event name
   */
  clear(event) {
    this._events.delete(event);
    this._onceEvents.delete(event);
    
    if (this._debug) {
      console.log(`EventBus: Cleared all handlers for "${event}"`);
    }
  }

  /**
   * Remove all event handlers
   */
  clearAll() {
    this._events.clear();
    this._onceEvents.clear();
    this._eventHistory = [];
    
    if (this._debug) {
      console.log('EventBus: Cleared all handlers');
    }
  }

  /**
   * Get all registered events
   * @returns {string[]} Array of event names
   */
  getEvents() {
    return Array.from(this._events.keys());
  }

  /**
   * Get handler count for an event
   * @param {string} event - Event name
   * @returns {number} Number of handlers
   */
  getHandlerCount(event) {
    const handlers = this._events.get(event);
    return handlers ? handlers.size : 0;
  }

  /**
   * Check if event has handlers
   * @param {string} event - Event name
   * @returns {boolean} True if event has handlers
   */
  hasHandlers(event) {
    return this.getHandlerCount(event) > 0;
  }

  /**
   * Enable/disable debug mode
   * @param {boolean} enabled - Debug mode state
   */
  setDebug(enabled) {
    this._debug = enabled;
  }

  /**
   * Get event history
   * @returns {Array} Array of event history entries
   */
  getHistory() {
    return [...this._eventHistory];
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this._eventHistory = [];
  }

  /**
   * Record event in history
   * @private
   */
  _recordEvent(event, args) {
    this._eventHistory.push({
      event,
      args,
      timestamp: Date.now()
    });
    
    // Limit history size
    if (this._eventHistory.length > this._maxHistorySize) {
      this._eventHistory.shift();
    }
  }
}

// Create singleton instance
const eventBus = new EventBus();

// Common event names (for consistency)
export const Events = {
  // Form events
  FORM_SUBMIT: 'form:submit',
  FORM_SUCCESS: 'form:success',
  FORM_ERROR: 'form:error',
  FORM_FIELD_CHANGE: 'form:field:change',
  FORM_VALIDATION_ERROR: 'form:validation:error',
  
  // Data events
  DATA_LOADED: 'data:loaded',
  DATA_ERROR: 'data:error',
  COUNT_UPDATED: 'count:updated',
  
  // UI events
  MODAL_OPEN: 'modal:open',
  MODAL_CLOSE: 'modal:close',
  TOAST_SHOW: 'toast:show',
  TOAST_HIDE: 'toast:hide',
  SECTION_CHANGE: 'section:change',
  
  // User events
  USER_SUBMIT: 'user:submit',
  USER_UPDATE: 'user:update',
  
  // System events
  APP_READY: 'app:ready',
  APP_ERROR: 'app:error',
  NETWORK_ONLINE: 'network:online',
  NETWORK_OFFLINE: 'network:offline'
};

// Export singleton instance
export default eventBus;
export { EventBus, eventBus };
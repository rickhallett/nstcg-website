/**
 * StateManager - Centralized state management with pub/sub pattern
 * @module StateManager
 */

class StateManager {
  constructor() {
    this._state = {};
    this._subscribers = new Map();
    this._locked = false;
  }

  /**
   * Initialize the state with default values
   * @param {Object} initialState - Initial state object
   */
  initialize(initialState = {}) {
    if (this._locked) {
      console.warn('StateManager: Cannot initialize after state has been locked');
      return;
    }
    this._state = this._deepClone(initialState);
  }

  /**
   * Get a value from the state
   * @param {string} path - Dot-notation path to the value (e.g., 'user.profile.name')
   * @returns {*} The value at the specified path
   */
  get(path) {
    if (!path) return this._deepClone(this._state);
    
    const keys = path.split('.');
    let current = this._state;
    
    for (const key of keys) {
      if (current[key] === undefined) return undefined;
      current = current[key];
    }
    
    return this._deepClone(current);
  }

  /**
   * Set a value in the state
   * @param {string} path - Dot-notation path to the value
   * @param {*} value - The value to set
   */
  set(path, value) {
    if (this._locked) {
      console.warn('StateManager: State is locked and cannot be modified');
      return;
    }

    const keys = path.split('.');
    const lastKey = keys.pop();
    const newState = this._deepClone(this._state);
    
    let current = newState;
    for (const key of keys) {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    const oldValue = current[lastKey];
    current[lastKey] = this._deepClone(value);
    
    this._state = newState;
    this._notifySubscribers(path, value, oldValue);
  }

  /**
   * Update multiple values in the state
   * @param {Object} updates - Object with path-value pairs
   */
  update(updates) {
    if (this._locked) {
      console.warn('StateManager: State is locked and cannot be modified');
      return;
    }

    Object.entries(updates).forEach(([path, value]) => {
      this.set(path, value);
    });
  }

  /**
   * Subscribe to state changes
   * @param {string} path - Path to watch for changes (use '*' for all changes)
   * @param {Function} callback - Function to call when the value changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(path, callback) {
    if (!this._subscribers.has(path)) {
      this._subscribers.set(path, new Set());
    }
    
    this._subscribers.get(path).add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this._subscribers.get(path);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this._subscribers.delete(path);
        }
      }
    };
  }

  /**
   * Lock the state to prevent further modifications
   */
  lock() {
    this._locked = true;
  }

  /**
   * Unlock the state to allow modifications
   */
  unlock() {
    this._locked = false;
  }

  /**
   * Clear all state and subscribers
   */
  clear() {
    if (this._locked) {
      console.warn('StateManager: State is locked and cannot be cleared');
      return;
    }
    
    this._state = {};
    this._subscribers.clear();
  }

  /**
   * Get a snapshot of the current state
   * @returns {Object} Deep clone of the current state
   */
  getState() {
    return this._deepClone(this._state);
  }

  /**
   * Notify subscribers of state changes
   * @private
   */
  _notifySubscribers(path, newValue, oldValue) {
    // Notify specific path subscribers
    const pathSubscribers = this._subscribers.get(path);
    if (pathSubscribers) {
      pathSubscribers.forEach(callback => {
        try {
          callback(newValue, oldValue, path);
        } catch (error) {
          console.error('StateManager: Error in subscriber callback', error);
        }
      });
    }
    
    // Notify wildcard subscribers
    const wildcardSubscribers = this._subscribers.get('*');
    if (wildcardSubscribers) {
      wildcardSubscribers.forEach(callback => {
        try {
          callback(newValue, oldValue, path);
        } catch (error) {
          console.error('StateManager: Error in wildcard subscriber callback', error);
        }
      });
    }
  }

  /**
   * Deep clone an object
   * @private
   */
  _deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => this._deepClone(item));
    if (obj instanceof Object) {
      const cloned = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this._deepClone(obj[key]);
        }
      }
      return cloned;
    }
  }
}

// Create singleton instance
const stateManager = new StateManager();

// Export for ES6 modules
export default stateManager;
export { StateManager };
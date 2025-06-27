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
   * Check if a value exists at the given path
   * @param {string} path - Dot-notation path to check
   * @returns {boolean} True if the path exists and has a non-undefined value
   */
  has(path) {
    if (!path) return Object.keys(this._state).length > 0;
    
    const keys = path.split('.');
    let current = this._state;
    
    for (const key of keys) {
      if (current[key] === undefined) return false;
      current = current[key];
    }
    
    return true;
  }

  /**
   * Get preload cache status for API data
   * @param {string} apiKey - API key to check
   * @returns {Object} Cache status information
   */
  getPreloadStatus(apiKey) {
    const apiData = this.get(`api.${apiKey}`);
    const metadata = this.get(`metadata.preload.${apiKey}`) || {};
    
    return {
      isLoaded: !!apiData,
      data: apiData,
      timestamp: metadata.timestamp,
      age: metadata.timestamp ? Date.now() - metadata.timestamp : null,
      isStale: metadata.ttl ? Date.now() > (metadata.timestamp + metadata.ttl) : false,
      priority: metadata.priority || 'normal'
    };
  }

  /**
   * Set preloaded API data with metadata
   * @param {string} apiKey - API key
   * @param {*} data - API response data
   * @param {Object} options - Preload metadata options
   */
  setPreloadedData(apiKey, data, options = {}) {
    const timestamp = Date.now();
    
    // Set the actual data
    this.set(`api.${apiKey}`, data);
    
    // Set metadata for cache management
    this.set(`metadata.preload.${apiKey}`, {
      timestamp,
      ttl: options.ttl || (5 * 60 * 1000), // 5 minutes default
      priority: options.priority || 'normal',
      source: 'preload',
      retries: options.retries || 0
    });
    
    // Track preload metrics
    this._updatePreloadMetrics(apiKey, 'success');
  }

  /**
   * Mark preload as failed for tracking
   * @param {string} apiKey - API key that failed
   * @param {Error} error - Error object
   */
  markPreloadFailed(apiKey, error) {
    const timestamp = Date.now();
    
    this.set(`metadata.preload.${apiKey}`, {
      timestamp,
      failed: true,
      error: error.message,
      source: 'preload'
    });
    
    this._updatePreloadMetrics(apiKey, 'failed', error);
  }

  /**
   * Get all preloaded APIs status
   * @returns {Object} Status of all preloaded APIs
   */
  getAllPreloadStatus() {
    const apiData = this.get('api') || {};
    const metadata = this.get('metadata.preload') || {};
    
    const status = {};
    
    // Check loaded APIs
    Object.keys(apiData).forEach(apiKey => {
      status[apiKey] = this.getPreloadStatus(apiKey);
    });
    
    // Check failed APIs
    Object.keys(metadata).forEach(apiKey => {
      if (!status[apiKey]) {
        status[apiKey] = this.getPreloadStatus(apiKey);
      }
    });
    
    return status;
  }

  /**
   * Clear expired preloaded data
   */
  clearExpiredPreloads() {
    const metadata = this.get('metadata.preload') || {};
    const now = Date.now();
    
    Object.entries(metadata).forEach(([apiKey, meta]) => {
      if (meta.ttl && now > (meta.timestamp + meta.ttl)) {
        this.set(`api.${apiKey}`, null);
        this.set(`metadata.preload.${apiKey}`, null);
      }
    });
  }

  /**
   * Update preload metrics
   * @private
   */
  _updatePreloadMetrics(apiKey, status, error = null) {
    const metrics = this.get('metrics.preload') || {
      total: 0,
      success: 0,
      failed: 0,
      failures: [],
      lastUpdate: Date.now()
    };
    
    metrics.total++;
    metrics.lastUpdate = Date.now();
    
    if (status === 'success') {
      metrics.success++;
    } else if (status === 'failed') {
      metrics.failed++;
      metrics.failures.push({
        apiKey,
        error: error?.message || 'Unknown error',
        timestamp: Date.now()
      });
      
      // Keep only last 10 failures
      if (metrics.failures.length > 10) {
        metrics.failures = metrics.failures.slice(-10);
      }
    }
    
    this.set('metrics.preload', metrics);
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
  _deepClone(obj, seen = new WeakSet()) {
    if (obj === null || typeof obj !== 'object') return obj;
    
    // Check for circular references
    if (seen.has(obj)) {
      return '[Circular Reference]';
    }
    
    seen.add(obj);
    
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => this._deepClone(item, seen));
    if (obj instanceof Object) {
      const cloned = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this._deepClone(obj[key], seen);
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
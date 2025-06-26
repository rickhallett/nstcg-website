/**
 * CacheManager - Intelligent caching with stale-while-revalidate support
 * @module CacheManager
 */

class CacheManager {
  constructor() {
    this._cache = new Map();
    this._metadata = new Map();
    this._revalidationPromises = new Map();
    this._config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      staleWhileRevalidate: 30 * 60 * 1000, // 30 minutes
      maxCacheSize: 100,
      enablePersistence: true
    };
    
    this._loadFromStorage();
    this._startCleanupInterval();
  }

  /**
   * Set a value in the cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   * @param {Object} options - Additional options
   */
  set(key, value, ttl = this._config.defaultTTL, options = {}) {
    const now = Date.now();
    const metadata = {
      timestamp: now,
      ttl: ttl,
      staleWhileRevalidate: options.staleWhileRevalidate !== false,
      priority: options.priority || 'normal',
      size: this._calculateSize(value),
      accessCount: 0,
      lastAccessed: now
    };

    this._cache.set(key, this._deepClone(value));
    this._metadata.set(key, metadata);
    
    // Persist to localStorage if enabled
    if (this._config.enablePersistence) {
      this._persistToStorage(key, value, metadata);
    }
    
    // Cleanup if cache is too large
    this._enforceMaxSize();
  }

  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @param {Object} options - Get options
   * @returns {*} Cached value or null if not found/expired
   */
  get(key, options = {}) {
    const metadata = this._metadata.get(key);
    if (!metadata) {
      return null;
    }

    const now = Date.now();
    const age = now - metadata.timestamp;
    const isExpired = age > metadata.ttl;
    const isStale = age > metadata.ttl;
    
    // Update access metadata
    metadata.accessCount++;
    metadata.lastAccessed = now;

    // If fresh, return immediately
    if (!isExpired) {
      return this._deepClone(this._cache.get(key));
    }

    // If expired but within stale-while-revalidate window
    if (isStale && metadata.staleWhileRevalidate) {
      const staleAge = age - metadata.ttl;
      const staleWindow = this._config.staleWhileRevalidate;
      
      if (staleAge <= staleWindow) {
        // Return stale data and trigger revalidation if not already in progress
        if (options.revalidate && !this._revalidationPromises.has(key)) {
          this._triggerRevalidation(key, options.revalidate);
        }
        
        const staleValue = this._cache.get(key);
        if (staleValue !== undefined) {
          return this._deepClone(staleValue);
        }
      }
    }

    // Data is too old or doesn't exist
    this._cache.delete(key);
    this._metadata.delete(key);
    this._removeFromStorage(key);
    
    return null;
  }

  /**
   * Check if a key exists and is valid (not expired)
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is fresh
   */
  has(key) {
    const metadata = this._metadata.get(key);
    if (!metadata) return false;

    const age = Date.now() - metadata.timestamp;
    return age <= metadata.ttl;
  }

  /**
   * Check if a key is expired
   * @param {string} key - Cache key
   * @returns {boolean} True if key is expired
   */
  isExpired(key) {
    const metadata = this._metadata.get(key);
    if (!metadata) return true;

    const age = Date.now() - metadata.timestamp;
    return age > metadata.ttl;
  }

  /**
   * Check if a key is stale but within revalidate window
   * @param {string} key - Cache key
   * @returns {boolean} True if key is stale but can be served
   */
  isStale(key) {
    const metadata = this._metadata.get(key);
    if (!metadata) return false;

    const age = Date.now() - metadata.timestamp;
    const isExpired = age > metadata.ttl;
    const staleAge = age - metadata.ttl;
    const withinStaleWindow = staleAge <= this._config.staleWhileRevalidate;
    
    return isExpired && withinStaleWindow;
  }

  /**
   * Get cache metadata for a key
   * @param {string} key - Cache key
   * @returns {Object|null} Cache metadata
   */
  getMetadata(key) {
    const metadata = this._metadata.get(key);
    if (!metadata) return null;

    const age = Date.now() - metadata.timestamp;
    return {
      ...metadata,
      age,
      isExpired: age > metadata.ttl,
      isStale: this.isStale(key)
    };
  }

  /**
   * Delete a key from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this._cache.delete(key);
    this._metadata.delete(key);
    this._revalidationPromises.delete(key);
    this._removeFromStorage(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this._cache.clear();
    this._metadata.clear();
    this._revalidationPromises.clear();
    
    if (this._config.enablePersistence) {
      try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('cache_'));
        keys.forEach(key => localStorage.removeItem(key));
      } catch (error) {
        console.warn('Failed to clear localStorage cache:', error);
      }
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const entries = Array.from(this._metadata.values());
    const now = Date.now();
    
    const stats = {
      totalEntries: entries.length,
      totalSize: entries.reduce((sum, meta) => sum + (meta.size || 0), 0),
      freshEntries: entries.filter(meta => (now - meta.timestamp) <= meta.ttl).length,
      staleEntries: entries.filter(meta => {
        const age = now - meta.timestamp;
        return age > meta.ttl && age <= (meta.ttl + this._config.staleWhileRevalidate);
      }).length,
      expiredEntries: entries.filter(meta => {
        const age = now - meta.timestamp;
        return age > (meta.ttl + this._config.staleWhileRevalidate);
      }).length,
      averageAge: entries.length > 0 ? 
        entries.reduce((sum, meta) => sum + (now - meta.timestamp), 0) / entries.length : 0,
      topKeys: entries
        .sort((a, b) => b.accessCount - a.accessCount)
        .slice(0, 5)
        .map(meta => ({
          key: Array.from(this._metadata.entries()).find(([k, v]) => v === meta)?.[0],
          accessCount: meta.accessCount,
          age: now - meta.timestamp
        }))
    };

    return stats;
  }

  /**
   * Trigger revalidation for a key
   * @private
   */
  async _triggerRevalidation(key, revalidateFunction) {
    if (this._revalidationPromises.has(key)) {
      return this._revalidationPromises.get(key);
    }

    const revalidationPromise = (async () => {
      try {
        const newValue = await revalidateFunction(key);
        if (newValue !== null && newValue !== undefined) {
          this.set(key, newValue);
        }
        return newValue;
      } catch (error) {
        console.warn(`Revalidation failed for ${key}:`, error);
        return null;
      } finally {
        this._revalidationPromises.delete(key);
      }
    })();

    this._revalidationPromises.set(key, revalidationPromise);
    return revalidationPromise;
  }

  /**
   * Enforce maximum cache size by removing LRU entries
   * @private
   */
  _enforceMaxSize() {
    if (this._cache.size <= this._config.maxCacheSize) {
      return;
    }

    const entries = Array.from(this._metadata.entries())
      .sort((a, b) => {
        // Sort by priority (high priority kept longer) then by last accessed
        const priorityWeight = { high: 3, normal: 2, low: 1 };
        const aPriority = priorityWeight[a[1].priority] || 2;
        const bPriority = priorityWeight[b[1].priority] || 2;
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority; // Lower priority first
        }
        
        return a[1].lastAccessed - b[1].lastAccessed; // Older access first
      });

    const toRemove = this._cache.size - this._config.maxCacheSize;
    for (let i = 0; i < toRemove; i++) {
      const [key] = entries[i];
      this.delete(key);
    }
  }

  /**
   * Start periodic cleanup of expired entries
   * @private
   */
  _startCleanupInterval() {
    setInterval(() => {
      this._cleanupExpired();
    }, 60000); // Clean up every minute
  }

  /**
   * Clean up expired entries
   * @private
   */
  _cleanupExpired() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, metadata] of this._metadata.entries()) {
      const age = now - metadata.timestamp;
      const maxAge = metadata.ttl + this._config.staleWhileRevalidate;
      
      if (age > maxAge) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));
  }

  /**
   * Load cache from localStorage
   * @private
   */
  _loadFromStorage() {
    if (!this._config.enablePersistence) return;

    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('cache_'));
      
      for (const storageKey of keys) {
        const key = storageKey.replace('cache_', '');
        const data = JSON.parse(localStorage.getItem(storageKey));
        
        if (data && data.value && data.metadata) {
          const age = Date.now() - data.metadata.timestamp;
          const maxAge = data.metadata.ttl + this._config.staleWhileRevalidate;
          
          // Only load if not too old
          if (age <= maxAge) {
            this._cache.set(key, data.value);
            this._metadata.set(key, data.metadata);
          } else {
            localStorage.removeItem(storageKey);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
    }
  }

  /**
   * Persist cache entry to localStorage
   * @private
   */
  _persistToStorage(key, value, metadata) {
    try {
      const data = { value, metadata };
      localStorage.setItem(`cache_${key}`, JSON.stringify(data));
    } catch (error) {
      // localStorage is full or unavailable
      console.warn('Failed to persist cache to localStorage:', error);
    }
  }

  /**
   * Remove cache entry from localStorage
   * @private
   */
  _removeFromStorage(key) {
    try {
      localStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.warn('Failed to remove cache from localStorage:', error);
    }
  }

  /**
   * Calculate approximate size of a value
   * @private
   */
  _calculateSize(value) {
    try {
      return JSON.stringify(value).length;
    } catch (error) {
      return 0;
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
const cacheManager = new CacheManager();

// Export for ES6 modules
export default cacheManager;
export { CacheManager };
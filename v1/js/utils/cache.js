/**
 * Client-side caching utility
 * Provides localStorage caching with TTL support
 */

class CacheManager {
  constructor() {
    this.prefix = 'nstcg_cache_';
  }

  /**
   * Set item in cache with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl) {
    try {
      const item = {
        value: value,
        expiry: Date.now() + ttl,
        timestamp: Date.now()
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (error) {
      console.warn('Cache set failed:', error);
    }
  }

  /**
   * Get item from cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or null
   */
  get(key) {
    try {
      const itemStr = localStorage.getItem(this.prefix + key);
      if (!itemStr) return null;

      const item = JSON.parse(itemStr);
      const now = Date.now();

      // Check if expired
      if (now > item.expiry) {
        localStorage.removeItem(this.prefix + key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.warn('Cache get failed:', error);
      return null;
    }
  }

  /**
   * Check if cache has valid item
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Remove item from cache
   * @param {string} key - Cache key
   */
  remove(key) {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.warn('Cache remove failed:', error);
    }
  }

  /**
   * Clear all cached items
   */
  clear() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Cache clear failed:', error);
    }
  }

  /**
   * Get cache stats
   * @returns {object} Cache statistics
   */
  getStats() {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith(this.prefix));
      let totalSize = 0;
      let expiredCount = 0;
      const now = Date.now();

      cacheKeys.forEach(key => {
        const item = localStorage.getItem(key);
        totalSize += item.length;
        
        try {
          const parsed = JSON.parse(item);
          if (parsed.expiry < now) {
            expiredCount++;
          }
        } catch {}
      });

      return {
        itemCount: cacheKeys.length,
        totalSize: totalSize,
        expiredCount: expiredCount
      };
    } catch (error) {
      console.warn('Cache stats failed:', error);
      return { itemCount: 0, totalSize: 0, expiredCount: 0 };
    }
  }
}

// Create singleton instance
const cache = new CacheManager();

// Cache TTL constants
export const CACHE_TTL = {
  FEATURE_FLAGS: 24 * 60 * 60 * 1000, // 24 hours
  PARTICIPANT_COUNT: 5 * 60 * 1000,   // 5 minutes
  USER_STATS: 30 * 60 * 1000,         // 30 minutes (session)
  RECENT_SIGNUPS: 60 * 1000,          // 1 minute
  LEADERBOARD: 2 * 60 * 1000,         // 2 minutes
  DONATIONS: 60 * 1000,               // 1 minute
  HOT_TOPICS: 6 * 60 * 60 * 1000     // 6 hours
};

// Export cache instance and manager
export default cache;
export { CacheManager, cache };
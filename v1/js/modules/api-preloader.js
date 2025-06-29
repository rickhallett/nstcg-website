/**
 * API Preloader Module - Vite-Optimized
 * Lazy-loaded module that preloads API data for instant page transitions
 * @module APIPreloader
 */

import StateManager from '../core/StateManager.js';
import CacheManager from '../core/CacheManager.js';

// Preloading configuration
const PRELOAD_CONFIG = {
  // Master switch to enable/disable API preloading
  ENABLE_API_PRELOADING: false, // Set to false to disable preloading
  
  // Cache TTL for preloaded data (5 minutes)
  cacheTTL: 5 * 60 * 1000,
  
  // Delay before starting preload (to not interfere with initial page load)
  preloadDelay: 2000,
  
  // Retry configuration
  maxRetries: 2,
  retryDelay: 1000,
  
  // Performance monitoring
  enableTracking: true
};

// API endpoints to preload
const API_ENDPOINTS = {
  count: '/api/get-count',
  userStats: '/api/get-user-stats',
  leaderboard: '/api/get-leaderboard',
  recentSignups: '/api/get-recent-signups',
  allParticipants: '/api/get-all-participants',
  donations: '/api/get-total-donations'
};

// Performance tracking
let preloadMetrics = {
  started: null,
  completed: null,
  failed: [],
  cached: []
};

// User behavior tracking for progressive preloading
let userBehavior = {
  pageViews: [],
  timeOnPage: {},
  navigationPatterns: [],
  lastActivity: Date.now()
};

/**
 * APIPreloader class handles intelligent preloading of API data
 */
class APIPreloader {
  constructor() {
    this.stateManager = StateManager;
    this.cacheManager = CacheManager;
    this.isPreloading = false;
    this.preloadPromises = new Map();
  }

  /**
   * Start preloading based on current page and user state
   */
  async startPreloading() {
    // Check if preloading is enabled
    if (!PRELOAD_CONFIG.ENABLE_API_PRELOADING) {
      console.log('[APIPreloader] Preloading is disabled via configuration');
      return;
    }
    
    if (this.isPreloading) {
      return;
    }

    this.isPreloading = true;
    preloadMetrics.started = Date.now();

    // Determine preload strategy based on current page
    const currentPage = this.getCurrentPage();
    const preloadStrategy = this.getPreloadStrategy(currentPage);

    if (PRELOAD_CONFIG.enableTracking) {
      console.log(`[APIPreloader] Starting preload for ${currentPage} page`, preloadStrategy);
    }

    // Start preloading after delay
    setTimeout(() => {
      this.executePreloadStrategy(preloadStrategy);
    }, PRELOAD_CONFIG.preloadDelay);
  }

  /**
   * Get current page identifier
   */
  getCurrentPage() {
    const path = window.location.pathname;
    if (path === '/' || path === '/index.html') return 'index';
    if (path.includes('share')) return 'share';
    if (path.includes('leaderboard')) return 'leaderboard';
    if (path.includes('feeds')) return 'feeds';
    if (path.includes('donate')) return 'donate';
    return 'unknown';
  }

  /**
   * Determine what to preload based on current page
   */
  getPreloadStrategy(currentPage) {
    const strategies = {
      index: {
        immediate: ['count', 'recentSignups'],
        deferred: ['leaderboard', 'donations'],
        conditional: [
          {
            condition: () => this.isUserRegistered(),
            apis: ['userStats']
          }
        ]
      },
      share: {
        immediate: ['userStats', 'count'],
        deferred: ['leaderboard'],
        conditional: []
      },
      leaderboard: {
        immediate: ['leaderboard', 'userStats'],
        deferred: ['count', 'recentSignups'],
        conditional: []
      },
      feeds: {
        immediate: ['allParticipants', 'count'],
        deferred: ['recentSignups'],
        conditional: []
      },
      donate: {
        immediate: ['donations', 'count'],
        deferred: [],
        conditional: []
      }
    };

    return strategies[currentPage] || { immediate: ['count'], deferred: [], conditional: [] };
  }

  /**
   * Execute the preload strategy
   */
  async executePreloadStrategy(strategy) {
    try {
      // Preload immediate APIs
      if (strategy.immediate.length > 0) {
        await this.preloadAPIs(strategy.immediate, 'immediate');
      }

      // Preload conditional APIs
      for (const conditional of strategy.conditional) {
        if (conditional.condition()) {
          await this.preloadAPIs(conditional.apis, 'conditional');
        }
      }

      // Preload deferred APIs (lower priority)
      if (strategy.deferred.length > 0) {
        setTimeout(() => {
          this.preloadAPIs(strategy.deferred, 'deferred');
        }, 1000);
      }

    } catch (error) {
      console.error('[APIPreloader] Strategy execution failed:', error);
    }
  }

  /**
   * Preload multiple APIs concurrently
   */
  async preloadAPIs(apiKeys, priority = 'normal') {
    const promises = apiKeys.map(apiKey => this.preloadAPI(apiKey, priority));
    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      const apiKey = apiKeys[index];
      if (result.status === 'rejected') {
        this.stateManager.markPreloadFailed(apiKey, result.reason);
        preloadMetrics.failed.push({ api: apiKey, error: result.reason });
        if (PRELOAD_CONFIG.enableTracking) {
          console.warn(`[APIPreloader] Failed to preload ${apiKey}:`, result.reason);
        }
      }
    });
  }

  /**
   * Preload a single API endpoint
   */
  async preloadAPI(apiKey, priority = 'normal') {
    const endpoint = API_ENDPOINTS[apiKey];
    if (!endpoint) {
      throw new Error(`Unknown API key: ${apiKey}`);
    }

    // Check if already cached (fresh or stale-but-usable)
    const cacheKey = `preload_${apiKey}`;
    const cached = this.cacheManager.get(cacheKey, {
      revalidate: async (key) => {
        // Background revalidation function
        try {
          const response = await this.fetchWithRetry(endpoint, apiKey, 'revalidate');
          return response;
        } catch (error) {
          console.warn(`Background revalidation failed for ${apiKey}:`, error);
          return null;
        }
      }
    });
    
    if (cached) {
      preloadMetrics.cached.push(apiKey);
      this.stateManager.setPreloadedData(apiKey, cached, {
        ttl: PRELOAD_CONFIG.cacheTTL,
        priority: priority,
        source: this.cacheManager.isStale(cacheKey) ? 'stale-cache' : 'fresh-cache'
      });
      return cached;
    }

    // Avoid duplicate requests
    if (this.preloadPromises.has(apiKey)) {
      return this.preloadPromises.get(apiKey);
    }

    const preloadPromise = this.fetchWithRetry(endpoint, apiKey, priority);
    this.preloadPromises.set(apiKey, preloadPromise);

    try {
      const data = await preloadPromise;
      
      // Cache the result and update state with metadata
      this.cacheManager.set(cacheKey, data, PRELOAD_CONFIG.cacheTTL);
      this.stateManager.setPreloadedData(apiKey, data, {
        ttl: PRELOAD_CONFIG.cacheTTL,
        priority: priority
      });
      
      if (PRELOAD_CONFIG.enableTracking) {
        console.log(`[APIPreloader] Successfully preloaded ${apiKey} (${priority})`);
      }
      
      return data;
    } finally {
      this.preloadPromises.delete(apiKey);
    }
  }

  /**
   * Fetch with retry logic
   */
  async fetchWithRetry(endpoint, apiKey, priority, attempt = 1) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(endpoint, {
        signal: controller.signal,
        headers: {
          'X-Preload-Priority': priority,
          'X-Preload-API': apiKey
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt < PRELOAD_CONFIG.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, PRELOAD_CONFIG.retryDelay * attempt));
        return this.fetchWithRetry(endpoint, apiKey, priority, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Check if user is registered
   */
  isUserRegistered() {
    return localStorage.getItem('nstcg_registered') === 'true';
  }

  /**
   * Get preloaded data for an API
   */
  getPreloadedData(apiKey) {
    return this.stateManager.get(`api.${apiKey}`);
  }

  /**
   * Force refresh of specific API data
   */
  async refreshAPI(apiKey) {
    const cacheKey = `preload_${apiKey}`;
    this.cacheManager.delete(cacheKey);
    return this.preloadAPI(apiKey, 'refresh');
  }

  /**
   * Get preloading metrics
   */
  getMetrics() {
    return {
      ...preloadMetrics,
      duration: preloadMetrics.completed ? 
        preloadMetrics.completed - preloadMetrics.started : 
        Date.now() - preloadMetrics.started,
      success: preloadMetrics.cached.length,
      failures: preloadMetrics.failed.length
    };
  }

  /**
   * Clear all preloaded data
   */
  clearPreloadedData() {
    Object.keys(API_ENDPOINTS).forEach(apiKey => {
      const cacheKey = `preload_${apiKey}`;
      this.cacheManager.delete(cacheKey);
      this.stateManager.set(`api.${apiKey}`, null);
    });
  }

  /**
   * Track user page view for behavioral analysis
   */
  trackPageView(page) {
    const now = Date.now();
    userBehavior.pageViews.push({
      page,
      timestamp: now,
      referrer: document.referrer
    });

    // Track time on previous page
    if (userBehavior.currentPage && userBehavior.pageStartTime) {
      const timeSpent = now - userBehavior.pageStartTime;
      userBehavior.timeOnPage[userBehavior.currentPage] = 
        (userBehavior.timeOnPage[userBehavior.currentPage] || 0) + timeSpent;
    }

    userBehavior.currentPage = page;
    userBehavior.pageStartTime = now;
    userBehavior.lastActivity = now;

    // Keep only last 50 page views
    if (userBehavior.pageViews.length > 50) {
      userBehavior.pageViews = userBehavior.pageViews.slice(-50);
    }

    // Update navigation patterns
    this.updateNavigationPatterns();
    
    // Trigger adaptive preloading based on behavior
    this.adaptivePreload();
  }

  /**
   * Update navigation patterns for predictive preloading
   */
  updateNavigationPatterns() {
    const recentViews = userBehavior.pageViews.slice(-10);
    const patterns = {};

    for (let i = 0; i < recentViews.length - 1; i++) {
      const from = recentViews[i].page;
      const to = recentViews[i + 1].page;
      const key = `${from}->${to}`;
      
      patterns[key] = (patterns[key] || 0) + 1;
    }

    userBehavior.navigationPatterns = patterns;
  }

  /**
   * Adaptive preloading based on user behavior
   */
  async adaptivePreload() {
    const currentPage = this.getCurrentPage();
    const predictions = this.predictNextPages(currentPage);
    
    // Preload APIs for predicted next pages
    for (const prediction of predictions) {
      if (prediction.confidence > 0.3) { // Only if confidence > 30%
        const strategy = this.getPreloadStrategy(prediction.page);
        await this.preloadAPIs(strategy.immediate, 'adaptive');
      }
    }
  }

  /**
   * Predict next pages based on navigation patterns
   */
  predictNextPages(currentPage) {
    const patterns = userBehavior.navigationPatterns;
    const predictions = [];

    Object.entries(patterns).forEach(([pattern, count]) => {
      const [from, to] = pattern.split('->');
      if (from === currentPage) {
        const totalFromPage = Object.entries(patterns)
          .filter(([p]) => p.startsWith(`${from}->`))
          .reduce((sum, [, c]) => sum + c, 0);
        
        const confidence = count / totalFromPage;
        predictions.push({ page: to, confidence, count });
      }
    });

    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Track user activity for idle detection
   */
  trackActivity() {
    userBehavior.lastActivity = Date.now();
  }

  /**
   * Check if user is idle
   */
  isUserIdle(idleThreshold = 30000) { // 30 seconds
    return Date.now() - userBehavior.lastActivity > idleThreshold;
  }

  /**
   * Background preloading during idle time
   */
  async idlePreload() {
    if (!this.isUserIdle()) return;

    const currentPage = this.getCurrentPage();
    const strategy = this.getPreloadStrategy(currentPage);
    
    // Preload lower priority items during idle time
    if (strategy.deferred.length > 0) {
      await this.preloadAPIs(strategy.deferred, 'idle');
    }
  }
}

// Create singleton instance
const preloader = new APIPreloader();

/**
 * Initialize API preloading
 * This function should be called after the main app is loaded
 */
export async function initializePreloading() {
  try {
    await preloader.startPreloading();
  } catch (error) {
    console.error('[APIPreloader] Initialization failed:', error);
  }
}

/**
 * Get preloaded data for an API
 */
export function getPreloadedData(apiKey) {
  return preloader.getPreloadedData(apiKey);
}

/**
 * Force refresh of specific API data
 */
export function refreshAPI(apiKey) {
  return preloader.refreshAPI(apiKey);
}

/**
 * Get preloading metrics
 */
export function getPreloadMetrics() {
  return preloader.getMetrics();
}

/**
 * Clear all preloaded data
 */
export function clearPreloadedData() {
  preloader.clearPreloadedData();
}

/**
 * Track page view for behavioral analysis
 */
export function trackPageView(page) {
  preloader.trackPageView(page);
}

/**
 * Track user activity
 */
export function trackActivity() {
  preloader.trackActivity();
}

/**
 * Start idle preloading
 */
export function startIdlePreload() {
  // Set up idle preloading interval
  setInterval(() => {
    preloader.idlePreload();
  }, 60000); // Check every minute
}

/**
 * Get user behavior insights
 */
export function getBehaviorInsights() {
  return {
    pageViews: userBehavior.pageViews,
    timeOnPage: userBehavior.timeOnPage,
    navigationPatterns: userBehavior.navigationPatterns,
    predictions: preloader.predictNextPages(preloader.getCurrentPage())
  };
}

// Export configuration check function
export function isPreloadingEnabled() {
  return PRELOAD_CONFIG.ENABLE_API_PRELOADING;
}

// Export the preloader instance
export { preloader as APIPreloader };
export default preloader;
/**
 * API Integration Module - Seamlessly integrate preloaded data with existing API calls
 * @module APIIntegration
 */

import StateManager from '../core/StateManager.js';
import CacheManager from '../core/CacheManager.js';

// Map of API endpoints to their preload keys
const ENDPOINT_MAP = {
  '/api/get-count': 'count',
  '/api/get-user-stats': 'userStats',
  '/api/get-leaderboard': 'leaderboard',
  '/api/get-recent-signups': 'recentSignups',
  '/api/get-all-participants': 'allParticipants',
  '/api/get-total-donations': 'donations'
};

// Recursion detection
let fetchDepth = 0;
const MAX_FETCH_DEPTH = 3;

/**
 * Enhanced fetch function that uses preloaded data when available
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Enhanced response with preloaded data
 */
export async function fetchWithPreload(url, options = {}) {
  // Recursion detection
  if (fetchDepth > MAX_FETCH_DEPTH) {
    console.error(`[APIIntegration] Maximum fetch depth exceeded for ${url}`);
    throw new Error('Maximum fetch recursion depth exceeded');
  }
  
  fetchDepth++;
  
  try {
    // Ensure we have the original fetch available
    if (!window._originalFetch) {
      window._originalFetch = window.fetch;
    }
    
    const apiKey = ENDPOINT_MAP[url];
    
    // If we have a preload key, try to get preloaded data
    if (apiKey) {
      const preloadStatus = StateManager.getPreloadStatus(apiKey);
      
      // If we have fresh preloaded data, return it immediately
      if (preloadStatus.isLoaded && !preloadStatus.isStale) {
        console.log(`[APIIntegration] Using preloaded data for ${url}`);
        return createMockResponse(preloadStatus.data);
      }
      
      // If we have stale data, return it but trigger background refresh
      if (preloadStatus.isLoaded && preloadStatus.isStale) {
        console.log(`[APIIntegration] Using stale preloaded data for ${url}, refreshing in background`);
        
        // Trigger background refresh using original fetch
        window._originalFetch(url, options)
          .then(response => response.json())
          .then(data => {
            StateManager.setPreloadedData(apiKey, data, {
              ttl: 5 * 60 * 1000, // 5 minutes
              priority: 'refresh'
            });
            CacheManager.set(`preload_${apiKey}`, data, 5 * 60 * 1000);
          })
          .catch(error => console.warn(`Background refresh failed for ${url}:`, error));
        
        return createMockResponse(preloadStatus.data);
      }
    }
    
    // No preloaded data available, perform normal fetch using original fetch
    const response = await window._originalFetch(url, options);
    
    // Cache the response for future use
    if (response.ok && apiKey) {
      const clonedResponse = response.clone();
      clonedResponse.json().then(data => {
        StateManager.setPreloadedData(apiKey, data, {
          ttl: 5 * 60 * 1000,
          priority: 'normal'
        });
        CacheManager.set(`preload_${apiKey}`, data, 5 * 60 * 1000);
      }).catch(() => {}); // Ignore errors in background caching
    }
    
    return response;
  } finally {
    fetchDepth--;
  }
}

/**
 * Get preloaded data directly (for components that want to check availability)
 * @param {string} endpoint - API endpoint
 * @returns {Object|null} Preloaded data or null
 */
export function getPreloadedData(endpoint) {
  const apiKey = ENDPOINT_MAP[endpoint];
  if (!apiKey) return null;
  
  const preloadStatus = StateManager.getPreloadStatus(apiKey);
  return preloadStatus.isLoaded ? preloadStatus.data : null;
}

/**
 * Check if data is preloaded for an endpoint
 * @param {string} endpoint - API endpoint
 * @returns {boolean} True if data is preloaded
 */
export function isPreloaded(endpoint) {
  const apiKey = ENDPOINT_MAP[endpoint];
  if (!apiKey) return false;
  
  return StateManager.getPreloadStatus(apiKey).isLoaded;
}

/**
 * Get preload status for an endpoint
 * @param {string} endpoint - API endpoint
 * @returns {Object} Preload status information
 */
export function getPreloadStatus(endpoint) {
  const apiKey = ENDPOINT_MAP[endpoint];
  if (!apiKey) return { isLoaded: false };
  
  return StateManager.getPreloadStatus(apiKey);
}

/**
 * Force refresh of preloaded data for an endpoint
 * @param {string} endpoint - API endpoint
 * @returns {Promise<Object>} Fresh data
 */
export async function refreshPreloadedData(endpoint) {
  const apiKey = ENDPOINT_MAP[endpoint];
  if (!apiKey) {
    throw new Error(`No preload key found for endpoint: ${endpoint}`);
  }
  
  // Use original fetch for refresh
  const response = await (window._originalFetch || fetch)(endpoint);
  if (!response.ok) {
    throw new Error(`Failed to refresh ${endpoint}: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  StateManager.setPreloadedData(apiKey, data, {
    ttl: 5 * 60 * 1000,
    priority: 'refresh'
  });
  CacheManager.set(`preload_${apiKey}`, data, 5 * 60 * 1000);
  
  return data;
}

/**
 * Create a mock Response object for preloaded data
 * @private
 */
function createMockResponse(data) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({
      'Content-Type': 'application/json',
      'X-Preloaded': 'true'
    }),
    json: async () => data,
    text: async () => JSON.stringify(data),
    clone: () => createMockResponse(data)
  };
}

/**
 * Monkey patch the global fetch to automatically use preloaded data
 * This allows existing code to transparently benefit from preloading
 */
export async function enableFetchIntegration() {
  // Check if preloading is enabled before patching fetch
  try {
    const { isPreloadingEnabled } = await import('./api-preloader.js');
    
    if (!isPreloadingEnabled()) {
      console.log('[APIIntegration] Fetch integration skipped - preloading is disabled');
      return;
    }
  } catch (error) {
    console.warn('[APIIntegration] Could not check preloading status:', error);
    return;
  }
  
  // Prevent double-patching
  if (window._originalFetch) {
    console.warn('[APIIntegration] Fetch integration already enabled');
    return;
  }
  
  // Store the original fetch reference
  window._originalFetch = window.fetch;
  
  window.fetch = async function(url, options) {
    // Only intercept our API calls
    if (typeof url === 'string' && ENDPOINT_MAP[url]) {
      return fetchWithPreload(url, options);
    }
    
    // Pass through all other requests using the original fetch
    return window._originalFetch.call(this, url, options);
  };
  
  console.log('[APIIntegration] Fetch integration enabled - API calls will use preloaded data when available');
}

/**
 * Restore original fetch function
 */
export function disableFetchIntegration() {
  if (window._originalFetch) {
    window.fetch = window._originalFetch;
    delete window._originalFetch;
    console.log('[APIIntegration] Fetch integration disabled');
  }
}

/**
 * Get integration statistics
 */
export function getIntegrationStats() {
  const allStatus = StateManager.getAllPreloadStatus();
  const stats = {
    totalEndpoints: Object.keys(ENDPOINT_MAP).length,
    preloadedEndpoints: Object.values(allStatus).filter(s => s.isLoaded).length,
    staleEndpoints: Object.values(allStatus).filter(s => s.isLoaded && s.isStale).length,
    endpoints: {}
  };
  
  Object.entries(ENDPOINT_MAP).forEach(([endpoint, apiKey]) => {
    stats.endpoints[endpoint] = allStatus[apiKey] || { isLoaded: false };
  });
  
  return stats;
}

// Export the endpoint mapping for other modules
export { ENDPOINT_MAP };
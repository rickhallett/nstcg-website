/**
 * Frontend Feature Flag Utility
 * 
 * This module provides access to feature flags in the browser.
 * Uses the same precedence logic as the backend:
 * 1. Notion database (takes precedence)
 * 2. Environment variables (injected at build time)
 * 3. Default values
 */

// Default feature configuration (synchronized with backend)
const defaultFeatures = {
  donations: {
    enabled: false,
    showFinancialStatus: false,
    showRecentDonations: false,
    showTotalDonations: false
  },
  
  campaignCosts: {
    enabled: false,
    showLiveCounter: false,
    showBreakdown: false
  },
  
  leaderboard: {
    enabled: false,
    showPrizePool: false,
    showTopThree: false,
    showFullLeaderboard: false
  },
  
  referralScheme: {
    enabled: false,
    showShareButtons: true,
    trackReferrals: false,
    showReferralBanner: false,
    awardReferralPoints: false
  },
  
  ui: {
    communityActionRequired: true,
    coloredTimer: false,
    timerBlink: false
  }
};

// Store for runtime features
let features = { ...defaultFeatures };
let featuresLoaded = false;

/**
 * Check if a feature is enabled
 * @param {string} featurePath - Dot notation path to feature flag (e.g., 'donations.enabled')
 * @returns {boolean} Whether the feature is enabled
 */
export function isFeatureEnabled(featurePath) {
  const parts = featurePath.split('.');
  let flag = features;
  
  for (const part of parts) {
    if (flag && typeof flag === 'object' && part in flag) {
      flag = flag[part];
    } else {
      return false;
    }
  }
  
  return Boolean(flag);
}

/**
 * Check if any of the features are enabled (OR logic)
 * @param {...string} featurePaths - Feature paths to check
 * @returns {boolean} Whether any feature is enabled
 */
export function isAnyFeatureEnabled(...featurePaths) {
  return featurePaths.some(path => isFeatureEnabled(path));
}

/**
 * Check if all features are enabled (AND logic)
 * @param {...string} featurePaths - Feature paths to check
 * @returns {boolean} Whether all features are enabled
 */
export function areAllFeaturesEnabled(...featurePaths) {
  return featurePaths.every(path => isFeatureEnabled(path));
}

/**
 * Get the full features object
 * @returns {Object} Current features configuration
 */
export function getFeatures() {
  return { ...features };
}

/**
 * Load feature flags from API endpoint with caching
 * This can be called on app initialization to get server-side feature flags
 * @returns {Promise<Object>} Features configuration
 */
export async function loadFeatureFlags() {
  if (featuresLoaded) {
    return features;
  }

  const CACHE_KEY = 'nstcg_feature_flags';
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes (sync with backend)
  
  // Check localStorage cache
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        features = { ...defaultFeatures, ...data };
        featuresLoaded = true;
        console.log('Using cached feature flags');
        return features;
      }
    }
  } catch (error) {
    console.warn('Error reading feature flags cache:', error);
  }
  
  // Fetch from API
  try {
    const response = await fetch('/api/feature-flags');
    if (response.ok) {
      const serverFeatures = await response.json();
      features = { ...defaultFeatures, ...serverFeatures };
      featuresLoaded = true;
      
      // Cache the result
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: serverFeatures,
          timestamp: Date.now()
        }));
      } catch (cacheError) {
        console.warn('Failed to cache feature flags:', cacheError);
      }
      
      console.log('Loaded feature flags from server');
      return features;
    } else {
      console.warn(`Feature flags API returned ${response.status}, using defaults`);
    }
  } catch (error) {
    console.warn('Failed to load feature flags from server, using defaults:', error);
  }
  
  featuresLoaded = true;
  return features;
}

/**
 * Conditionally render an element based on feature flag
 * @param {string} featurePath - Feature flag path
 * @param {HTMLElement|string} element - Element or selector to show/hide
 */
export function showIfEnabled(featurePath, element) {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (el) {
    el.style.display = isFeatureEnabled(featurePath) ? '' : 'none';
  }
}

/**
 * Hide element if feature is disabled
 * @param {string} featurePath - Feature flag path  
 * @param {HTMLElement|string} element - Element or selector to show/hide
 */
export function hideIfDisabled(featurePath, element) {
  showIfEnabled(featurePath, element);
}

/**
 * Remove element from DOM if feature is disabled
 * @param {string} featurePath - Feature flag path
 * @param {HTMLElement|string} element - Element or selector to remove
 */
export function removeIfDisabled(featurePath, element) {
  if (!isFeatureEnabled(featurePath)) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (el) {
      el.remove();
    }
  }
}

/**
 * Initialize feature flags and set up global window object
 * This ensures feature flags are available globally on window.featureFlags
 */
export async function initializeFeatureFlags() {
  try {
    await loadFeatureFlags();
    
    // Make features available globally for compatibility
    window.featureFlags = features;
    
    // Dispatch event to signal that feature flags are ready
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('featureFlagsLoaded', { 
        detail: features 
      }));
    }
    
    return features;
  } catch (error) {
    console.error('Failed to initialize feature flags:', error);
    
    // Set defaults globally even if initialization fails
    window.featureFlags = features;
    
    return features;
  }
}

/**
 * Clear feature flags cache and reload from server
 * Useful for testing or when flags change
 */
export async function refreshFeatureFlags() {
  featuresLoaded = false;
  
  // Clear localStorage cache
  try {
    localStorage.removeItem('nstcg_feature_flags');
  } catch (error) {
    console.warn('Failed to clear feature flags cache:', error);
  }
  
  return await loadFeatureFlags();
}

// Export default object with all functions
export default {
  isFeatureEnabled,
  isAnyFeatureEnabled,
  areAllFeaturesEnabled,
  getFeatures,
  loadFeatureFlags,
  initializeFeatureFlags,
  refreshFeatureFlags,
  showIfEnabled,
  hideIfDisabled,
  removeIfDisabled
};
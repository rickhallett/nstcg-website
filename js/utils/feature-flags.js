/**
 * Frontend Feature Flag Utility
 * 
 * This module provides access to feature flags in the browser.
 * Since we can't access process.env directly in the browser,
 * we'll need to inject these values during build time or fetch them from an API.
 */

// Default feature configuration
// These can be overridden by fetching from an API endpoint
const defaultFeatures = {
  donations: {
    enabled: true,
    showFinancialStatus: true,
    showRecentDonations: true,
    showTotalDonations: true
  },
  
  campaignCosts: {
    enabled: true,
    showLiveCounter: true,
    showBreakdown: true
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
  const CACHE_KEY = 'nstcg_feature_flags';
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  
  // Check localStorage cache
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        features = { ...defaultFeatures, ...data };
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
      
      // Cache the result
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: serverFeatures,
          timestamp: Date.now()
        }));
      } catch (cacheError) {
        console.warn('Failed to cache feature flags:', cacheError);
      }
      
      return features;
    }
  } catch (error) {
    console.warn('Failed to load feature flags from server, using defaults:', error);
  }
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

// Export default object with all functions
export default {
  isFeatureEnabled,
  isAnyFeatureEnabled,
  areAllFeaturesEnabled,
  getFeatures,
  loadFeatureFlags,
  showIfEnabled,
  hideIfDisabled,
  removeIfDisabled
};
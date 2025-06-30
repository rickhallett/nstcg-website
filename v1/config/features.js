/**
 * Feature Flag Configuration
 * 
 * This module controls which features are enabled/disabled across the application.
 * Features can be controlled via:
 * 1. Notion database (takes precedence)
 * 2. Environment variables
 * 3. Default values
 * 
 * Precedence: Notion (if true/false) > Environment > Default
 */

import { checkFeatureWithPrecedence } from './feature-precedence.js';

// Feature flags are now loaded asynchronously due to Notion integration
let featuresLoaded = false;
let featuresPromise = null;

// Helper function to parse environment variable as boolean (synchronous fallback)
const isEnabled = (envVar, defaultValue = true) => {
  // In browser environment, these will be undefined
  if (typeof process === 'undefined' || !process.env) {
    return defaultValue;
  }

  // If env var is not set, use default
  if (process.env[envVar] === undefined) {
    return defaultValue;
  }

  // Parse as boolean
  return process.env[envVar] === 'true';
};

// Default features (used as fallback and initial values)
const defaultFeatures = {
  // Donation functionality
  donations: {
    enabled: false,
    showFinancialStatus: false,
    showRecentDonations: false,
    showTotalDonations: false
  },

  // Campaign costs display
  campaignCosts: {
    enabled: false,
    showLiveCounter: false,
    showBreakdown: false
  },

  // Leaderboard functionality
  leaderboard: {
    enabled: false,
    showPrizePool: false,
    showTopThree: false,
    showFullLeaderboard: false
  },

  // Referral scheme
  referralScheme: {
    enabled: true,
    showShareButtons: true,
    trackReferrals: true,
    showReferralBanner: true,
    awardReferralPoints: false
  },

  // UI customization
  ui: {
    communityActionRequired: true,
    coloredTimer: false,
    timerBlink: false
  }
};

// Current features (will be populated with precedence)
let features = JSON.parse(JSON.stringify(defaultFeatures));

/**
 * Load features with Notion precedence
 * This should be called early in the application lifecycle
 */
async function loadFeatures() {
  if (featuresLoaded) return features;
  
  if (!featuresPromise) {
    featuresPromise = loadFeaturesInternal();
  }
  
  return featuresPromise;
}

async function loadFeaturesInternal() {
  try {
    // Apply precedence for each feature
    for (const category of Object.keys(defaultFeatures)) {
      for (const key of Object.keys(defaultFeatures[category])) {
        const featurePath = `${category}.${key}`;
        const envVar = `FEATURE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
        const defaultValue = defaultFeatures[category][key];
        
        // Check with precedence (Notion > Env > Default)
        features[category][key] = await checkFeatureWithPrecedence(
          featurePath,
          envVar,
          defaultValue
        );
      }
    }
    
    featuresLoaded = true;
    console.log('Features loaded with Notion precedence');
    return features;
    
  } catch (error) {
    console.error('Error loading features with precedence:', error);
    // Fall back to environment/defaults
    applyEnvironmentFallback();
    return features;
  }
}

// Synchronous fallback when async loading fails
function applyEnvironmentFallback() {
  features.donations.enabled = isEnabled('FEATURE_DONATIONS', defaultFeatures.donations.enabled);
  features.donations.showFinancialStatus = isEnabled('FEATURE_FINANCIAL_STATUS', defaultFeatures.donations.showFinancialStatus);
  features.donations.showRecentDonations = isEnabled('FEATURE_RECENT_DONATIONS', defaultFeatures.donations.showRecentDonations);
  features.donations.showTotalDonations = isEnabled('FEATURE_TOTAL_DONATIONS', defaultFeatures.donations.showTotalDonations);
  
  features.campaignCosts.enabled = isEnabled('FEATURE_CAMPAIGN_COSTS', defaultFeatures.campaignCosts.enabled);
  features.campaignCosts.showLiveCounter = isEnabled('FEATURE_LIVE_COUNTER', defaultFeatures.campaignCosts.showLiveCounter);
  features.campaignCosts.showBreakdown = isEnabled('FEATURE_COST_BREAKDOWN', defaultFeatures.campaignCosts.showBreakdown);
  
  features.leaderboard.enabled = isEnabled('FEATURE_LEADERBOARD', defaultFeatures.leaderboard.enabled);
  features.leaderboard.showPrizePool = isEnabled('FEATURE_PRIZE_POOL', defaultFeatures.leaderboard.showPrizePool);
  features.leaderboard.showTopThree = isEnabled('FEATURE_TOP_THREE', defaultFeatures.leaderboard.showTopThree);
  features.leaderboard.showFullLeaderboard = isEnabled('FEATURE_FULL_LEADERBOARD', defaultFeatures.leaderboard.showFullLeaderboard);
  
  features.referralScheme.enabled = isEnabled('FEATURE_REFERRAL', defaultFeatures.referralScheme.enabled);
  features.referralScheme.showShareButtons = isEnabled('FEATURE_SHARE_BUTTONS', defaultFeatures.referralScheme.showShareButtons);
  features.referralScheme.trackReferrals = isEnabled('FEATURE_TRACK_REFERRALS', defaultFeatures.referralScheme.trackReferrals);
  features.referralScheme.showReferralBanner = isEnabled('FEATURE_REFERRAL_BANNER', defaultFeatures.referralScheme.showReferralBanner);
  features.referralScheme.awardReferralPoints = isEnabled('FEATURE_REFERRAL_POINTS', defaultFeatures.referralScheme.awardReferralPoints);
  
  features.ui.communityActionRequired = isEnabled('FEATURE_COMMUNITY_ACTION_REQUIRED', defaultFeatures.ui.communityActionRequired);
  features.ui.coloredTimer = isEnabled('FEATURE_COLORED_TIMER', defaultFeatures.ui.coloredTimer);
  features.ui.timerBlink = isEnabled('FEATURE_TIMER_BLINK', defaultFeatures.ui.timerBlink);
}

// Initialize features on first import (non-blocking)
if (typeof process !== 'undefined' && process.env) {
  loadFeatures().catch(error => {
    console.error('Background feature loading failed:', error);
  });
}

// Export functions to check features
export { loadFeatures };

// Export for browser (ES6 modules)
export default {
  features,
  loadFeatures,
  // Provide synchronous access for backward compatibility
  get current() { return features; }
};

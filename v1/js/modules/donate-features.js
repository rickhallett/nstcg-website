/**
 * Donate Page Feature Management
 * 
 * This module handles conditional rendering of donate page features
 * based on feature flags.
 */

import { isFeatureEnabled, loadFeatureFlags, hideIfDisabled, removeIfDisabled } from '../utils/feature-flags.js';

/**
 * Check if page should be accessible
 */
async function checkPageAccess() {
  await loadFeatureFlags();
  
  if (!isFeatureEnabled('donations.enabled')) {
    // Redirect to 404 or home
    window.location.href = '/404.html';
    return false;
  }
  
  return true;
}

/**
 * Update donate page features based on feature flags
 */
export async function updateDonatePageFeatures() {
  // Check page access first
  const hasAccess = await checkPageAccess();
  if (!hasAccess) return;
  
  // Handle Campaign Costs Section
  if (!isFeatureEnabled('campaignCosts.enabled')) {
    removeIfDisabled('campaignCosts.enabled', '.cost-counter');
  } else {
    // Check sub-features
    if (!isFeatureEnabled('campaignCosts.showBreakdown')) {
      hideIfDisabled('campaignCosts.showBreakdown', '.cost-breakdown');
    }
  }
  
  // Handle Total Donations Card
  if (!isFeatureEnabled('donations.showTotalDonations')) {
    removeIfDisabled('donations.showTotalDonations', '.total-donations-card');
  }
  
  // Handle Prize Pool Information
  if (!isFeatureEnabled('leaderboard.showPrizePool')) {
    removeIfDisabled('leaderboard.showPrizePool', '.prize-pool-info');
  }
  
  // Handle Recent Donations Feed
  if (!isFeatureEnabled('donations.showRecentDonations')) {
    removeIfDisabled('donations.showRecentDonations', '.recent-donations');
  }
  
  // Update campaign cost calculation
  if (!isFeatureEnabled('campaignCosts.showLiveCounter')) {
    window.DISABLE_COST_COUNTER = true;
  }
}

/**
 * Export functions for donate.js to use
 */
export function shouldLoadRecentDonations() {
  return isFeatureEnabled('donations.enabled') && isFeatureEnabled('donations.showRecentDonations');
}

export function shouldLoadTotalDonations() {
  return isFeatureEnabled('donations.enabled') && isFeatureEnabled('donations.showTotalDonations');
}

export function shouldShowCostCounter() {
  return isFeatureEnabled('campaignCosts.enabled') && isFeatureEnabled('campaignCosts.showLiveCounter');
}

/**
 * Initialize donate page features
 */
export async function initDonatePageFeatures() {
  await updateDonatePageFeatures();
  
  // Export functions to global scope for use in donate.js
  window.donateFeatureFlags = {
    shouldLoadRecentDonations,
    shouldLoadTotalDonations,
    shouldShowCostCounter,
    isFeatureEnabled
  };
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDonatePageFeatures);
} else {
  initDonatePageFeatures();
}
/**
 * Homepage Feature Management
 * 
 * This module handles conditional rendering of homepage features
 * based on feature flags.
 */

import { isFeatureEnabled, loadFeatureFlags, hideIfDisabled, removeIfDisabled, getFeatures } from '../utils/feature-flags.js';

/**
 * Update homepage features based on feature flags
 */
export async function updateHomepageFeatures() {
  // Load feature flags first
  await loadFeatureFlags();
  
  // Handle Community Action Required header
  if (!isFeatureEnabled('ui.communityActionRequired')) {
    removeIfDisabled('ui.communityActionRequired', '.alert-header');
  }
  
  // Handle Financial Status Card
  if (!isFeatureEnabled('donations.showFinancialStatus') || !isFeatureEnabled('campaignCosts.enabled')) {
    removeIfDisabled('donations.showFinancialStatus', '.financial-status-card');
  } else {
    // If financial status is enabled, check individual components
    if (!isFeatureEnabled('campaignCosts.enabled')) {
      hideIfDisabled('campaignCosts.enabled', '.financial-item.costs');
    }
    
    if (!isFeatureEnabled('donations.showTotalDonations')) {
      hideIfDisabled('donations.showTotalDonations', '.financial-item.donations');
    }
    
    // Hide balance if either costs or donations are hidden
    if (!isFeatureEnabled('campaignCosts.enabled') || !isFeatureEnabled('donations.showTotalDonations')) {
      hideIfDisabled('campaignCosts.enabled', '.financial-item.balance');
    }
    
    // Hide donate CTA if donations are disabled
    if (!isFeatureEnabled('donations.enabled')) {
      hideIfDisabled('donations.enabled', '.donate-cta');
    }
  }
  
  // Handle referral features
  if (!isFeatureEnabled('referralScheme.trackReferrals')) {
    // Disable referral tracking in main.js
    window.DISABLE_REFERRAL_TRACKING = true;
  }
  
  if (!isFeatureEnabled('referralScheme.showReferralBanner')) {
    // Disable referral banner display
    window.DISABLE_REFERRAL_BANNER = true;
  }
  
  if (!isFeatureEnabled('referralScheme.showShareButtons')) {
    // Remove share buttons from success modals
    const shareContainers = document.querySelectorAll('#share-container, #modal-share-container');
    shareContainers.forEach(container => container.remove());
  }
}

/**
 * Update financial status display
 * This is called from main.js when loading financial data
 */
export function shouldLoadFinancialStatus() {
  return isFeatureEnabled('donations.showFinancialStatus') || isFeatureEnabled('campaignCosts.enabled');
}

/**
 * Check if campaign costs should be calculated
 */
export function shouldShowCampaignCosts() {
  return isFeatureEnabled('campaignCosts.enabled') && isFeatureEnabled('campaignCosts.showLiveCounter');
}

/**
 * Check if donation totals should be fetched
 */
export function shouldFetchDonationTotals() {
  return isFeatureEnabled('donations.enabled') && isFeatureEnabled('donations.showTotalDonations');
}

/**
 * Initialize homepage features
 * Call this after DOM is loaded
 */
export async function initHomepageFeatures() {
  await updateHomepageFeatures();
  
  // Export functions and full features to global scope for use in main.js
  window.featureFlags = {
    shouldLoadFinancialStatus,
    shouldShowCampaignCosts,
    shouldFetchDonationTotals,
    isFeatureEnabled,
    ...getFeatures() // Include all feature flags
  };
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHomepageFeatures);
} else {
  initHomepageFeatures();
}
/**
 * Leaderboard Page Feature Management
 * 
 * This module handles access control for the leaderboard page
 * based on feature flags.
 */

import { isFeatureEnabled, loadFeatureFlags } from '../utils/feature-flags.js';

/**
 * Check if page should be accessible
 */
async function checkPageAccess() {
  await loadFeatureFlags();
  
  if (!isFeatureEnabled('leaderboard.enabled')) {
    // Redirect to 404
    window.location.replace('/404.html');
    return false;
  }
  
  return true;
}

/**
 * Initialize leaderboard page features
 */
export async function initLeaderboardFeatures() {
  await checkPageAccess();
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLeaderboardFeatures);
} else {
  initLeaderboardFeatures();
}
// Main entry point for Vite build system
// This file imports and initializes all required modules

// CSS is loaded directly in HTML for index.html
// No need to import here to avoid duplication

// Core utilities and configuration
import { initializeFeatureFlags } from './utils/feature-flags.js'
import './utils/include-nav.js'
import './utils/debug-logger.js'

// Referral utilities (global)
import './modules/referral-utils.js'

// Social sharing functions (expose globally for backward compatibility)
import {
  shareOnTwitter,
  shareOnFacebook,
  shareOnWhatsApp,
  shareOnLinkedIn,
  shareOnInstagram,
  shareByEmail,
  shareNative,
  addSocialShareButtons,
  showToast
} from './modules/social.js'

// Make social functions globally available
window.shareOnTwitter = shareOnTwitter;
window.shareOnFacebook = shareOnFacebook;
window.shareOnWhatsApp = shareOnWhatsApp;
window.shareOnLinkedIn = shareOnLinkedIn;
window.shareOnInstagram = shareOnInstagram;
window.shareByEmail = shareByEmail;
window.shareNative = shareNative;
window.addSocialShareButtons = addSocialShareButtons;
window.showToast = showToast;

// Homepage features
import { initHomepageFeatures } from './modules/homepage-features.js'

// API Preloading system (lazy-loaded)
async function initializePreloading() {
  try {
    // First check if preloading is enabled
    const { isPreloadingEnabled } = await import('./modules/api-preloader.js');

    if (!isPreloadingEnabled()) {
      console.log('API preloading is disabled via configuration');
      return;
    }

    const {
      initializePreloading,
      trackPageView,
      trackActivity,
      startIdlePreload
    } = await import('./modules/api-preloader.js');

    // Track current page view
    trackPageView('index');

    // Set up activity tracking
    ['click', 'scroll', 'mousemove', 'keypress'].forEach(event => {
      document.addEventListener(event, trackActivity, { passive: true });
    });

    // Start preloading system
    await initializePreloading();

    // Start idle preloading
    startIdlePreload();

    // Enable fetch integration for transparent preload usage
    const { enableFetchIntegration } = await import('./modules/api-integration.js');
    enableFetchIntegration();

    console.log('API preloading system initialized');
  } catch (error) {
    console.warn('Failed to initialize API preloading:', error);
  }
}

// Log page visit with URL parameters
async function logPageVisit() {
  try {
    const currentUrl = window.location.href;
    
    // Only log if we're on the index page and have URL parameters
    if (window.location.pathname === '/' && window.location.search) {
      const response = await fetch('/api/log-visit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: currentUrl })
      });
      
      if (!response.ok) {
        console.warn('Failed to log page visit:', response.status);
      }
    }
  } catch (error) {
    // Silently fail - logging shouldn't break the app
    console.warn('Error logging page visit:', error);
  }
}

// Initialize feature flags first, then initialize application
async function initialize() {
  try {
    // Log the page visit first (fire and forget)
    logPageVisit();
    
    // Initialize feature flags and make them globally available
    await initializeFeatureFlags();

    // Initialize homepage features (sets up window.featureFlags)
    await initHomepageFeatures();
    
    // NOW import main.js after dependencies are ready
    await import('./main.js');

    // Initialize API preloading system (after a short delay)
    setTimeout(initializePreloading, 1000);

    console.log('Feature flags loaded, NSTCG Website initialized via Vite');
  } catch (error) {
    console.warn('Failed to load feature flags:', error);
    console.log('NSTCG Website initialized via Vite (with default flags)');
  }
}

// Start initialization
initialize();
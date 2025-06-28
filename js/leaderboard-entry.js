// Leaderboard page entry point for Vite build system

// CSS is now loaded directly in HTML to prevent FOUC
// Additional component CSS still bundled
import '../css/components/gamification.css'

// Core utilities and configuration
import { initializeFeatureFlags } from './utils/feature-flags.js'
import './utils/include-nav.js'
import './utils/debug-logger.js'

// Referral utilities
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

// Leaderboard page specific modules
import './modules/leaderboard-features.js'
import './modules/leaderboard.js'

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
    trackPageView('leaderboard');
    
    // Set up activity tracking (skip scroll on mobile to prevent issues)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const events = isMobile 
      ? ['click', 'mousemove', 'keypress'] // Exclude scroll on mobile
      : ['click', 'scroll', 'mousemove', 'keypress'];
    
    events.forEach(event => {
      document.addEventListener(event, trackActivity, { passive: true });
    });
    
    // Start preloading system
    await initializePreloading();
    
    // Start idle preloading
    startIdlePreload();
    
    // Enable fetch integration for transparent preload usage
    const { enableFetchIntegration } = await import('./modules/api-integration.js');
    enableFetchIntegration();
    
    console.log('API preloading system initialized for leaderboard page');
  } catch (error) {
    console.warn('Failed to initialize API preloading:', error);
  }
}

// Initialize feature flags first
async function initialize() {
  try {
    await initializeFeatureFlags();
    
    // Initialize API preloading system (after a short delay)
    setTimeout(initializePreloading, 1000);
    
    console.log('Feature flags loaded, Leaderboard page initialized via Vite');
  } catch (error) {
    console.warn('Failed to load feature flags:', error);
    console.log('Leaderboard page initialized via Vite (with default flags)');
  }
}

initialize();
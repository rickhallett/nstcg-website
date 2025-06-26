// Main entry point for Vite build system
// This file imports and initializes all required modules

// Import CSS (Vite will handle bundling)
import '../css/main.css'

// Core utilities and configuration
import { initializeFeatureFlags } from './utils/feature-flags.js'
import './utils/include-nav.js'

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

// Main application logic
import './main.js'

// API Preloading system (lazy-loaded)
async function initializePreloading() {
  try {
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
    
    console.log('API preloading system initialized');
  } catch (error) {
    console.warn('Failed to initialize API preloading:', error);
  }
}

// Initialize feature flags first, then initialize application
async function initialize() {
  try {
    // Initialize feature flags and make them globally available
    await initializeFeatureFlags();
    
    // Initialize homepage features (sets up window.featureFlags)
    await initHomepageFeatures();
    
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
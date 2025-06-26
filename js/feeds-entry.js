// Feeds page entry point for Vite build system

// Import CSS
import '../css/main.css'
import '../css/pages/feeds.css'

// Core utilities and configuration  
import { initializeFeatureFlags } from './utils/feature-flags.js'
import './utils/include-nav.js'

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

// Feeds page specific modules
import './modules/feeds-page.js'

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
    trackPageView('feeds');
    
    // Set up activity tracking
    ['click', 'scroll', 'mousemove', 'keypress'].forEach(event => {
      document.addEventListener(event, trackActivity, { passive: true });
    });
    
    // Start preloading system
    await initializePreloading();
    
    // Start idle preloading
    startIdlePreload();
    
    console.log('API preloading system initialized for feeds page');
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
    
    console.log('Feature flags loaded, Feeds page initialized via Vite');
  } catch (error) {
    console.warn('Failed to load feature flags:', error);
    console.log('Feeds page initialized via Vite (with default flags)');
  }
}

initialize();
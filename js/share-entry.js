// Share page entry point for Vite build system

// Import CSS
import '../css/main.css'

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

// Share page specific modules
import './modules/share-features.js'  
import './modules/share-functionality.js'


// Initialize feature flags first
async function initialize() {
  try {
    await initializeFeatureFlags();
    
    console.log('Feature flags loaded, Share page initialized via Vite');
  } catch (error) {
    console.warn('Failed to load feature flags:', error);
    console.log('Share page initialized via Vite (with default flags)');
  }
}

initialize();
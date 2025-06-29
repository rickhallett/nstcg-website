// Share page entry point for Vite build system

// CSS is now loaded directly in HTML to prevent FOUC

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

// Helper functions from main.js needed for social sharing
window.generateShareText = function(count, userComment) {
  const baseMessage = `I just joined ${count} Neighbours fighting for safer streets in North Swanage! The proposed traffic changes could flood our residential streets with dangerous traffic.`;

  if (userComment) {
    return `${baseMessage} My reason: "${userComment}" Take action now:`;
  }

  return `${baseMessage} Take action before it's too late:`;
};

window.getShareUrl = async function(platform = 'direct') {
  // Get or generate referral code using centralized logic (now async)
  const referralCode = await window.ReferralUtils.getUserReferralCode();
  
  // Get platform code
  const platformCode = window.ReferralUtils.PLATFORM_CODES[platform] || 'dr';
  
  // Return URL with both ref and src parameters
  const baseUrl = window.location.origin;
  return `${baseUrl}?ref=${referralCode}&src=${platformCode}`;
};

// Override social functions to use main.js implementations
window.shareOnTwitter = async function(count, userComment) {
  const text = window.generateShareText(count, userComment);
  const url = await window.getShareUrl('twitter');
  const hashtags = 'SaveNorthSwanage,TrafficSafety';
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${hashtags}`;
  window.open(twitterUrl, '_blank', 'width=550,height=420');
};

window.shareOnFacebook = async function() {
  const url = await window.getShareUrl('facebook');
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  window.open(facebookUrl, '_blank', 'width=550,height=420');
};

window.shareOnWhatsApp = async function(count, userComment) {
  const text = window.generateShareText(count, userComment);
  const url = await window.getShareUrl('whatsapp');
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
  window.open(whatsappUrl, '_blank');
};

window.shareOnLinkedIn = async function(count, userComment) {
  const text = window.generateShareText(count, userComment);
  const url = await window.getShareUrl('linkedin');
  // LinkedIn shareActive only supports text parameter - include URL within text
  const fullText = `${text} ${url}`;
  const linkedInUrl = `https://www.linkedin.com/feed/?shareActive&mini=true&text=${encodeURIComponent(fullText)}`;
  window.open(linkedInUrl, '_blank', 'width=550,height=520');
};

window.shareOnInstagram = shareOnInstagram;
window.shareByEmail = shareByEmail;
window.shareNative = shareNative;
window.addSocialShareButtons = addSocialShareButtons;
window.showToast = showToast;

// Helper to generate referral code - use centralized version
window.generateReferralCode = window.ReferralUtils.getUserReferralCode;

// Share page specific modules
import './modules/share-features.js'  
import './modules/share-functionality.js'

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
    trackPageView('share');
    
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
    
    console.log('API preloading system initialized for share page');
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
    
    console.log('Feature flags loaded, Share page initialized via Vite');
  } catch (error) {
    console.warn('Failed to load feature flags:', error);
    console.log('Share page initialized via Vite (with default flags)');
  }
}

initialize();
/**
 * Shared utilities for referral codes and social sharing
 * Ensures consistency across all referral tracking implementations
 */

// Create global namespace if it doesn't exist
window.ReferralUtils = window.ReferralUtils || {};

// Platform codes mapping for consistent tracking
window.ReferralUtils.PLATFORM_CODES = {
  twitter: 'TW',
  facebook: 'FB',
  whatsapp: 'WA',
  linkedin: 'LI',
  email: 'EM',
  copy: 'CP'
};

// Platform names for display
window.ReferralUtils.PLATFORM_NAMES = {
  twitter: 'Twitter',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  linkedin: 'LinkedIn',
  email: 'Email',
  copy: 'Copy Link'
};

/**
 * Generate a unique referral code for a user
 * Format: [FirstName3Letters][Timestamp4][Random4]
 * Example: JOH1a2b3c4d
 * 
 * @param {string} firstName - User's first name
 * @returns {string} Generated referral code
 */
window.ReferralUtils.generateReferralCode = function(firstName = 'USER') {
  const prefix = firstName.slice(0, 3).toUpperCase();
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

/**
 * Get or generate user's referral code with persistence
 * This is the SINGLE source of truth for getting a user's referral code
 * 
 * @returns {Promise<string>} User's persisted referral code
 */
window.ReferralUtils.getUserReferralCode = async function() {
  // Check if already persisted
  let code = localStorage.getItem('nstcg_referral_code');
  if (code) return code;
  
  // If user is registered, try to fetch from server
  const email = localStorage.getItem('nstcg_email');
  const userId = localStorage.getItem('nstcg_user_id');
  
  if (email || userId) {
    try {
      const stats = await window.ReferralUtils.fetchUserStats(email, userId);
      if (stats && stats.referralCode) {
        // Store the server-generated code
        localStorage.setItem('nstcg_referral_code', stats.referralCode);
        return stats.referralCode;
      }
    } catch (error) {
      console.warn('Failed to fetch referral code from server:', error);
    }
  }
  
  // Generate new one if needed (for unregistered users)
  const firstName = localStorage.getItem('nstcg_first_name') || 'USER';
  code = window.ReferralUtils.generateReferralCode(firstName);
  localStorage.setItem('nstcg_referral_code', code);
  return code;
}

/**
 * Fetch user stats from the server
 * 
 * @param {string} email - User's email
 * @param {string} userId - User's ID
 * @returns {Promise<Object|null>} User stats including referral code
 */
window.ReferralUtils.fetchUserStats = async function(email, userId) {
  try {
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    if (userId) params.append('user_id', userId);
    
    const response = await fetch(`/api/get-user-stats?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user stats');
    }
    
    const data = await response.json();
    if (data.exists && data.stats) {
      return data.stats;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return null;
  }
}

/**
 * Generate a share URL with referral tracking
 * Format: https://example.com?ref=[referralCode]
 * 
 * @param {string} referralCode - User's referral code
 * @param {string} platform - Optional platform identifier
 * @returns {string} Complete share URL
 */
window.ReferralUtils.generateShareUrl = function(referralCode, platform = null) {
  const baseUrl = window.location.origin;
  
  // For consistency, we'll use just the referral code in the URL
  // Platform tracking will be handled separately via API
  return `${baseUrl}?ref=${referralCode}`;
}

/**
 * Parse referral information from URL parameters
 * Handles both legacy format (platform-userId) and new format (referralCode)
 * 
 * @param {URLSearchParams} params - URL search parameters
 * @returns {Object} Parsed referral info { referralCode, platform, isLegacy }
 */
window.ReferralUtils.parseReferralFromUrl = function(params) {
  const ref = params.get('ref');
  
  if (!ref) {
    return { referralCode: null, platform: null, isLegacy: false };
  }
  
  // Check if it's legacy format (contains dash)
  if (ref.includes('-')) {
    const parts = ref.split('-');
    const platformCode = parts[0];
    const userId = parts.slice(1).join('-');
    
    // Find platform from code
    const platform = Object.entries(window.ReferralUtils.PLATFORM_CODES).find(([_, code]) => code === platformCode)?.[0];
    
    return {
      referralCode: userId, // In legacy format, userId is the referral identifier
      platform: platform || 'unknown',
      isLegacy: true
    };
  }
  
  // New format - just the referral code
  return {
    referralCode: ref,
    platform: null,
    isLegacy: false
  };
}

/**
 * Track a share action via API
 * 
 * @param {Object} shareData - Share tracking data
 * @param {string} shareData.email - User's email
 * @param {string} shareData.platform - Platform identifier
 * @param {string} shareData.referralCode - User's referral code
 * @returns {Promise<Object>} API response
 */
window.ReferralUtils.trackShare = async function({ email, platform, referralCode }) {
  try {
    // Get user's name from localStorage
    const firstName = localStorage.getItem('nstcg_first_name') || '';
    const lastName = localStorage.getItem('nstcg_last_name') || '';
    
    const response = await fetch('/api/track-share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        platform: platform.toLowerCase(),
        referral_code: referralCode,
        first_name: firstName,
        last_name: lastName
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to track share');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error tracking share:', error);
    throw error;
  }
}

/**
 * Get share URLs for all platforms
 * 
 * @param {string} referralCode - User's referral code
 * @param {string} shareText - Text to share
 * @returns {Object} Platform-specific share URLs
 */
window.ReferralUtils.getShareUrls = function(referralCode, shareText = '') {
  const shareUrl = window.ReferralUtils.generateShareUrl(referralCode);
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);
  
  return {
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    email: `mailto:?subject=${encodeURIComponent('Join me in opposing the North Swanage traffic plans')}&body=${encodedText}%20${encodedUrl}`,
    copy: shareUrl
  };
}

/**
 * Copy text to clipboard with fallback
 * 
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
window.ReferralUtils.copyToClipboard = async function(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      
      try {
        document.execCommand('copy');
        return true;
      } finally {
        document.body.removeChild(textArea);
      }
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Show a temporary success message
 * 
 * @param {HTMLElement} element - Element to show message on
 * @param {string} message - Message to display
 * @param {number} duration - Duration in milliseconds
 */
window.ReferralUtils.showSuccessMessage = function(element, message, duration = 2000) {
  const originalText = element.textContent;
  element.textContent = message;
  element.classList.add('success');
  
  setTimeout(() => {
    element.textContent = originalText;
    element.classList.remove('success');
  }, duration);
}

/**
 * Initialize share buttons with tracking
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.containerSelector - Selector for share buttons container
 * @param {string} options.referralCode - User's referral code
 * @param {string} options.email - User's email for tracking
 * @param {string} options.shareText - Text to share
 * @param {Function} options.onShare - Callback after successful share
 */
window.ReferralUtils.initializeShareButtons = function(options) {
  const {
    containerSelector,
    referralCode,
    email,
    shareText = 'Join me in opposing the North Swanage traffic plans',
    onShare = () => {}
  } = options;
  
  const container = document.querySelector(containerSelector);
  if (!container) return;
  
  const shareUrls = window.ReferralUtils.getShareUrls(referralCode, shareText);
  
  // Set up click handlers for each platform
  Object.entries(window.ReferralUtils.PLATFORM_CODES).forEach(([platform, code]) => {
    const button = container.querySelector(`[data-platform="${platform}"]`);
    if (!button) return;
    
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      
      try {
        // Track the share
        if (email) {
          await window.ReferralUtils.trackShare({ email, platform, referralCode });
        }
        
        // Handle the share action
        if (platform === 'copy') {
          const success = await window.ReferralUtils.copyToClipboard(shareUrls.copy);
          if (success) {
            window.ReferralUtils.showSuccessMessage(button, 'Link Copied!');
          }
        } else {
          // Open share window
          window.open(shareUrls[platform], '_blank', 'width=600,height=400');
        }
        
        // Call the callback
        onShare(platform);
        
      } catch (error) {
        console.error(`Error sharing on ${platform}:`, error);
      }
    });
  });
}

// Make utilities available globally
export default window.ReferralUtils;
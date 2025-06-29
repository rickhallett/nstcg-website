/**
 * Share Page Functionality
 * 
 * Handles referral link generation, social sharing, and stats display
 */

// State
let userStats = null;
let referralLink = '';
let userEmail = '';
let userId = '';

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async function() {
  // Prevent auto-scroll on mobile
  if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    // Scroll to top immediately
    window.scrollTo(0, 0);
    
    // Prevent scroll on focus
    document.addEventListener('focusin', function(e) {
      if (e.target.id === 'referral-link') {
        e.preventDefault();
      }
    });
  }
  
  // Get user data from localStorage
  userEmail = localStorage.getItem('nstcg_email') || '';
  userId = localStorage.getItem('nstcg_user_id') || '';
  const firstName = localStorage.getItem('nstcg_first_name') || '';
  
  // Check if user is registered
  if (!userEmail && !userId) {
    // Redirect to home page with message
    window.location.href = '/?message=please-register-first';
    return;
  }
  
  // Load user stats
  await loadUserStats();
  
  // Generate referral link
  generateReferralLink();
  
  // Setup event listeners
  setupEventListeners();
  
  // Initialize social share buttons
  initializeSocialButtons();
  
  // Check for share completion
  checkShareCompletion();
});

/**
 * Load user statistics from API
 */
async function loadUserStats() {
  try {
    const params = new URLSearchParams();
    if (userEmail) params.append('email', userEmail);
    if (userId) params.append('user_id', userId);
    
    const response = await fetch(`/api/get-user-stats?${params}`);
    const data = await response.json();
    
    if (data.stats) {
      userStats = data.stats;
      updateStatsDisplay();
      
      // Store referral code if we got one
      if (userStats.referralCode) {
        localStorage.setItem('nstcg_referral_code', userStats.referralCode);
      }
    }
  } catch (error) {
    console.error('Error loading user stats:', error);
    // Show error message
    showNotification('Unable to load your stats. Please try again later.', 'error');
  }
}

/**
 * Update stats display
 */
function updateStatsDisplay() {
  if (!userStats) return;
  
  // Points display removed - feature disabled
  
  // Update referrals
  const referralsEl = document.getElementById('user-referrals');
  if (referralsEl) {
    animateNumber(referralsEl, userStats.directReferrals);
  }
  
  // Rank display removed - leaderboard feature disabled
}

/**
 * Generate referral link
 */
function generateReferralLink() {
  let referralCode = userStats?.referralCode || localStorage.getItem('nstcg_referral_code');
  
  if (!referralCode) {
    // Generate a new referral code if none exists
    const firstName = localStorage.getItem('nstcg_first_name') || 'USER';
    referralCode = window.ReferralUtils.generateReferralCode(firstName);
    localStorage.setItem('nstcg_referral_code', referralCode);
  }
  
  // Build referral URL using shared utility
  referralLink = window.ReferralUtils.generateShareUrl(referralCode);
  
  // Update input field
  const linkInput = document.getElementById('referral-link');
  if (linkInput) {
    linkInput.value = referralLink;
    
    // Prevent mobile keyboard and scrolling issues
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      linkInput.setAttribute('readonly', 'readonly');
      linkInput.addEventListener('click', function(e) {
        e.preventDefault();
        this.select();
        copyReferralLink();
      });
    }
  }
}

// Referral code generation moved to ReferralUtils

/**
 * Initialize social share buttons
 */
async function initializeSocialButtons() {
  try {
    // Get participant count
    const response = await fetch('/api/get-count');
    const data = await response.json();
    const count = data.count || 0;
    
    // Get user comment from localStorage
    const userComment = localStorage.getItem('nstcg_comment') || '';
    
    // Add social share buttons using the common function
    if (window.addSocialShareButtons) {
      window.addSocialShareButtons('share-social-buttons', count, userComment, false);
    }
  } catch (error) {
    console.error('Error initializing social buttons:', error);
    // Still add buttons even if count fetch fails
    if (window.addSocialShareButtons) {
      window.addSocialShareButtons('share-social-buttons', 0, '', false);
    }
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Copy button
  const copyBtn = document.getElementById('copy-link-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', copyReferralLink);
  }
  
  // Note: Share button event listeners are now handled by addSocialShareButtons
}

/**
 * Copy referral link to clipboard
 */
async function copyReferralLink() {
  const copyBtn = document.getElementById('copy-link-btn');
  
  try {
    const success = await window.ReferralUtils.copyToClipboard(referralLink);
    
    if (success) {
      // Show success feedback
      const copyText = copyBtn.querySelector('.copy-text');
      const copiedText = copyBtn.querySelector('.copied-text');
      
      copyText.style.display = 'none';
      copiedText.style.display = 'inline';
      
      setTimeout(() => {
        copyText.style.display = 'inline';
        copiedText.style.display = 'none';
      }, 2000);
      
      showNotification('Link copied to clipboard!', 'success');
    } else {
      showNotification('Failed to copy link. Please try selecting and copying manually.', 'error');
    }
  } catch (error) {
    console.error('Failed to copy:', error);
    showNotification('Failed to copy link. Please try selecting and copying manually.', 'error');
  }
}

/**
 * Share on social platform
 */
async function shareOnPlatform(platform) {
  const shareMessages = {
    twitter: `🚨 North Swanage residents: Our streets are at risk! Join me in the fight against dangerous traffic changes. Every voice counts! ${referralLink} #NorthSwanage #TrafficSafety`,
    facebook: `Important for North Swanage residents! The proposed Nassau traffic initiative could flood our quiet streets with dangerous levels of traffic. I've joined the community campaign - will you? ${referralLink}`,
    whatsapp: `Hi! This is really important for our neighbourhood. The council is planning traffic changes that could make our streets dangerous. Please take 2 minutes to join the campaign: ${referralLink}`,
    email: {
      subject: 'Urgent: North Swanage Traffic Safety - We Need Your Voice',
      body: `Hi,

I wanted to let you know about something important happening in North Swanage.

The proposed Nassau traffic initiative could redirect significant traffic through our residential streets, making them dangerous for our families and children.

Our community is coming together to voice our concerns, and every signature matters. It only takes 2 minutes to join.

Please visit: ${referralLink}

Together, we can keep our streets safe.

Thank you!`
    }
  };
  
  let shareUrl = '';
  
  switch (platform) {
    case 'twitter':
      shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessages.twitter)}`;
      break;
      
    case 'facebook':
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}&quote=${encodeURIComponent(shareMessages.facebook)}`;
      break;
      
    case 'whatsapp':
      shareUrl = `https://wa.me/?text=${encodeURIComponent(shareMessages.whatsapp)}`;
      break;
      
    case 'email':
      const emailData = shareMessages.email;
      shareUrl = `mailto:?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body)}`;
      break;
  }
  
  if (shareUrl) {
    // Track the share
    await trackShare(platform);
    
    // Open share window/app
    if (platform === 'email') {
      window.location.href = shareUrl;
    } else {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  }
}

/**
 * Track share action
 */
async function trackShare(platform) {
  try {
    const data = await window.ReferralUtils.trackShare({
      email: userEmail,
      platform: platform,
      referralCode: userStats?.referralCode || localStorage.getItem('nstcg_referral_code')
    });
    
    if (data.success) {
      // Points system removed - no points awarded for shares
      
      // Store share action
      sessionStorage.setItem(`shared_${platform}`, 'true');
      
      // Check if daily limit reached
      if (data.daily_shares_remaining === 0) {
        showNotification(`Daily ${platform} share limit reached`, 'info');
      }
    }
  } catch (error) {
    console.error('Error tracking share:', error);
    // Don't show error to user - sharing still worked
  }
}

/**
 * Check if returning from share
 */
function checkShareCompletion() {
  // Check if we have pending share tracking
  const urlParams = new URLSearchParams(window.location.search);
  const platform = urlParams.get('shared');
  
  if (platform && !sessionStorage.getItem(`shared_${platform}_tracked`)) {
    trackShare(platform);
    sessionStorage.setItem(`shared_${platform}_tracked`, 'true');
    
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

/**
 * Animate number change
 */
function animateNumber(element, targetValue) {
  const startValue = parseInt(element.textContent) || 0;
  const duration = 1000;
  const startTime = Date.now();
  
  function update() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    
    const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutQuart);
    element.textContent = currentValue;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  
  requestAnimationFrame(update);
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // Style the notification
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const topPosition = isMobile ? '80px' : '20px'; // Below nav on mobile
  
  notification.style.cssText = `
    position: fixed;
    top: ${topPosition};
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 10px;
    font-weight: 500;
    z-index: 1000;
    animation: slideIn 0.3s ease;
    max-width: 300px;
  `;
  
  // Type-specific styles
  const styles = {
    success: 'background: #10b981; color: white;',
    error: 'background: #ef4444; color: white;',
    info: 'background: #3b82f6; color: white;'
  };
  
  notification.style.cssText += styles[type] || styles.info;
  
  document.body.appendChild(notification);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add notification animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
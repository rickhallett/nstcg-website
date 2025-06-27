/**
 * Social Sharing Module
 * @module Social
 */

import { AppConfig } from '../config/app.config.js';
import eventBus, { Events } from '../core/eventBus.js';
import stateManager from '../core/StateManager.js';
import { generateUserId } from './forms.js';
import { createShareButtons } from '../utils/templates.js';

/**
 * Social sharing configuration
 */
const SocialConfig = {
  platforms: {
    twitter: {
      name: 'X (Twitter)',
      icon: 'fab fa-x-twitter',
      color: '#000000',
      shareUrl: 'https://twitter.com/intent/tweet',
      params: ['text', 'url', 'hashtags']
    },
    facebook: {
      name: 'Facebook',
      icon: 'fab fa-facebook-f',
      color: '#1877f2',
      shareUrl: 'https://www.facebook.com/sharer/sharer.php',
      params: ['u']
    },
    whatsapp: {
      name: 'WhatsApp',
      icon: 'fab fa-whatsapp',
      color: '#25d366',
      shareUrl: 'https://wa.me/',
      params: ['text']
    },
    linkedin: {
      name: 'LinkedIn',
      icon: 'fab fa-linkedin-in',
      color: '#0077b5',
      shareUrl: 'https://www.linkedin.com/sharing/share-offsite/',
      params: ['url']
    },
    instagram: {
      name: 'Instagram',
      icon: 'fab fa-instagram',
      color: '#e4405f',
      shareUrl: null, // No direct share URL
      params: []
    },
    email: {
      name: 'Email',
      icon: 'fas fa-envelope',
      color: '#666666',
      shareUrl: 'mailto:',
      params: ['subject', 'body']
    }
  },

  messages: {
    baseMessage: 'I just joined {count} Neighbours fighting for safer streets in North Swanage! The proposed traffic changes could flood our residential streets with dangerous traffic.',
    withComment: '{baseMessage} My reason: "{comment}" Take action now:',
    withoutComment: '{baseMessage} Take action before it\'s too late:',
    emailSubject: 'Urgent: North Swanage Traffic Concern Group - We Need Your Help!',
    emailBody: `{text}

Visit: {url}

The North Swanage Traffic Concern Group is raising awareness about proposed traffic changes that could turn Shore Road into a one-way system, pushing dangerous levels of traffic onto our quiet residential streets. This affects everyone - our children's safety, property values, and quality of life.

Please take 2 minutes to join us and share with other Neighbours. Time is running out!`,
    hashtags: 'SaveNorthSwanage,TrafficSafety',
    toastMessage: 'Link copied! Share on Instagram Stories or Bio'
  },

  windowOptions: {
    default: 'width=550,height=420',
    linkedin: 'width=550,height=520'
  },

  referralCodes: {
    twitter: 'tw',
    facebook: 'fb',
    whatsapp: 'wa',
    linkedin: 'li',
    instagram: 'ig',
    email: 'em',
    direct: 'dr'
  }
};

/**
 * Social sharing manager class
 */
class SocialShareManager {
  constructor() {
    this.socialCodes = null;
    this.baseUrl = 'https://nstcg.org';
  }

  /**
   * Initialize social sharing
   */
  async init() {
    await this.loadSocialCodes();
    this.bindNativeShare();
  }

  /**
   * Load social referral codes
   * @private
   */
  async loadSocialCodes() {
    if (this.socialCodes) return this.socialCodes;

    try {
      const response = await fetch('/data/social-referral-codes.json');
      this.socialCodes = await response.json();
    } catch (error) {
      console.error('Error loading social codes:', error);
      this.socialCodes = { platforms: SocialConfig.referralCodes };
    }

    return this.socialCodes;
  }

  /**
   * Generate share text based on count and user comment
   * @param {number} count - Participant count
   * @param {string} userComment - User's comment
   * @returns {string} Share text
   */
  generateShareText(count, userComment) {
    const baseMessage = SocialConfig.messages.baseMessage.replace('{count}', count);

    if (userComment) {
      return SocialConfig.messages.withComment
        .replace('{baseMessage}', baseMessage)
        .replace('{comment}', userComment);
    }

    return SocialConfig.messages.withoutComment
      .replace('{baseMessage}', baseMessage);
  }


  /**
   * Get share URL with referral tracking
   * @param {string} platform - Social platform
   * @returns {Promise<string>} Share URL
   */
  async getShareUrl(platform = 'direct') {
    const userId = localStorage.getItem('nstcg_user_id') ||
      sessionStorage.getItem('userId') ||
      generateUserId();

    await this.loadSocialCodes();
    const platformCode = this.socialCodes.platforms[platform] || 'dr';
    
    // Use centralized referral code logic from ReferralUtils (now async)
    const referralCode = await window.ReferralUtils.getUserReferralCode();

    return `${this.baseUrl}?ref=${referralCode}&src=${platformCode}`;
  }

  /**
   * Share on Twitter/X
   * @param {number} count - Participant count
   * @param {string} userComment - User's comment
   */
  async shareOnTwitter(count, userComment) {
    const text = this.generateShareText(count, userComment);
    const url = await this.getShareUrl('twitter');
    const params = new URLSearchParams({
      text: text,
      url: url,
      hashtags: SocialConfig.messages.hashtags
    });

    this.openShareWindow(
      `${SocialConfig.platforms.twitter.shareUrl}?${params}`,
      'twitter'
    );

    this.trackShare('twitter', { count, hasComment: !!userComment });
  }

  /**
   * Share on Facebook
   */
  async shareOnFacebook() {
    const url = await this.getShareUrl('facebook');
    const params = new URLSearchParams({ u: url });

    this.openShareWindow(
      `${SocialConfig.platforms.facebook.shareUrl}?${params}`,
      'facebook'
    );

    this.trackShare('facebook');
  }

  /**
   * Share on WhatsApp
   * @param {number} count - Participant count
   * @param {string} userComment - User's comment
   */
  async shareOnWhatsApp(count, userComment) {
    const text = this.generateShareText(count, userComment);
    const url = await this.getShareUrl('whatsapp');
    const message = `${text} ${url}`;
    const params = new URLSearchParams({ text: message });

    this.openShareWindow(
      `${SocialConfig.platforms.whatsapp.shareUrl}?${params}`,
      'whatsapp'
    );

    this.trackShare('whatsapp', { count, hasComment: !!userComment });
  }

  /**
   * Share on LinkedIn
   * @param {number} count - Participant count
   * @param {string} userComment - User's comment
   */
  async shareOnLinkedIn(count, userComment) {
    const text = this.generateShareText(count, userComment);
    const url = await this.getShareUrl('linkedin');
    
    // LinkedIn shareActive only supports text parameter - include URL within text
    const fullText = `${text} ${url}`;
    const linkedInUrl = `https://www.linkedin.com/feed/?shareActive&mini=true&text=${encodeURIComponent(fullText)}`;
    
    this.openShareWindow(linkedInUrl, 'linkedin');

    this.trackShare('linkedin', { count, hasComment: !!userComment });
  }

  /**
   * Share on Instagram (copy to clipboard)
   */
  async shareOnInstagram() {
    const url = await this.getShareUrl('instagram');

    try {
      await navigator.clipboard.writeText(url);
      this.showToast(SocialConfig.messages.toastMessage);
    } catch (error) {
      // Fallback for older browsers
      this.copyToClipboardFallback(url);
      this.showToast(SocialConfig.messages.toastMessage);
    }

    this.trackShare('instagram');
  }

  /**
   * Share by email
   * @param {number} count - Participant count
   * @param {string} userComment - User's comment
   */
  async shareByEmail(count, userComment) {
    const text = this.generateShareText(count, userComment);
    const url = await this.getShareUrl('email');
    const body = SocialConfig.messages.emailBody
      .replace('{text}', text)
      .replace('{url}', url);

    const mailtoUrl = `mailto:?subject=${encodeURIComponent(SocialConfig.messages.emailSubject)}&body=${encodeURIComponent(body)}`;

    // Use a more reliable method to open email client
    try {
      // Method 1: Direct navigation (most reliable for mailto)
      window.location.href = mailtoUrl;
    } catch (error) {
      console.warn('Failed to open email client via location.href:', error);
      // Fallback: Create temporary anchor element and click it
      try {
        const link = document.createElement('a');
        link.href = mailtoUrl;
        // Don't use target="_blank" for mailto links
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error2) {
        console.warn('Failed to open email client via anchor element:', error2);
        // Last resort - window.open without target
        window.open(mailtoUrl);
      }
    }

    this.trackShare('email', { count, hasComment: !!userComment });
  }

  /**
   * Native share (Web Share API)
   * @param {number} count - Participant count
   * @param {string} userComment - User's comment
   */
  async shareNative(count, userComment) {
    if (!navigator.share) {
      console.warn('Native share not supported');
      return false;
    }

    const text = this.generateShareText(count, userComment);
    const url = await this.getShareUrl('direct');

    const shareData = {
      title: 'North Swanage Traffic Crisis',
      text: text,
      url: url
    };

    try {
      await navigator.share(shareData);
      this.trackShare('native', { count, hasComment: !!userComment });
      return true;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
      }
      return false;
    }
  }

  /**
   * Open share window
   * @private
   */
  openShareWindow(url, platform) {
    const options = SocialConfig.windowOptions[platform] || SocialConfig.windowOptions.default;
    window.open(url, '_blank', options);
  }

  /**
   * Copy to clipboard fallback
   * @private
   */
  copyToClipboardFallback(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }

  /**
   * Show toast notification
   * @param {string} message - Toast message
   */
  showToast(message) {
    // Remove any existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
      existingToast.remove();
    }

    // Create new toast
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
      <i class="fas fa-check-circle"></i>
      <span>${message}</span>
    `;

    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);

    eventBus.emit(Events.TOAST_SHOW, { message });
  }

  /**
   * Track share action
   * @private
   */
  trackShare(platform, data = {}) {
    eventBus.emit(Events.SOCIAL_SHARE, {
      platform,
      timestamp: Date.now(),
      ...data
    });

    // Update state
    const shares = stateManager.get('social.shares') || {};
    shares[platform] = (shares[platform] || 0) + 1;
    stateManager.set('social.shares', shares);
  }

  /**
   * Bind native share if available
   * @private
   */
  bindNativeShare() {
    if (navigator.share) {
      stateManager.set('features.nativeShare', true);
    }
  }

  /**
   * Add share buttons to container
   * @param {string} containerId - Container element ID
   * @param {number} count - Participant count
   * @param {string} userComment - User's comment
   * @param {boolean} isDisabled - Whether buttons are disabled
   */
  addShareButtons(containerId, count, userComment, isDisabled = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Check if share section already exists
    let shareSection = container.querySelector('.social-share-section');
    if (!shareSection) {
      shareSection = document.createElement('div');
      shareSection.className = 'social-share-section';
      container.appendChild(shareSection);
    }

    // Create share buttons HTML
    const shareButtons = this.createShareButtonsHTML(count, userComment, isDisabled);
    shareSection.innerHTML = shareButtons;

    // Bind button events if not disabled
    if (!isDisabled) {
      this.bindShareButtons(shareSection, count, userComment);
    }
  }

  /**
   * Create share buttons HTML
   * @private
   */
  createShareButtonsHTML(count, userComment, isDisabled) {
    const disabledAttr = isDisabled ? 'disabled' : '';

    return `
      <h4 class="social-share-title">🔊 Spread the Word - Every Share Matters!</h4>
      <div class="social-share-buttons-icons">
        ${Object.entries(SocialConfig.platforms).map(([key, platform]) => `
          <button class="share-btn-icon ${key}" 
                  title="Share on ${platform.name}"
                  data-platform="${key}"
                  ${disabledAttr}>
            <i class="${platform.icon}"></i>
          </button>
        `).join('')}
        ${navigator.share ? `
          <button class="share-btn-icon native" 
                  title="Share"
                  data-platform="native"
                  ${disabledAttr}>
            <i class="fas fa-share-alt"></i>
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * Bind share button events
   * @private
   */
  bindShareButtons(container, count, userComment) {
    const buttons = container.querySelectorAll('.share-btn-icon');

    buttons.forEach(button => {
      button.addEventListener('click', async (e) => {
        const platform = e.currentTarget.dataset.platform;

        switch (platform) {
          case 'twitter':
            await this.shareOnTwitter(count, userComment);
            break;
          case 'facebook':
            await this.shareOnFacebook();
            break;
          case 'whatsapp':
            await this.shareOnWhatsApp(count, userComment);
            break;
          case 'linkedin':
            await this.shareOnLinkedIn(count, userComment);
            break;
          case 'instagram':
            await this.shareOnInstagram();
            break;
          case 'email':
            await this.shareByEmail(count, userComment);
            break;
          case 'native':
            await this.shareNative(count, userComment);
            break;
        }
      });
    });
  }
}

// Add social event constants
export const SocialEvents = {
  SOCIAL_SHARE: 'social:share',
  SOCIAL_SHARE_SUCCESS: 'social:share:success',
  SOCIAL_SHARE_ERROR: 'social:share:error'
};

// Add to main Events object
Object.assign(Events, SocialEvents);

// Create singleton instance
const socialShareManager = new SocialShareManager();

// Export functions for backward compatibility
export const shareOnTwitter = (count, comment) => socialShareManager.shareOnTwitter(count, comment);
export const shareOnFacebook = () => socialShareManager.shareOnFacebook();
export const shareOnWhatsApp = (count, comment) => socialShareManager.shareOnWhatsApp(count, comment);
export const shareOnLinkedIn = (count, comment) => socialShareManager.shareOnLinkedIn(count, comment);
export const shareOnInstagram = () => socialShareManager.shareOnInstagram();
export const shareByEmail = (count, comment) => socialShareManager.shareByEmail(count, comment);
export const shareNative = (count, comment) => socialShareManager.shareNative(count, comment);
export const addSocialShareButtons = (containerId, count, comment, isDisabled) =>
  socialShareManager.addShareButtons(containerId, count, comment, isDisabled);
export const showToast = (message) => socialShareManager.showToast(message);

// Export classes and instance
export default socialShareManager;
export { SocialShareManager, socialShareManager };
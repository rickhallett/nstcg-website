/**
 * Share Buttons Component
 * @module ShareButtons
 */

import { AppConfig } from '../config/app.config.js';
import eventBus, { Events } from '../core/eventBus.js';
import stateManager from '../core/StateManager.js';
import socialShareManager from '../modules/social.js';

/**
 * Share Buttons configuration
 */
const ShareButtonsConfig = {
  platforms: {
    facebook: {
      name: 'Facebook',
      icon: 'fab fa-facebook-f',
      color: '#1877f2',
      order: 1
    },
    twitter: {
      name: 'X (Twitter)',
      icon: 'fab fa-x-twitter',
      color: '#000000',
      order: 2
    },
    whatsapp: {
      name: 'WhatsApp',
      icon: 'fab fa-whatsapp',
      color: '#25d366',
      order: 3
    },
    linkedin: {
      name: 'LinkedIn',
      icon: 'fab fa-linkedin-in',
      color: '#0077b5',
      order: 4
    },
    instagram: {
      name: 'Instagram',
      icon: 'fab fa-instagram',
      color: '#e4405f',
      order: 5
    },
    email: {
      name: 'Email',
      icon: 'fas fa-envelope',
      color: '#666666',
      order: 6
    },
    native: {
      name: 'Share',
      icon: 'fas fa-share-alt',
      color: '#333333',
      order: 7,
      requiresNativeShare: true
    }
  },
  
  styles: {
    container: 'social-share-section',
    buttonsWrapper: 'social-share-buttons-icons',
    button: 'share-btn-icon',
    title: 'social-share-title',
    impactText: 'share-impact-text'
  },
  
  messages: {
    title: '🔊 Spread the Word - Every Share Matters!',
    impactText: 'Your voice amplifies our message. Together we\'re stronger! 💪',
    loadingText: 'Preparing share options...',
    errorText: 'Share options temporarily unavailable'
  },
  
  animation: {
    hoverScale: 1.1,
    clickScale: 0.95,
    transitionDuration: 200
  }
};

/**
 * Share Buttons Component class
 */
class ShareButtonsComponent {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = null;
    this.config = { ...ShareButtonsConfig, ...options };
    
    this.state = {
      count: 0,
      userComment: null,
      isDisabled: false,
      isLoading: false,
      platforms: this.getAvailablePlatforms()
    };
    
    this.buttons = new Map();
    this.listeners = new Map();
  }

  /**
   * Initialize the component
   * @param {number} count - Participant count
   * @param {string} userComment - User's comment
   * @param {boolean} isDisabled - Whether buttons are disabled
   */
  init(count = 0, userComment = null, isDisabled = false) {
    this.state.count = count;
    this.state.userComment = userComment;
    this.state.isDisabled = isDisabled;
    
    // Get or validate container
    if (typeof this.containerId === 'string') {
      this.container = document.getElementById(this.containerId);
    } else {
      this.container = this.containerId;
    }
    
    if (!this.container) {
      console.error(`Share buttons container not found: ${this.containerId}`);
      return;
    }
    
    // Render the component
    this.render();
    
    // Bind events if not disabled
    if (!isDisabled) {
      this.bindEvents();
    }
    
    // Emit initialized event
    eventBus.emit(Events.SHARE_BUTTONS_INITIALIZED, {
      containerId: this.containerId,
      count,
      platforms: this.state.platforms
    });
  }

  /**
   * Get available platforms based on environment
   * @private
   */
  getAvailablePlatforms() {
    const platforms = { ...this.config.platforms };
    
    // Remove native share if not supported
    if (!navigator.share && platforms.native) {
      delete platforms.native;
    }
    
    // Sort by order
    return Object.entries(platforms)
      .sort(([, a], [, b]) => a.order - b.order)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});
  }

  /**
   * Render the component
   */
  render() {
    // Check if share section already exists
    let shareSection = this.container.querySelector(`.${this.config.styles.container}`);
    if (!shareSection) {
      shareSection = document.createElement('div');
      shareSection.className = this.config.styles.container;
      this.container.appendChild(shareSection);
    }
    
    // Build HTML
    const html = this.buildHTML();
    shareSection.innerHTML = html;
    
    // Store button references
    this.storeButtonReferences();
    
    // Update state
    stateManager.set('shareButtons.rendered', true);
    stateManager.set('shareButtons.count', this.state.count);
  }

  /**
   * Build component HTML
   * @private
   */
  buildHTML() {
    const { isDisabled, isLoading } = this.state;
    const { title, impactText, loadingText } = this.config.messages;
    
    return `
      <h4 class="${this.config.styles.title}">${title}</h4>
      <div class="${this.config.styles.buttonsWrapper}">
        ${this.buildButtonsHTML()}
      </div>
      <p class="${this.config.styles.impactText}">
        ${isDisabled ? (isLoading ? loadingText : impactText) : impactText}
      </p>
    `;
  }

  /**
   * Build buttons HTML
   * @private
   */
  buildButtonsHTML() {
    const { isDisabled } = this.state;
    
    return Object.entries(this.state.platforms).map(([key, platform]) => {
      const disabledAttr = isDisabled ? 'disabled' : '';
      const ariaLabel = `Share on ${platform.name}`;
      
      return `
        <button class="${this.config.styles.button} ${key}" 
                title="${ariaLabel}"
                aria-label="${ariaLabel}"
                data-platform="${key}"
                ${disabledAttr}>
          <i class="${platform.icon}" aria-hidden="true"></i>
        </button>
      `;
    }).join('');
  }

  /**
   * Store button references
   * @private
   */
  storeButtonReferences() {
    const buttonsWrapper = this.container.querySelector(`.${this.config.styles.buttonsWrapper}`);
    if (!buttonsWrapper) return;
    
    const buttons = buttonsWrapper.querySelectorAll(`.${this.config.styles.button}`);
    buttons.forEach(button => {
      const platform = button.dataset.platform;
      this.buttons.set(platform, button);
    });
  }

  /**
   * Bind events
   * @private
   */
  bindEvents() {
    this.buttons.forEach((button, platform) => {
      // Create event listener
      const listener = this.createClickListener(platform);
      
      // Store listener reference for cleanup
      this.listeners.set(platform, listener);
      
      // Add event listener
      button.addEventListener('click', listener);
      
      // Add hover effects
      this.addHoverEffects(button);
    });
  }

  /**
   * Create click listener for platform
   * @private
   */
  createClickListener(platform) {
    return async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (this.state.isDisabled || this.state.isLoading) return;
      
      // Add click animation
      this.animateClick(e.currentTarget);
      
      // Handle share action
      await this.handleShare(platform);
    };
  }

  /**
   * Handle share action
   * @private
   */
  async handleShare(platform) {
    const { count, userComment } = this.state;
    
    try {
      // Emit pre-share event
      eventBus.emit(Events.SHARE_BUTTON_CLICK, { platform, count, userComment });
      
      // Call appropriate share method
      switch (platform) {
        case 'twitter':
          await socialShareManager.shareOnTwitter(count, userComment);
          break;
        case 'facebook':
          await socialShareManager.shareOnFacebook();
          break;
        case 'whatsapp':
          await socialShareManager.shareOnWhatsApp(count, userComment);
          break;
        case 'linkedin':
          await socialShareManager.shareOnLinkedIn();
          break;
        case 'instagram':
          await socialShareManager.shareOnInstagram();
          break;
        case 'email':
          await socialShareManager.shareByEmail(count, userComment);
          break;
        case 'native':
          await socialShareManager.shareNative(count, userComment);
          break;
      }
      
      // Emit success event
      eventBus.emit(Events.SHARE_BUTTON_SUCCESS, { platform, count, userComment });
      
    } catch (error) {
      console.error(`Share failed for ${platform}:`, error);
      
      // Emit error event
      eventBus.emit(Events.SHARE_BUTTON_ERROR, { platform, error });
    }
  }

  /**
   * Add hover effects to button
   * @private
   */
  addHoverEffects(button) {
    const { hoverScale, transitionDuration } = this.config.animation;
    
    button.style.transition = `transform ${transitionDuration}ms ease`;
    
    button.addEventListener('mouseenter', () => {
      if (!this.state.isDisabled) {
        button.style.transform = `scale(${hoverScale})`;
      }
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
    });
  }

  /**
   * Animate button click
   * @private
   */
  animateClick(button) {
    const { clickScale, transitionDuration } = this.config.animation;
    
    button.style.transform = `scale(${clickScale})`;
    
    setTimeout(() => {
      button.style.transform = 'scale(1)';
    }, transitionDuration);
  }

  /**
   * Update component state
   * @param {Object} updates - State updates
   */
  updateState(updates) {
    this.state = { ...this.state, ...updates };
    
    // Re-render if needed
    if (updates.count !== undefined || updates.userComment !== undefined) {
      this.updateShareData(updates.count || this.state.count, updates.userComment || this.state.userComment);
    }
    
    if (updates.isDisabled !== undefined) {
      this.setDisabled(updates.isDisabled);
    }
  }

  /**
   * Update share data
   * @param {number} count - New count
   * @param {string} userComment - New comment
   */
  updateShareData(count, userComment) {
    this.state.count = count;
    this.state.userComment = userComment;
    
    // Re-bind events with new data
    this.unbindEvents();
    if (!this.state.isDisabled) {
      this.bindEvents();
    }
    
    // Update state
    stateManager.set('shareButtons.count', count);
    
    // Emit update event
    eventBus.emit(Events.SHARE_BUTTONS_UPDATED, { count, userComment });
  }

  /**
   * Enable/disable buttons
   * @param {boolean} disabled - Disabled state
   */
  setDisabled(disabled) {
    this.state.isDisabled = disabled;
    
    this.buttons.forEach(button => {
      button.disabled = disabled;
      
      if (disabled) {
        button.style.opacity = '0.5';
        button.style.cursor = 'not-allowed';
      } else {
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
      }
    });
    
    // Update impact text
    const impactText = this.container.querySelector(`.${this.config.styles.impactText}`);
    if (impactText) {
      impactText.textContent = disabled ? 
        this.config.messages.loadingText : 
        this.config.messages.impactText;
    }
    
    // Bind/unbind events
    if (disabled) {
      this.unbindEvents();
    } else {
      this.bindEvents();
    }
  }

  /**
   * Set loading state
   * @param {boolean} loading - Loading state
   */
  setLoading(loading) {
    this.state.isLoading = loading;
    this.setDisabled(loading);
  }

  /**
   * Unbind events
   * @private
   */
  unbindEvents() {
    this.listeners.forEach((listener, platform) => {
      const button = this.buttons.get(platform);
      if (button) {
        button.removeEventListener('click', listener);
      }
    });
    this.listeners.clear();
  }

  /**
   * Destroy the component
   */
  destroy() {
    // Unbind events
    this.unbindEvents();
    
    // Clear references
    this.buttons.clear();
    
    // Remove from DOM
    const shareSection = this.container?.querySelector(`.${this.config.styles.container}`);
    if (shareSection) {
      shareSection.remove();
    }
    
    // Update state
    stateManager.set('shareButtons.rendered', false);
    
    // Emit destroyed event
    eventBus.emit(Events.SHARE_BUTTONS_DESTROYED, { containerId: this.containerId });
  }

  /**
   * Get button element by platform
   * @param {string} platform - Platform key
   * @returns {HTMLElement} Button element
   */
  getButton(platform) {
    return this.buttons.get(platform);
  }

  /**
   * Get all buttons
   * @returns {Map} All button elements
   */
  getAllButtons() {
    return new Map(this.buttons);
  }
}

// Add share buttons event constants
export const ShareButtonsEvents = {
  SHARE_BUTTONS_INITIALIZED: 'shareButtons:initialized',
  SHARE_BUTTONS_UPDATED: 'shareButtons:updated',
  SHARE_BUTTONS_DESTROYED: 'shareButtons:destroyed',
  SHARE_BUTTON_CLICK: 'shareButton:click',
  SHARE_BUTTON_SUCCESS: 'shareButton:success',
  SHARE_BUTTON_ERROR: 'shareButton:error'
};

// Add to main Events object
Object.assign(Events, ShareButtonsEvents);

// Export functions for backward compatibility
export const addSocialShareButtons = (containerId, count, userComment, isDisabled = false) => {
  const component = new ShareButtonsComponent(containerId);
  component.init(count, userComment, isDisabled);
  return component;
};

// Export classes
export default ShareButtonsComponent;
export { ShareButtonsComponent };
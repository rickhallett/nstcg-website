/**
 * Toast Notifications Component
 * @module Toast
 */

import { AppConfig } from '../config/app.config.js';
import eventBus, { Events } from '../core/eventBus.js';
import stateManager from '../core/StateManager.js';

/**
 * Toast configuration
 */
const ToastConfig = {
  animation: {
    showDelay: 10, // milliseconds before showing
    duration: 3000, // milliseconds to display
    hideTransition: 300 // milliseconds for hide animation
  },
  
  position: {
    vertical: 'bottom', // top, bottom, center
    horizontal: 'center', // left, center, right
    offset: {
      x: 20,
      y: 20
    }
  },
  
  types: {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
    DEFAULT: 'default'
  },
  
  icons: {
    success: 'fas fa-check-circle',
    error: 'fas fa-times-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle',
    default: 'fas fa-bell'
  },
  
  selectors: {
    container: '.toast-container',
    notification: '.toast-notification',
    icon: '.toast-icon',
    message: '.toast-message',
    closeBtn: '.toast-close'
  },
  
  classes: {
    show: 'show',
    hiding: 'hiding',
    type: 'toast-'
  }
};

/**
 * Toast class
 */
class Toast {
  constructor(message, options = {}) {
    this.id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.message = message;
    this.options = {
      type: ToastConfig.types.DEFAULT,
      duration: ToastConfig.animation.duration,
      icon: null,
      closable: true,
      persist: false,
      position: null,
      className: '',
      onShow: null,
      onHide: null,
      onClick: null,
      ...options
    };
    
    this.element = null;
    this.hideTimer = null;
    this.isShown = false;
  }

  /**
   * Create toast element
   * @private
   */
  createElement() {
    const toast = document.createElement('div');
    toast.id = this.id;
    toast.className = `toast-notification ${ToastConfig.classes.type}${this.options.type}`;
    
    if (this.options.className) {
      toast.className += ` ${this.options.className}`;
    }

    // Get icon
    const iconClass = this.options.icon || ToastConfig.icons[this.options.type] || ToastConfig.icons.default;
    
    // Build toast content
    let content = `
      <i class="${iconClass} toast-icon"></i>
      <span class="toast-message">${this.message}</span>
    `;
    
    if (this.options.closable) {
      content += `<button class="toast-close" aria-label="Close">
        <i class="fas fa-times"></i>
      </button>`;
    }
    
    toast.innerHTML = content;
    
    // Add event listeners
    if (this.options.closable) {
      const closeBtn = toast.querySelector('.toast-close');
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hide();
      });
    }
    
    if (this.options.onClick) {
      toast.style.cursor = 'pointer';
      toast.addEventListener('click', this.options.onClick);
    }
    
    this.element = toast;
    return toast;
  }

  /**
   * Show the toast
   */
  show() {
    if (this.isShown) return;
    
    // Create element if not exists
    if (!this.element) {
      this.createElement();
    }
    
    // Add to container or body
    const container = this.getContainer();
    container.appendChild(this.element);
    
    // Trigger animation
    setTimeout(() => {
      this.element.classList.add(ToastConfig.classes.show);
      this.isShown = true;
      
      // Emit event
      eventBus.emit(Events.TOAST_SHOW, {
        id: this.id,
        message: this.message,
        type: this.options.type
      });
      
      // Call callback
      if (this.options.onShow) {
        this.options.onShow(this);
      }
    }, ToastConfig.animation.showDelay);
    
    // Set auto-hide timer
    if (!this.options.persist && this.options.duration > 0) {
      this.hideTimer = setTimeout(() => {
        this.hide();
      }, this.options.duration);
    }
  }

  /**
   * Hide the toast
   */
  hide() {
    if (!this.isShown || !this.element) return;
    
    // Clear hide timer
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    
    // Start hide animation
    this.element.classList.add(ToastConfig.classes.hiding);
    this.element.classList.remove(ToastConfig.classes.show);
    
    // Remove after animation
    setTimeout(() => {
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      
      this.isShown = false;
      
      // Emit event
      eventBus.emit(Events.TOAST_HIDE, {
        id: this.id,
        message: this.message,
        type: this.options.type
      });
      
      // Call callback
      if (this.options.onHide) {
        this.options.onHide(this);
      }
      
      // Clean up container if empty
      this.cleanupContainer();
    }, ToastConfig.animation.hideTransition);
  }

  /**
   * Get or create container
   * @private
   */
  getContainer() {
    let container = document.querySelector(ToastConfig.selectors.container);
    
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      
      // Apply position
      const position = this.options.position || ToastConfig.position;
      container.setAttribute('data-position-v', position.vertical);
      container.setAttribute('data-position-h', position.horizontal);
      
      document.body.appendChild(container);
    }
    
    return container;
  }

  /**
   * Clean up empty container
   * @private
   */
  cleanupContainer() {
    const container = document.querySelector(ToastConfig.selectors.container);
    if (container && container.children.length === 0) {
      container.remove();
    }
  }

  /**
   * Update message
   * @param {string} message - New message
   */
  updateMessage(message) {
    this.message = message;
    if (this.element) {
      const messageEl = this.element.querySelector('.toast-message');
      if (messageEl) {
        messageEl.textContent = message;
      }
    }
  }

  /**
   * Reset timer
   */
  resetTimer() {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      
      if (!this.options.persist && this.options.duration > 0) {
        this.hideTimer = setTimeout(() => {
          this.hide();
        }, this.options.duration);
      }
    }
  }
}

/**
 * Toast Manager class
 */
class ToastManager {
  constructor() {
    this.toasts = new Map();
    this.queue = [];
    this.maxVisible = 5;
    this.defaultOptions = {};
  }

  /**
   * Show a toast
   * @param {string} message - Toast message
   * @param {Object} options - Toast options
   * @returns {Toast} Toast instance
   */
  show(message, options = {}) {
    const toast = new Toast(message, { ...this.defaultOptions, ...options });
    
    // Add to collection
    this.toasts.set(toast.id, toast);
    
    // Check if we can show immediately
    if (this.getVisibleCount() < this.maxVisible) {
      toast.show();
    } else {
      // Add to queue
      this.queue.push(toast);
    }
    
    // Set up auto-cleanup
    toast.options.onHide = () => {
      this.toasts.delete(toast.id);
      this.processQueue();
    };
    
    // Update state
    stateManager.set('toast.active', this.toasts.size);
    
    return toast;
  }

  /**
   * Show success toast
   * @param {string} message - Toast message
   * @param {Object} options - Toast options
   * @returns {Toast} Toast instance
   */
  success(message, options = {}) {
    return this.show(message, {
      ...options,
      type: ToastConfig.types.SUCCESS
    });
  }

  /**
   * Show error toast
   * @param {string} message - Toast message
   * @param {Object} options - Toast options
   * @returns {Toast} Toast instance
   */
  error(message, options = {}) {
    return this.show(message, {
      ...options,
      type: ToastConfig.types.ERROR,
      duration: 5000 // Longer duration for errors
    });
  }

  /**
   * Show warning toast
   * @param {string} message - Toast message
   * @param {Object} options - Toast options
   * @returns {Toast} Toast instance
   */
  warning(message, options = {}) {
    return this.show(message, {
      ...options,
      type: ToastConfig.types.WARNING
    });
  }

  /**
   * Show info toast
   * @param {string} message - Toast message
   * @param {Object} options - Toast options
   * @returns {Toast} Toast instance
   */
  info(message, options = {}) {
    return this.show(message, {
      ...options,
      type: ToastConfig.types.INFO
    });
  }

  /**
   * Hide a specific toast
   * @param {string} id - Toast ID
   */
  hide(id) {
    const toast = this.toasts.get(id);
    if (toast) {
      toast.hide();
    }
  }

  /**
   * Hide all toasts
   */
  hideAll() {
    this.toasts.forEach(toast => toast.hide());
    this.queue = [];
  }

  /**
   * Get visible toast count
   * @private
   */
  getVisibleCount() {
    let count = 0;
    this.toasts.forEach(toast => {
      if (toast.isShown) count++;
    });
    return count;
  }

  /**
   * Process queued toasts
   * @private
   */
  processQueue() {
    if (this.queue.length > 0 && this.getVisibleCount() < this.maxVisible) {
      const toast = this.queue.shift();
      if (toast) {
        toast.show();
      }
    }
  }

  /**
   * Set default options
   * @param {Object} options - Default options
   */
  setDefaults(options) {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }

  /**
   * Set max visible toasts
   * @param {number} max - Maximum visible toasts
   */
  setMaxVisible(max) {
    this.maxVisible = max;
  }

  /**
   * Get all active toasts
   * @returns {Array} Array of toast instances
   */
  getActiveToasts() {
    return Array.from(this.toasts.values());
  }
}

// Add toast event constants
export const ToastEvents = {
  TOAST_SHOW: 'toast:show',
  TOAST_HIDE: 'toast:hide',
  TOAST_UPDATE: 'toast:update',
  TOAST_CLICK: 'toast:click'
};

// Add to main Events object
Object.assign(Events, ToastEvents);

// Create singleton instance
const toastManager = new ToastManager();

// Export functions for backward compatibility
export const showToast = (message, options) => {
  // Handle simple success toast (default behavior from main.js)
  if (!options || Object.keys(options).length === 0) {
    return toastManager.show(message, {
      type: ToastConfig.types.SUCCESS,
      icon: 'fas fa-check-circle'
    });
  }
  return toastManager.show(message, options);
};

export const showSuccessToast = (message, options) => toastManager.success(message, options);
export const showErrorToast = (message, options) => toastManager.error(message, options);
export const showWarningToast = (message, options) => toastManager.warning(message, options);
export const showInfoToast = (message, options) => toastManager.info(message, options);
export const hideToast = (id) => toastManager.hide(id);
export const hideAllToasts = () => toastManager.hideAll();

// Export classes and instance
export default toastManager;
export { Toast, ToastManager, toastManager };
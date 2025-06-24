/**
 * Modal Management Module
 * @module Modal
 */

import { AppConfig } from '../config/app.config.js';
import eventBus, { Events } from '../core/eventBus.js';
import stateManager from '../core/StateManager.js';
import { createModal } from '../utils/templates.js';

/**
 * Modal configuration
 */
const ModalConfig = {
  animationDuration: 300,
  disableScroll: true,
  awaitCloseAnimation: true,
  awaitOpenAnimation: true,
  
  selectors: {
    modal: '.modal',
    overlay: '.modal-overlay',
    container: '.modal-container',
    closeBtn: '[data-micromodal-close]',
    content: '.modal-content',
    notification: '.modal-notification'
  },
  
  classes: {
    isOpen: 'is-open',
    hasNotification: 'has-notification'
  }
};

/**
 * Modal Manager class
 */
class ModalManager {
  constructor(options = {}) {
    this.config = { ...ModalConfig, ...options };
    this.modals = new Map();
    this.activeModal = null;
    this.originalContent = new Map();
    this.isInitialized = false;
    this.microModal = null;
  }

  /**
   * Initialize modal manager
   * @param {Object} microModalInstance - MicroModal instance
   */
  init(microModalInstance = window.MicroModal) {
    if (!microModalInstance) {
      console.error('MicroModal not found. Please include MicroModal library.');
      return;
    }

    this.microModal = microModalInstance;
    
    // Initialize MicroModal with default config
    this.microModal.init({
      disableScroll: this.config.disableScroll,
      awaitCloseAnimation: this.config.awaitCloseAnimation,
      awaitOpenAnimation: this.config.awaitOpenAnimation,
      onShow: (modal) => this.onModalShow(modal),
      onClose: (modal) => this.onModalClose(modal)
    });

    this.isInitialized = true;
    
    // Store references to all modals
    this.discoverModals();
    
    // Store original content for reset functionality
    this.storeOriginalContent();

    eventBus.emit(Events.MODAL_INITIALIZED);
  }

  /**
   * Discover all modals in the DOM
   * @private
   */
  discoverModals() {
    const modalElements = document.querySelectorAll(this.config.selectors.modal);
    
    modalElements.forEach(modal => {
      this.modals.set(modal.id, {
        element: modal,
        isOpen: false,
        config: {}
      });
    });
  }

  /**
   * Store original content for modals
   * @private
   */
  storeOriginalContent() {
    this.modals.forEach((modal, id) => {
      const contentEl = modal.element.querySelector(this.config.selectors.content);
      if (contentEl) {
        this.originalContent.set(id, contentEl.innerHTML);
      }
    });
  }

  /**
   * Open a modal
   * @param {string} modalId - Modal ID
   * @param {Object} options - Modal options
   */
  open(modalId, options = {}) {
    if (!this.isInitialized) {
      console.error('Modal manager not initialized');
      return;
    }

    const modal = this.modals.get(modalId);
    if (!modal) {
      console.error(`Modal ${modalId} not found`);
      return;
    }

    // Close any active modal first
    if (this.activeModal && this.activeModal !== modalId) {
      this.close(this.activeModal);
    }

    // Apply any custom options
    modal.config = { ...modal.config, ...options };

    // Open the modal
    this.microModal.show(modalId, {
      ...this.config,
      ...options,
      onShow: (modalEl) => {
        this.onModalShow(modalEl);
        if (options.onShow) options.onShow(modalEl);
      },
      onClose: (modalEl) => {
        this.onModalClose(modalEl);
        if (options.onClose) options.onClose(modalEl);
      }
    });
  }

  /**
   * Close a modal
   * @param {string} modalId - Modal ID (optional, closes active modal if not provided)
   */
  close(modalId) {
    const idToClose = modalId || this.activeModal;
    
    if (!idToClose) {
      console.warn('No modal to close');
      return;
    }

    this.microModal.close(idToClose);
  }

  /**
   * Close all modals
   */
  closeAll() {
    this.modals.forEach((modal, id) => {
      if (modal.isOpen) {
        this.close(id);
      }
    });
  }

  /**
   * Modal show handler
   * @private
   */
  onModalShow(modalEl) {
    const modalId = modalEl.id;
    const modal = this.modals.get(modalId);
    
    if (modal) {
      modal.isOpen = true;
      this.activeModal = modalId;
    }

    // Update state
    stateManager.set('ui.modalOpen', true);
    stateManager.set('ui.activeModal', modalId);

    // Emit event
    eventBus.emit(Events.MODAL_OPEN, { modalId, element: modalEl });
  }

  /**
   * Modal close handler
   * @private
   */
  onModalClose(modalEl) {
    const modalId = modalEl.id;
    const modal = this.modals.get(modalId);
    
    if (modal) {
      modal.isOpen = false;
      
      // Reset content if configured
      if (modal.config.resetOnClose) {
        this.resetContent(modalId);
      }
    }

    if (this.activeModal === modalId) {
      this.activeModal = null;
    }

    // Update state
    stateManager.set('ui.modalOpen', false);
    stateManager.set('ui.activeModal', null);

    // Emit event
    eventBus.emit(Events.MODAL_CLOSE, { modalId, element: modalEl });
  }

  /**
   * Reset modal content to original
   * @param {string} modalId - Modal ID
   */
  resetContent(modalId) {
    const modal = this.modals.get(modalId);
    const originalContent = this.originalContent.get(modalId);
    
    if (modal && originalContent) {
      const contentEl = modal.element.querySelector(this.config.selectors.content);
      if (contentEl) {
        contentEl.innerHTML = originalContent;
        contentEl.style.opacity = '1';
        contentEl.style.transition = '';
        
        // Re-bind any event listeners if needed
        eventBus.emit(Events.MODAL_CONTENT_RESET, { modalId });
      }
    }
  }

  /**
   * Update modal content
   * @param {string} modalId - Modal ID
   * @param {string} content - New content HTML
   * @param {boolean} transition - Apply transition effect
   */
  updateContent(modalId, content, transition = true) {
    const modal = this.modals.get(modalId);
    
    if (!modal) {
      console.error(`Modal ${modalId} not found`);
      return;
    }

    const contentEl = modal.element.querySelector(this.config.selectors.content);
    if (!contentEl) return;

    if (transition) {
      contentEl.style.transition = 'opacity 0.3s ease';
      contentEl.style.opacity = '0';
      
      setTimeout(() => {
        contentEl.innerHTML = content;
        contentEl.style.opacity = '1';
        
        eventBus.emit(Events.MODAL_CONTENT_UPDATED, { modalId, content });
      }, 300);
    } else {
      contentEl.innerHTML = content;
      eventBus.emit(Events.MODAL_CONTENT_UPDATED, { modalId, content });
    }
  }

  /**
   * Show notification on modal trigger button
   * @param {string} modalId - Modal ID
   * @param {Object} options - Notification options
   */
  showButtonNotification(modalId, options = {}) {
    const {
      buttonSelector = `.${modalId}-btn`,
      message = 'Quick 30-second survey',
      duration = 5000,
      pulseCount = 3
    } = options;

    const button = document.querySelector(buttonSelector);
    if (!button || button.querySelector(this.config.selectors.notification)) {
      return;
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'modal-notification';
    notification.innerHTML = `
      <span class="notification-arrow">→</span>
      <span class="notification-text">${message}</span>
    `;

    // Position and append
    if (!button.parentElement.style.position || 
        button.parentElement.style.position === 'static') {
      button.parentElement.style.position = 'relative';
    }

    button.classList.add(this.config.classes.hasNotification);
    button.parentElement.appendChild(notification);

    // Animate
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    // Pulse effect
    if (pulseCount > 0) {
      let pulses = 0;
      const pulseInterval = setInterval(() => {
        button.style.transform = 'scale(1.05)';
        setTimeout(() => {
          button.style.transform = 'scale(1)';
        }, 200);
        
        pulses++;
        if (pulses >= pulseCount) {
          clearInterval(pulseInterval);
        }
      }, 1000);
    }

    // Remove notification
    if (duration > 0) {
      setTimeout(() => {
        this.hideButtonNotification(modalId, buttonSelector);
      }, duration);
    }

    eventBus.emit(Events.MODAL_NOTIFICATION_SHOWN, { modalId, button });
  }

  /**
   * Hide notification on modal trigger button
   * @param {string} modalId - Modal ID
   * @param {string} buttonSelector - Button selector
   */
  hideButtonNotification(modalId, buttonSelector) {
    const button = document.querySelector(buttonSelector);
    if (!button) return;

    const notification = button.parentElement.querySelector(this.config.selectors.notification);
    if (!notification) return;

    notification.classList.remove('show');
    button.classList.remove(this.config.classes.hasNotification);

    setTimeout(() => {
      notification.remove();
    }, 300);

    eventBus.emit(Events.MODAL_NOTIFICATION_HIDDEN, { modalId, button });
  }

  /**
   * Create and register a new modal dynamically
   * @param {Object} options - Modal creation options
   * @returns {string} Modal ID
   */
  createModal({
    id = `modal-${Date.now()}`,
    title = '',
    content = '',
    footer = null,
    size = 'medium',
    closeButton = true,
    className = ''
  }) {
    // Check if modal already exists
    if (this.modals.has(id)) {
      console.warn(`Modal ${id} already exists`);
      return id;
    }

    // Create modal HTML
    const modalHtml = createModal({
      id,
      title,
      content,
      footer,
      size,
      closeButton,
      className
    });

    // Add to DOM
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer.firstElementChild);

    // Register the modal
    const modalEl = document.getElementById(id);
    this.modals.set(id, {
      element: modalEl,
      isOpen: false,
      config: {}
    });

    // Store original content
    const contentEl = modalEl.querySelector(this.config.selectors.content);
    if (contentEl) {
      this.originalContent.set(id, contentEl.innerHTML);
    }

    eventBus.emit(Events.MODAL_CREATED, { modalId: id });

    return id;
  }

  /**
   * Destroy a modal
   * @param {string} modalId - Modal ID
   */
  destroyModal(modalId) {
    const modal = this.modals.get(modalId);
    if (!modal) return;

    // Close if open
    if (modal.isOpen) {
      this.close(modalId);
    }

    // Remove from DOM
    modal.element.remove();

    // Clean up references
    this.modals.delete(modalId);
    this.originalContent.delete(modalId);

    eventBus.emit(Events.MODAL_DESTROYED, { modalId });
  }

  /**
   * Check if a modal is open
   * @param {string} modalId - Modal ID
   * @returns {boolean} Is open
   */
  isOpen(modalId) {
    const modal = this.modals.get(modalId);
    return modal ? modal.isOpen : false;
  }

  /**
   * Get all open modals
   * @returns {Array} Array of open modal IDs
   */
  getOpenModals() {
    const openModals = [];
    this.modals.forEach((modal, id) => {
      if (modal.isOpen) {
        openModals.push(id);
      }
    });
    return openModals;
  }
}

// Add modal event constants
export const ModalEvents = {
  MODAL_INITIALIZED: 'modal:initialized',
  MODAL_OPEN: 'modal:open',
  MODAL_CLOSE: 'modal:close',
  MODAL_CREATED: 'modal:created',
  MODAL_DESTROYED: 'modal:destroyed',
  MODAL_CONTENT_UPDATED: 'modal:content:updated',
  MODAL_CONTENT_RESET: 'modal:content:reset',
  MODAL_NOTIFICATION_SHOWN: 'modal:notification:shown',
  MODAL_NOTIFICATION_HIDDEN: 'modal:notification:hidden'
};

// Add to main Events object
Object.assign(Events, ModalEvents);

// Create singleton instance
const modalManager = new ModalManager();

// Export functions for backward compatibility
export const initModals = (microModal) => modalManager.init(microModal);
export const openModal = (id, options) => modalManager.open(id, options);
export const closeModal = (id) => modalManager.close(id);
export const showModalNotification = (id, options) => modalManager.showButtonNotification(id, options);

// Export classes and instance
export default modalManager;
export { ModalManager, modalManager };
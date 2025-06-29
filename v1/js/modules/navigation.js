/**
 * Navigation Module
 * @module Navigation
 */

import eventBus, { Events } from '../core/eventBus.js';
import stateManager from '../core/StateManager.js';

/**
 * Navigation configuration
 */
const NavigationConfig = {
  selectors: {
    nav: '.main-nav',
    container: '.nav-container',
    mobileToggle: '.mobile-menu-toggle',
    mobileOverlay: '.mobile-menu-overlay',
    mobileMenu: '.mobile-menu',
    desktopMenu: '.desktop-menu',
    dropdownToggle: '.dropdown-toggle',
    dropdownMenu: '.dropdown-menu',
    navLinks: 'a[data-page]',
    hasDropdown: '.has-dropdown'
  },
  
  classes: {
    mobileOpen: 'mobile-menu-open',
    dropdownOpen: 'dropdown-open',
    scrolled: 'scrolled',
    active: 'active'
  },
  
  breakpoints: {
    mobile: 768
  },
  
  scrollThreshold: 100,
  animationDuration: 300
};

/**
 * Navigation Manager class
 */
class NavigationManager {
  constructor(options = {}) {
    this.config = { ...NavigationConfig, ...options };
    this.nav = null;
    this.mobileToggle = null;
    this.mobileOverlay = null;
    this.isInitialized = false;
    this.isMobileMenuOpen = false;
    this.scrollPosition = 0;
  }

  /**
   * Initialize navigation
   */
  init() {
    this.nav = document.querySelector(this.config.selectors.nav);
    if (!this.nav) {
      console.error('Navigation element not found');
      return;
    }

    this.setupElements();
    this.bindEvents();
    this.highlightActivePage();
    this.handleInitialScroll();
    
    this.isInitialized = true;
    eventBus.emit(Events.NAVIGATION_INITIALIZED);
  }

  /**
   * Setup navigation elements
   * @private
   */
  setupElements() {
    this.mobileToggle = this.nav.querySelector(this.config.selectors.mobileToggle);
    this.mobileOverlay = this.nav.querySelector(this.config.selectors.mobileOverlay);
    this.mobileMenu = this.nav.querySelector(this.config.selectors.mobileMenu);
    this.desktopMenu = this.nav.querySelector(this.config.selectors.desktopMenu);
  }

  /**
   * Bind event listeners
   * @private
   */
  bindEvents() {
    // Mobile menu toggle
    if (this.mobileToggle) {
      this.mobileToggle.addEventListener('click', () => this.toggleMobileMenu());
    }

    // Mobile overlay click
    if (this.mobileOverlay) {
      this.mobileOverlay.addEventListener('click', () => this.closeMobileMenu());
    }

    // Dropdown toggles
    const dropdownToggles = this.nav.querySelectorAll(this.config.selectors.dropdownToggle);
    dropdownToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => this.handleDropdownToggle(e));
      
      // Keyboard support
      toggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleDropdownToggle(e);
        }
      });
    });

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => this.handleOutsideClick(e));

    // Scroll effects
    window.addEventListener('scroll', () => this.handleScroll(), { passive: true });

    // Window resize
    window.addEventListener('resize', () => this.handleResize());

    // Keyboard navigation
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));

    // Mobile menu links
    if (this.mobileMenu) {
      const links = this.mobileMenu.querySelectorAll('a');
      links.forEach(link => {
        link.addEventListener('click', () => {
          // Close mobile menu when link is clicked
          if (this.isMobileMenuOpen) {
            this.closeMobileMenu();
          }
        });
      });
    }
  }

  /**
   * Toggle mobile menu
   */
  toggleMobileMenu() {
    if (this.isMobileMenuOpen) {
      this.closeMobileMenu();
    } else {
      this.openMobileMenu();
    }
  }

  /**
   * Open mobile menu
   */
  openMobileMenu() {
    if (!this.mobileToggle || !this.mobileOverlay) return;

    // Quick fix: Scroll to top before opening menu to prevent rendering issues
    window.scrollTo(0, 0);

    this.isMobileMenuOpen = true;
    document.body.classList.add(this.config.classes.mobileOpen);
    this.mobileToggle.setAttribute('aria-expanded', 'true');
    
    // Trap focus
    this.trapFocus();
    
    stateManager.set('navigation.mobileMenuOpen', true);
    eventBus.emit(Events.NAVIGATION_MOBILE_OPEN);
  }

  /**
   * Close mobile menu
   */
  closeMobileMenu() {
    if (!this.mobileToggle || !this.mobileOverlay) return;

    this.isMobileMenuOpen = false;
    document.body.classList.remove(this.config.classes.mobileOpen);
    this.mobileToggle.setAttribute('aria-expanded', 'false');
    
    // Release focus trap
    this.releaseFocus();
    
    stateManager.set('navigation.mobileMenuOpen', false);
    eventBus.emit(Events.NAVIGATION_MOBILE_CLOSE);
  }

  /**
   * Handle dropdown toggle
   * @private
   */
  handleDropdownToggle(e) {
    e.preventDefault();
    const toggle = e.currentTarget;
    const parent = toggle.closest(this.config.selectors.hasDropdown);
    
    if (!parent) return;

    const isOpen = parent.classList.contains(this.config.classes.dropdownOpen);
    
    // Close all other dropdowns
    this.closeAllDropdowns();
    
    if (!isOpen) {
      parent.classList.add(this.config.classes.dropdownOpen);
      toggle.setAttribute('aria-expanded', 'true');
    }
  }

  /**
   * Close all dropdown menus
   * @private
   */
  closeAllDropdowns() {
    const openDropdowns = this.nav.querySelectorAll(`.${this.config.classes.dropdownOpen}`);
    openDropdowns.forEach(dropdown => {
      dropdown.classList.remove(this.config.classes.dropdownOpen);
      const toggle = dropdown.querySelector(this.config.selectors.dropdownToggle);
      if (toggle) {
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /**
   * Handle clicks outside dropdowns
   * @private
   */
  handleOutsideClick(e) {
    const isDropdown = e.target.closest(this.config.selectors.hasDropdown);
    if (!isDropdown) {
      this.closeAllDropdowns();
    }
  }

  /**
   * Handle scroll effects
   * @private
   */
  handleScroll() {
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    
    if (currentScroll > this.config.scrollThreshold) {
      this.nav.classList.add(this.config.classes.scrolled);
    } else {
      this.nav.classList.remove(this.config.classes.scrolled);
    }
    
    this.scrollPosition = currentScroll;
    stateManager.set('navigation.scrollPosition', currentScroll);
  }

  /**
   * Handle initial scroll position
   * @private
   */
  handleInitialScroll() {
    this.handleScroll();
  }

  /**
   * Handle window resize
   * @private
   */
  handleResize() {
    // Close mobile menu if window is resized to desktop
    if (window.innerWidth >= this.config.breakpoints.mobile && this.isMobileMenuOpen) {
      this.closeMobileMenu();
    }
  }

  /**
   * Handle keyboard navigation
   * @private
   */
  handleKeyboard(e) {
    // Close mobile menu on Escape
    if (e.key === 'Escape') {
      if (this.isMobileMenuOpen) {
        this.closeMobileMenu();
        this.mobileToggle.focus();
      }
      this.closeAllDropdowns();
    }
  }

  /**
   * Highlight active page
   * @private
   */
  highlightActivePage() {
    const currentPath = window.location.pathname;
    const navLinks = this.nav.querySelectorAll(this.config.selectors.navLinks);
    
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      const isActive = (currentPath === href) || 
                      (currentPath === '/' && href === '/') ||
                      (currentPath.includes(href) && href !== '/');
      
      if (isActive) {
        link.classList.add(this.config.classes.active);
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove(this.config.classes.active);
        link.removeAttribute('aria-current');
      }
    });
  }

  /**
   * Trap focus within mobile menu
   * @private
   */
  trapFocus() {
    if (!this.mobileMenu) return;
    
    const focusableElements = this.mobileMenu.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
    );
    
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    
    // Store current focus
    this.previousFocus = document.activeElement;
    
    // Focus first element
    if (firstFocusable) {
      firstFocusable.focus();
    }
    
    // Trap focus
    this.focusTrapHandler = (e) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey && document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      } else if (!e.shiftKey && document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    };
    
    document.addEventListener('keydown', this.focusTrapHandler);
  }

  /**
   * Release focus trap
   * @private
   */
  releaseFocus() {
    if (this.focusTrapHandler) {
      document.removeEventListener('keydown', this.focusTrapHandler);
      this.focusTrapHandler = null;
    }
    
    // Restore previous focus
    if (this.previousFocus) {
      this.previousFocus.focus();
      this.previousFocus = null;
    }
  }

  /**
   * Destroy navigation
   */
  destroy() {
    // Remove event listeners
    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('keydown', this.handleKeyboard);
    document.removeEventListener('click', this.handleOutsideClick);
    
    // Reset state
    this.closeMobileMenu();
    this.closeAllDropdowns();
    
    this.isInitialized = false;
    eventBus.emit(Events.NAVIGATION_DESTROYED);
  }
}

// Navigation events
export const NavigationEvents = {
  NAVIGATION_INITIALIZED: 'navigation:initialized',
  NAVIGATION_MOBILE_OPEN: 'navigation:mobile:open',
  NAVIGATION_MOBILE_CLOSE: 'navigation:mobile:close',
  NAVIGATION_DESTROYED: 'navigation:destroyed'
};

// Add to main Events object
Object.assign(Events, NavigationEvents);

// Create singleton instance
const navigationManager = new NavigationManager();

// Export
export default navigationManager;
export { NavigationManager, navigationManager };
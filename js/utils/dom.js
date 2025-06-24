/**
 * DOM Utilities Module
 * @module DOM
 */

/**
 * Query selector with error handling
 * @param {string} selector - CSS selector
 * @param {HTMLElement} parent - Parent element (default: document)
 * @returns {HTMLElement|null} Element or null
 */
export function $(selector, parent = document) {
  try {
    return parent.querySelector(selector);
  } catch (error) {
    console.error(`Invalid selector: ${selector}`, error);
    return null;
  }
}

/**
 * Query selector all with error handling
 * @param {string} selector - CSS selector
 * @param {HTMLElement} parent - Parent element (default: document)
 * @returns {NodeList} NodeList of elements
 */
export function $$(selector, parent = document) {
  try {
    return parent.querySelectorAll(selector);
  } catch (error) {
    console.error(`Invalid selector: ${selector}`, error);
    return [];
  }
}

/**
 * Get element by ID
 * @param {string} id - Element ID
 * @returns {HTMLElement|null} Element or null
 */
export function getById(id) {
  return document.getElementById(id);
}

/**
 * Create element with attributes and content
 * @param {string} tag - HTML tag name
 * @param {Object} options - Element options
 * @returns {HTMLElement} Created element
 */
export function createElement(tag, options = {}) {
  const element = document.createElement(tag);
  
  // Set attributes
  if (options.attrs) {
    Object.entries(options.attrs).forEach(([key, value]) => {
      if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else if (key === 'dataset' && typeof value === 'object') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue;
        });
      } else {
        element.setAttribute(key, value);
      }
    });
  }
  
  // Set classes
  if (options.classes) {
    const classes = Array.isArray(options.classes) ? options.classes : [options.classes];
    element.classList.add(...classes);
  }
  
  // Set text content
  if (options.text) {
    element.textContent = options.text;
  }
  
  // Set HTML content
  if (options.html) {
    element.innerHTML = options.html;
  }
  
  // Add children
  if (options.children) {
    options.children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof HTMLElement) {
        element.appendChild(child);
      }
    });
  }
  
  // Add event listeners
  if (options.events) {
    Object.entries(options.events).forEach(([event, handler]) => {
      element.addEventListener(event, handler);
    });
  }
  
  return element;
}

/**
 * Insert element after reference element
 * @param {HTMLElement} newElement - Element to insert
 * @param {HTMLElement} referenceElement - Reference element
 */
export function insertAfter(newElement, referenceElement) {
  referenceElement.parentNode.insertBefore(newElement, referenceElement.nextSibling);
}

/**
 * Remove element from DOM
 * @param {HTMLElement|string} elementOrSelector - Element or selector
 */
export function remove(elementOrSelector) {
  const element = typeof elementOrSelector === 'string' 
    ? $(elementOrSelector) 
    : elementOrSelector;
    
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

/**
 * Empty element content
 * @param {HTMLElement|string} elementOrSelector - Element or selector
 */
export function empty(elementOrSelector) {
  const element = typeof elementOrSelector === 'string' 
    ? $(elementOrSelector) 
    : elementOrSelector;
    
  if (element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }
}

/**
 * Class manipulation utilities
 */
export const classes = {
  /**
   * Add classes to element
   * @param {HTMLElement} element - Target element
   * @param {...string} classNames - Classes to add
   */
  add(element, ...classNames) {
    if (element) {
      element.classList.add(...classNames);
    }
  },
  
  /**
   * Remove classes from element
   * @param {HTMLElement} element - Target element
   * @param {...string} classNames - Classes to remove
   */
  remove(element, ...classNames) {
    if (element) {
      element.classList.remove(...classNames);
    }
  },
  
  /**
   * Toggle classes on element
   * @param {HTMLElement} element - Target element
   * @param {string} className - Class to toggle
   * @param {boolean} force - Force add/remove
   */
  toggle(element, className, force) {
    if (element) {
      return element.classList.toggle(className, force);
    }
  },
  
  /**
   * Check if element has class
   * @param {HTMLElement} element - Target element
   * @param {string} className - Class to check
   * @returns {boolean} Has class
   */
  has(element, className) {
    return element ? element.classList.contains(className) : false;
  },
  
  /**
   * Replace class on element
   * @param {HTMLElement} element - Target element
   * @param {string} oldClass - Class to replace
   * @param {string} newClass - New class
   */
  replace(element, oldClass, newClass) {
    if (element && element.classList.contains(oldClass)) {
      element.classList.remove(oldClass);
      element.classList.add(newClass);
    }
  }
};

/**
 * Attribute manipulation utilities
 */
export const attrs = {
  /**
   * Get attribute value
   * @param {HTMLElement} element - Target element
   * @param {string} name - Attribute name
   * @returns {string|null} Attribute value
   */
  get(element, name) {
    return element ? element.getAttribute(name) : null;
  },
  
  /**
   * Set attribute value
   * @param {HTMLElement} element - Target element
   * @param {string|Object} name - Attribute name or object
   * @param {string} value - Attribute value
   */
  set(element, name, value) {
    if (!element) return;
    
    if (typeof name === 'object') {
      Object.entries(name).forEach(([key, val]) => {
        element.setAttribute(key, val);
      });
    } else {
      element.setAttribute(name, value);
    }
  },
  
  /**
   * Remove attribute
   * @param {HTMLElement} element - Target element
   * @param {string} name - Attribute name
   */
  remove(element, name) {
    if (element) {
      element.removeAttribute(name);
    }
  },
  
  /**
   * Check if element has attribute
   * @param {HTMLElement} element - Target element
   * @param {string} name - Attribute name
   * @returns {boolean} Has attribute
   */
  has(element, name) {
    return element ? element.hasAttribute(name) : false;
  }
};

/**
 * Style manipulation utilities
 */
export const styles = {
  /**
   * Get computed style
   * @param {HTMLElement} element - Target element
   * @param {string} property - CSS property
   * @returns {string} Computed style value
   */
  get(element, property) {
    if (!element) return '';
    return window.getComputedStyle(element)[property];
  },
  
  /**
   * Set style properties
   * @param {HTMLElement} element - Target element
   * @param {string|Object} property - CSS property or object
   * @param {string} value - CSS value
   */
  set(element, property, value) {
    if (!element) return;
    
    if (typeof property === 'object') {
      Object.assign(element.style, property);
    } else {
      element.style[property] = value;
    }
  },
  
  /**
   * Show element
   * @param {HTMLElement} element - Target element
   * @param {string} display - Display value (default: 'block')
   */
  show(element, display = 'block') {
    if (element) {
      element.style.display = display;
    }
  },
  
  /**
   * Hide element
   * @param {HTMLElement} element - Target element
   */
  hide(element) {
    if (element) {
      element.style.display = 'none';
    }
  },
  
  /**
   * Toggle element visibility
   * @param {HTMLElement} element - Target element
   * @param {boolean} force - Force show/hide
   */
  toggle(element, force) {
    if (!element) return;
    
    const isHidden = element.style.display === 'none' || 
                     window.getComputedStyle(element).display === 'none';
    
    if (force !== undefined) {
      element.style.display = force ? 'block' : 'none';
    } else {
      element.style.display = isHidden ? 'block' : 'none';
    }
  }
};

/**
 * Event utilities
 */
export const events = {
  /**
   * Add event listener with delegation support
   * @param {HTMLElement|string} target - Target element or selector
   * @param {string} event - Event type
   * @param {string|Function} selectorOrHandler - Selector for delegation or handler
   * @param {Function} handler - Handler function (if using delegation)
   */
  on(target, event, selectorOrHandler, handler) {
    const element = typeof target === 'string' ? $(target) : target;
    if (!element) return;
    
    if (typeof selectorOrHandler === 'function') {
      // Direct event binding
      element.addEventListener(event, selectorOrHandler);
    } else {
      // Event delegation
      element.addEventListener(event, function(e) {
        const delegateTarget = e.target.closest(selectorOrHandler);
        if (delegateTarget && element.contains(delegateTarget)) {
          handler.call(delegateTarget, e);
        }
      });
    }
  },
  
  /**
   * Remove event listener
   * @param {HTMLElement|string} target - Target element or selector
   * @param {string} event - Event type
   * @param {Function} handler - Handler function
   */
  off(target, event, handler) {
    const element = typeof target === 'string' ? $(target) : target;
    if (element) {
      element.removeEventListener(event, handler);
    }
  },
  
  /**
   * Trigger event
   * @param {HTMLElement|string} target - Target element or selector
   * @param {string} event - Event type
   * @param {Object} detail - Event detail
   */
  trigger(target, event, detail = {}) {
    const element = typeof target === 'string' ? $(target) : target;
    if (!element) return;
    
    const customEvent = new CustomEvent(event, {
      bubbles: true,
      cancelable: true,
      detail
    });
    
    element.dispatchEvent(customEvent);
  },
  
  /**
   * One-time event listener
   * @param {HTMLElement|string} target - Target element or selector
   * @param {string} event - Event type
   * @param {Function} handler - Handler function
   */
  once(target, event, handler) {
    const element = typeof target === 'string' ? $(target) : target;
    if (!element) return;
    
    const onceHandler = function(e) {
      handler.call(this, e);
      element.removeEventListener(event, onceHandler);
    };
    
    element.addEventListener(event, onceHandler);
  }
};

/**
 * DOM ready utilities
 */
export const ready = {
  /**
   * Execute function when DOM is ready
   * @param {Function} fn - Function to execute
   */
  dom(fn) {
    if (document.readyState !== 'loading') {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  },
  
  /**
   * Execute function when window is loaded
   * @param {Function} fn - Function to execute
   */
  load(fn) {
    if (document.readyState === 'complete') {
      fn();
    } else {
      window.addEventListener('load', fn);
    }
  }
};

/**
 * Animation utilities
 */
export const animate = {
  /**
   * Fade in element
   * @param {HTMLElement} element - Target element
   * @param {number} duration - Animation duration (ms)
   * @param {Function} callback - Completion callback
   */
  fadeIn(element, duration = 300, callback) {
    if (!element) return;
    
    element.style.opacity = '0';
    element.style.display = 'block';
    element.style.transition = `opacity ${duration}ms`;
    
    requestAnimationFrame(() => {
      element.style.opacity = '1';
      
      setTimeout(() => {
        element.style.transition = '';
        if (callback) callback();
      }, duration);
    });
  },
  
  /**
   * Fade out element
   * @param {HTMLElement} element - Target element
   * @param {number} duration - Animation duration (ms)
   * @param {Function} callback - Completion callback
   */
  fadeOut(element, duration = 300, callback) {
    if (!element) return;
    
    element.style.transition = `opacity ${duration}ms`;
    element.style.opacity = '0';
    
    setTimeout(() => {
      element.style.display = 'none';
      element.style.transition = '';
      if (callback) callback();
    }, duration);
  },
  
  /**
   * Slide down element
   * @param {HTMLElement} element - Target element
   * @param {number} duration - Animation duration (ms)
   * @param {Function} callback - Completion callback
   */
  slideDown(element, duration = 300, callback) {
    if (!element) return;
    
    element.style.removeProperty('display');
    let display = window.getComputedStyle(element).display;
    if (display === 'none') display = 'block';
    element.style.display = display;
    
    const height = element.offsetHeight;
    element.style.overflow = 'hidden';
    element.style.height = 0;
    element.style.paddingTop = 0;
    element.style.paddingBottom = 0;
    element.style.marginTop = 0;
    element.style.marginBottom = 0;
    element.offsetHeight; // Force reflow
    
    element.style.boxSizing = 'border-box';
    element.style.transitionProperty = 'height, margin, padding';
    element.style.transitionDuration = duration + 'ms';
    element.style.height = height + 'px';
    element.style.removeProperty('padding-top');
    element.style.removeProperty('padding-bottom');
    element.style.removeProperty('margin-top');
    element.style.removeProperty('margin-bottom');
    
    setTimeout(() => {
      element.style.removeProperty('height');
      element.style.removeProperty('overflow');
      element.style.removeProperty('transition-duration');
      element.style.removeProperty('transition-property');
      if (callback) callback();
    }, duration);
  },
  
  /**
   * Slide up element
   * @param {HTMLElement} element - Target element
   * @param {number} duration - Animation duration (ms)
   * @param {Function} callback - Completion callback
   */
  slideUp(element, duration = 300, callback) {
    if (!element) return;
    
    element.style.transitionProperty = 'height, margin, padding';
    element.style.transitionDuration = duration + 'ms';
    element.style.boxSizing = 'border-box';
    element.style.height = element.offsetHeight + 'px';
    element.offsetHeight; // Force reflow
    
    element.style.overflow = 'hidden';
    element.style.height = 0;
    element.style.paddingTop = 0;
    element.style.paddingBottom = 0;
    element.style.marginTop = 0;
    element.style.marginBottom = 0;
    
    setTimeout(() => {
      element.style.display = 'none';
      element.style.removeProperty('height');
      element.style.removeProperty('padding-top');
      element.style.removeProperty('padding-bottom');
      element.style.removeProperty('margin-top');
      element.style.removeProperty('margin-bottom');
      element.style.removeProperty('overflow');
      element.style.removeProperty('transition-duration');
      element.style.removeProperty('transition-property');
      if (callback) callback();
    }, duration);
  }
};

/**
 * Scroll utilities
 */
export const scroll = {
  /**
   * Scroll to element
   * @param {HTMLElement|string} target - Target element or selector
   * @param {Object} options - Scroll options
   */
  to(target, options = {}) {
    const element = typeof target === 'string' ? $(target) : target;
    if (!element) return;
    
    const defaultOptions = {
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest'
    };
    
    element.scrollIntoView({ ...defaultOptions, ...options });
  },
  
  /**
   * Get scroll position
   * @returns {Object} Scroll position {x, y}
   */
  getPosition() {
    return {
      x: window.pageXOffset || document.documentElement.scrollLeft,
      y: window.pageYOffset || document.documentElement.scrollTop
    };
  },
  
  /**
   * Set scroll position
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {string} behavior - Scroll behavior
   */
  setPosition(x, y, behavior = 'smooth') {
    window.scrollTo({
      left: x,
      top: y,
      behavior
    });
  }
};

/**
 * Data attribute utilities
 */
export const data = {
  /**
   * Get data attribute
   * @param {HTMLElement} element - Target element
   * @param {string} key - Data key
   * @returns {string} Data value
   */
  get(element, key) {
    return element ? element.dataset[key] : undefined;
  },
  
  /**
   * Set data attribute
   * @param {HTMLElement} element - Target element
   * @param {string|Object} key - Data key or object
   * @param {string} value - Data value
   */
  set(element, key, value) {
    if (!element) return;
    
    if (typeof key === 'object') {
      Object.entries(key).forEach(([k, v]) => {
        element.dataset[k] = v;
      });
    } else {
      element.dataset[key] = value;
    }
  },
  
  /**
   * Remove data attribute
   * @param {HTMLElement} element - Target element
   * @param {string} key - Data key
   */
  remove(element, key) {
    if (element) {
      delete element.dataset[key];
    }
  },
  
  /**
   * Get all data attributes
   * @param {HTMLElement} element - Target element
   * @returns {Object} All data attributes
   */
  getAll(element) {
    return element ? { ...element.dataset } : {};
  }
};

/**
 * Form utilities
 */
export const form = {
  /**
   * Get form data as object
   * @param {HTMLFormElement|string} formOrSelector - Form element or selector
   * @returns {Object} Form data
   */
  serialize(formOrSelector) {
    const formElement = typeof formOrSelector === 'string' 
      ? $(formOrSelector) 
      : formOrSelector;
      
    if (!formElement) return {};
    
    const formData = new FormData(formElement);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
      if (data[key]) {
        if (!Array.isArray(data[key])) {
          data[key] = [data[key]];
        }
        data[key].push(value);
      } else {
        data[key] = value;
      }
    }
    
    return data;
  },
  
  /**
   * Reset form
   * @param {HTMLFormElement|string} formOrSelector - Form element or selector
   */
  reset(formOrSelector) {
    const formElement = typeof formOrSelector === 'string' 
      ? $(formOrSelector) 
      : formOrSelector;
      
    if (formElement && formElement.reset) {
      formElement.reset();
    }
  },
  
  /**
   * Validate form
   * @param {HTMLFormElement|string} formOrSelector - Form element or selector
   * @returns {boolean} Is valid
   */
  validate(formOrSelector) {
    const formElement = typeof formOrSelector === 'string' 
      ? $(formOrSelector) 
      : formOrSelector;
      
    return formElement ? formElement.checkValidity() : false;
  }
};

/**
 * Utility to wait for element
 * @param {string} selector - Element selector
 * @param {number} timeout - Timeout in ms (default: 5000)
 * @returns {Promise<HTMLElement>} Promise resolving to element
 */
export function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = $(selector);
    if (element) {
      return resolve(element);
    }
    
    const observer = new MutationObserver((mutations, obs) => {
      const element = $(selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in ms
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Export all utilities
export default {
  $,
  $$,
  getById,
  createElement,
  insertAfter,
  remove,
  empty,
  classes,
  attrs,
  styles,
  events,
  ready,
  animate,
  scroll,
  data,
  form,
  waitForElement,
  debounce,
  throttle
};
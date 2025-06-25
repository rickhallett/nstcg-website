/**
 * Animated Counter Component
 * @module Counter
 */

import { AppConfig } from '../config/app.config.js';
import eventBus, { Events } from '../core/eventBus.js';
import stateManager from '../core/StateManager.js';

/**
 * Counter configuration
 */
const CounterConfig = {
  animation: {
    initialRate: 50, // milliseconds per count in initial phase
    accelerationDuration: 1500, // milliseconds to reach target
    easing: 'cubic', // easing function type
    updateInterval: 16 // ~60fps
  },
  
  phases: {
    INITIAL: 'initial',
    ACCELERATED: 'accelerated',
    COMPLETED: 'completed'
  },
  
  selectors: {
    counter: '.counter-number',
    submitButton: '#submit-btn-text',
    confirmationCount: '#confirmation-count'
  }
};

/**
 * Animated Counter class
 */
class AnimatedCounter {
  constructor(element, options = {}) {
    this.element = element;
    this.config = { ...CounterConfig.animation, ...options };
    
    this.state = {
      current: 0,
      target: null,
      phase: CounterConfig.phases.INITIAL,
      animationId: null,
      startTime: null,
      acceleratedStartTime: null,
      acceleratedStart: 0
    };
    
    this.updateCallback = null;
    this.completionCallback = null;
  }

  /**
   * Start the counter animation
   * @param {number} initialTarget - Optional initial target value
   */
  start(initialTarget = null) {
    if (this.state.animationId) {
      this.stop();
    }

    this.state.current = 0;
    this.state.target = initialTarget;
    this.state.phase = CounterConfig.phases.INITIAL;
    this.state.startTime = Date.now();

    this.animate();
    
    eventBus.emit(Events.COUNTER_START, { 
      element: this.element,
      target: initialTarget 
    });

    // If we have an initial target, accelerate immediately
    if (initialTarget !== null) {
      setTimeout(() => {
        this.accelerateToTarget(initialTarget);
      }, 100);
    }
  }

  /**
   * Main animation loop
   * @private
   */
  animate() {
    const elapsed = Date.now() - this.state.startTime;

    if (this.state.phase === CounterConfig.phases.INITIAL) {
      // Slow initial counting
      this.state.current = Math.floor(elapsed / this.config.initialRate);
    } else if (this.state.phase === CounterConfig.phases.ACCELERATED && this.state.target !== null) {
      // Exponential acceleration to target
      const phaseElapsed = Date.now() - this.state.acceleratedStartTime;
      const progress = Math.min(phaseElapsed / this.config.accelerationDuration, 1);

      // Apply easing
      const easedProgress = this.applyEasing(progress, this.config.easing);
      
      this.state.current = Math.floor(
        this.state.acceleratedStart +
        (this.state.target - this.state.acceleratedStart) * easedProgress
      );

      if (progress >= 1) {
        this.state.current = this.state.target;
        this.state.phase = CounterConfig.phases.COMPLETED;
        this.complete();
        return;
      }
    }

    // Update the display
    this.updateDisplay(this.state.current);

    // Continue animation
    this.state.animationId = requestAnimationFrame(() => this.animate());
  }

  /**
   * Apply easing function
   * @private
   */
  applyEasing(progress, type) {
    switch (type) {
      case 'linear':
        return progress;
      case 'cubic':
        return 1 - Math.pow(1 - progress, 3);
      case 'exponential':
        return progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      case 'bounce':
        if (progress < 0.5) {
          return 0.5 * (1 - Math.pow(1 - 2 * progress, 3));
        } else {
          return 0.5 + 0.5 * Math.pow(2 * progress - 1, 3);
        }
      default:
        return 1 - Math.pow(1 - progress, 3); // default to cubic
    }
  }

  /**
   * Accelerate to target value
   * @param {number} target - Target value
   */
  accelerateToTarget(target) {
    if (this.state.phase === CounterConfig.phases.COMPLETED) {
      // If already completed, start a new animation from current value
      this.state.phase = CounterConfig.phases.ACCELERATED;
      this.state.acceleratedStart = this.state.current;
      this.state.acceleratedStartTime = Date.now();
      this.state.target = target;
      
      if (!this.state.animationId) {
        this.animate();
      }
    } else {
      // Normal acceleration
      this.state.target = target;
      this.state.phase = CounterConfig.phases.ACCELERATED;
      this.state.acceleratedStart = this.state.current;
      this.state.acceleratedStartTime = Date.now();
    }

    eventBus.emit(Events.COUNTER_ACCELERATE, { 
      element: this.element,
      from: this.state.current,
      to: target 
    });
  }

  /**
   * Update the display
   * @private
   */
  updateDisplay(value) {
    if (this.element) {
      this.element.textContent = value;
    }

    if (this.updateCallback) {
      this.updateCallback(value);
    }

    // Update state
    stateManager.set('counter.current', value);
  }

  /**
   * Complete the animation
   * @private
   */
  complete() {
    cancelAnimationFrame(this.state.animationId);
    this.state.animationId = null;

    eventBus.emit(Events.COUNTER_COMPLETE, { 
      element: this.element,
      finalValue: this.state.current 
    });

    if (this.completionCallback) {
      this.completionCallback(this.state.current);
    }
  }

  /**
   * Stop the animation
   */
  stop() {
    if (this.state.animationId) {
      cancelAnimationFrame(this.state.animationId);
      this.state.animationId = null;
    }

    eventBus.emit(Events.COUNTER_STOP, { 
      element: this.element,
      value: this.state.current 
    });
  }

  /**
   * Set update callback
   * @param {Function} callback - Callback function
   */
  onUpdate(callback) {
    this.updateCallback = callback;
  }

  /**
   * Set completion callback
   * @param {Function} callback - Callback function
   */
  onComplete(callback) {
    this.completionCallback = callback;
  }

  /**
   * Get current value
   * @returns {number} Current counter value
   */
  getValue() {
    return this.state.current;
  }

  /**
   * Get animation state
   * @returns {Object} Animation state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Is animation running
   * @returns {boolean} Animation status
   */
  isAnimating() {
    return this.state.animationId !== null;
  }
}

/**
 * Counter Manager class - manages multiple counters
 */
class CounterManager {
  constructor() {
    this.counters = new Map();
    this.mainCounter = null;
  }

  /**
   * Create a counter
   * @param {string} id - Counter ID
   * @param {HTMLElement|string} element - Element or selector
   * @param {Object} options - Counter options
   * @returns {AnimatedCounter} Counter instance
   */
  createCounter(id, element, options = {}) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) {
      console.error(`Counter element not found: ${element}`);
      return null;
    }

    const counter = new AnimatedCounter(el, options);
    this.counters.set(id, counter);

    return counter;
  }

  /**
   * Get a counter by ID
   * @param {string} id - Counter ID
   * @returns {AnimatedCounter} Counter instance
   */
  getCounter(id) {
    return this.counters.get(id);
  }

  /**
   * Create placeholder counter
   * @param {HTMLElement} element - Element to animate
   * @returns {Function} Update function
   */
  createPlaceholder(element) {
    if (!element) return null;

    let localCounter = 0;
    const startTime = Date.now();
    let animationId = null;

    function animate() {
      const elapsed = Date.now() - startTime;
      localCounter = Math.floor(elapsed / CounterConfig.animation.initialRate);
      element.textContent = localCounter;
      animationId = requestAnimationFrame(animate);
    }

    animate();

    // Return function to stop and set final value
    return function(finalValue) {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }

      // Animate to final value
      const duration = CounterConfig.animation.accelerationDuration;
      const startValue = localCounter;
      const animStartTime = Date.now();

      function finalAnimate() {
        const elapsed = Date.now() - animStartTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(startValue + (finalValue - startValue) * easedProgress);

        element.textContent = current;

        if (progress < 1) {
          requestAnimationFrame(finalAnimate);
        }
      }

      finalAnimate();
    };
  }

  /**
   * Create submit button counter
   * @param {HTMLElement} element - Button text element
   * @returns {Function} Update function
   */
  createSubmitButton(element) {
    if (!element) return null;

    const placeholder = this.createPlaceholder({
      textContent: ''
    });

    function updateText(count) {
      element.textContent = `JOIN ${count} NEIGHBOURS NOW`;
    }

    // Start animation
    let localCounter = 0;
    const startTime = Date.now();
    let animationId = null;

    function animate() {
      const elapsed = Date.now() - startTime;
      localCounter = Math.floor(elapsed / CounterConfig.animation.initialRate);
      updateText(localCounter);
      animationId = requestAnimationFrame(animate);
    }

    animate();

    // Return update function
    return function(finalValue) {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }

      // Animate to final value
      const duration = CounterConfig.animation.accelerationDuration;
      const startValue = localCounter;
      const animStartTime = Date.now();

      function finalAnimate() {
        const elapsed = Date.now() - animStartTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(startValue + (finalValue - startValue) * easedProgress);

        updateText(current);

        if (progress < 1) {
          requestAnimationFrame(finalAnimate);
        }
      }

      finalAnimate();
    };
  }

  /**
   * Initialize main counter
   * @param {string|HTMLElement} element - Element or selector
   */
  initMainCounter(element = CounterConfig.selectors.counter) {
    this.mainCounter = this.createCounter('main', element);
    return this.mainCounter;
  }

  /**
   * Start all counters
   */
  startAll() {
    this.counters.forEach(counter => counter.start());
  }

  /**
   * Stop all counters
   */
  stopAll() {
    this.counters.forEach(counter => counter.stop());
  }

  /**
   * Animate counter from zero to target
   * @param {number} target - Target value
   * @param {string} counterId - Counter ID (default: 'main')
   */
  animateToTarget(target, counterId = 'main') {
    const counter = this.counters.get(counterId);
    if (!counter) {
      console.error(`Counter not found: ${counterId}`);
      return;
    }

    if (counter.isAnimating()) {
      // If already animating, just update the target
      counter.accelerateToTarget(target);
    } else {
      // Start new animation
      counter.start(target);
    }
  }
}

// Add counter event constants
export const CounterEvents = {
  COUNTER_START: 'counter:start',
  COUNTER_STOP: 'counter:stop',
  COUNTER_ACCELERATE: 'counter:accelerate',
  COUNTER_COMPLETE: 'counter:complete',
  COUNTER_UPDATE: 'counter:update'
};

// Add to main Events object
Object.assign(Events, CounterEvents);

// Create singleton instance
const counterManager = new CounterManager();

// Export functions for backward compatibility
export const startCounterAnimation = (element) => {
  const counter = counterManager.initMainCounter(element);
  if (counter) counter.start();
};

export const animateCounterFromZero = (end) => {
  counterManager.animateToTarget(end, 'main');
};

export const createAnimatedPlaceholder = (element) => {
  return counterManager.createPlaceholder(element);
};

export const createAnimatedSubmitButton = (element) => {
  return counterManager.createSubmitButton(element);
};

export const accelerateToTarget = (target) => {
  const counter = counterManager.getCounter('main');
  if (counter) counter.accelerateToTarget(target);
};

// Export classes and instance
export default counterManager;
export { AnimatedCounter, CounterManager, counterManager };
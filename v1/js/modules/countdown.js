/**
 * Countdown Timer Module
 * @module Countdown
 */

import { AppConfig } from '../config/app.config.js';
import eventBus, { Events } from '../core/eventBus.js';
import stateManager from '../core/StateManager.js';

class CountdownTimer {
  constructor(options = {}) {
    this.deadline = options.deadline || AppConfig.countdown.deadline;
    this.updateInterval = options.updateInterval || AppConfig.countdown.updateInterval;
    this.expiredMessage = options.expiredMessage || AppConfig.countdown.expiredMessage;
    this.elements = {};
    this.intervalId = null;
    this.isExpired = false;
    this.onUpdate = options.onUpdate || null;
    this.onExpire = options.onExpire || null;
  }

  /**
   * Initialize the countdown timer
   * @param {Object} elements - Object containing DOM element references
   */
  init(elements = {}) {
    this.elements = {
      days: elements.days || document.querySelector('.header-days'),
      hours: elements.hours || document.querySelector('.header-hours'),
      minutes: elements.minutes || document.querySelector('.header-minutes'),
      seconds: elements.seconds || document.querySelector('.header-seconds'),
      container: elements.container || document.querySelector('.header-countdown')
    };

    // Set deadline in state
    stateManager.set('countdown.deadline', this.deadline);
    stateManager.set('countdown.isExpired', false);

    // Start the countdown
    this.start();
    
    // Return self for chaining
    return this;
  }

  /**
   * Start the countdown timer
   */
  start() {
    if (this.intervalId) {
      this.stop();
    }

    // Initial update
    this.update();

    // Set interval for updates
    this.intervalId = setInterval(() => {
      this.update();
    }, this.updateInterval);

    eventBus.emit(Events.COUNTDOWN_STARTED);
  }

  /**
   * Stop the countdown timer
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      eventBus.emit(Events.COUNTDOWN_STOPPED);
    }
  }

  /**
   * Update the countdown display
   */
  update() {
    const deadline = new Date(this.deadline);
    const now = new Date().getTime();
    const timeLeft = deadline - now;

    if (timeLeft < 0) {
      this.handleExpired();
      return;
    }

    const timeValues = this.calculateTimeValues(timeLeft);
    this.updateDisplay(timeValues);
    
    // Update state
    stateManager.update({
      'countdown.timeLeft': timeLeft,
      'countdown.values': timeValues
    });

    // Call custom update handler
    if (this.onUpdate) {
      this.onUpdate(timeValues, timeLeft);
    }

    // Emit update event
    eventBus.emit(Events.COUNTDOWN_UPDATE, { timeValues, timeLeft });
  }

  /**
   * Calculate time values from milliseconds
   * @private
   */
  calculateTimeValues(timeLeft) {
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
  }

  /**
   * Update the display elements
   * @private
   */
  updateDisplay({ days, hours, minutes, seconds }) {
    if (this.elements.days) {
      this.elements.days.textContent = this.formatNumber(days);
    }
    if (this.elements.hours) {
      this.elements.hours.textContent = this.formatNumber(hours);
    }
    if (this.elements.minutes) {
      this.elements.minutes.textContent = this.formatNumber(minutes);
    }
    if (this.elements.seconds) {
      this.elements.seconds.textContent = this.formatNumber(seconds);
    }
  }

  /**
   * Format number with leading zero
   * @private
   */
  formatNumber(num) {
    return num.toString().padStart(2, '0');
  }

  /**
   * Handle expired countdown
   * @private
   */
  handleExpired() {
    if (!this.isExpired) {
      this.isExpired = true;
      this.stop();

      // Update display
      if (this.elements.container) {
        this.elements.container.innerHTML = 
          `<span style="color: #ff6b6b; font-weight: bold;">${this.expiredMessage}</span>`;
      }

      // Update state
      stateManager.set('countdown.isExpired', true);

      // Call custom expire handler
      if (this.onExpire) {
        this.onExpire();
      }

      // Emit expired event
      eventBus.emit(Events.COUNTDOWN_EXPIRED);
    }
  }

  /**
   * Set a new deadline
   * @param {string} deadline - New deadline date string
   */
  setDeadline(deadline) {
    this.deadline = deadline;
    this.isExpired = false;
    stateManager.set('countdown.deadline', deadline);
    stateManager.set('countdown.isExpired', false);
    
    if (this.intervalId) {
      this.update();
    }
  }

  /**
   * Get time remaining
   * @returns {Object} Time values and total milliseconds
   */
  getTimeRemaining() {
    const deadline = new Date(this.deadline);
    const now = new Date().getTime();
    const timeLeft = Math.max(0, deadline - now);
    
    return {
      total: timeLeft,
      values: this.calculateTimeValues(timeLeft),
      isExpired: timeLeft <= 0
    };
  }

  /**
   * Destroy the countdown timer
   */
  destroy() {
    this.stop();
    this.elements = {};
    this.isExpired = false;
  }
}

// Add event constants for countdown
export const CountdownEvents = {
  COUNTDOWN_STARTED: 'countdown:started',
  COUNTDOWN_STOPPED: 'countdown:stopped',
  COUNTDOWN_UPDATE: 'countdown:update',
  COUNTDOWN_EXPIRED: 'countdown:expired'
};

// Add to main Events object
Object.assign(Events, CountdownEvents);

// Factory function for creating countdown instances
export function createCountdown(options) {
  return new CountdownTimer(options);
}

// Default export
export default CountdownTimer;
export { CountdownTimer };
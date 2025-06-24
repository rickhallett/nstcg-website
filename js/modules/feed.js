/**
 * Live Feed Module
 * @module Feed
 */

import { ApiConfig } from '../config/api.config.js';
import eventBus, { Events } from '../core/eventBus.js';
import stateManager from '../core/StateManager.js';
import { createSpinner } from '../utils/templates.js';

/**
 * Feed configuration
 */
const FeedConfig = {
  updateInterval: 30000, // 30 seconds
  maxItems: 10,
  animationDelay: 100, // milliseconds between items
  
  selectors: {
    container: '.live-feed',
    item: '.feed-item',
    loading: '.feed-loading',
    empty: '.feed-empty',
    error: '.feed-error'
  },
  
  defaultActions: [
    'joined the consultation',
    'signed up with family',
    'added their voice',
    'shared with neighbours',
    'took action',
    'signed up',
    'registered their concern',
    'joined the movement'
  ],
  
  messages: {
    loading: 'Loading recent activity...',
    empty: 'Be the first to join the movement!',
    error: 'Unable to load recent activity'
  }
};

/**
 * Live Feed Manager class
 */
class LiveFeedManager {
  constructor(options = {}) {
    this.config = { ...FeedConfig, ...options };
    this.feedActions = [];
    this.updateTimer = null;
    this.container = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the live feed
   * @param {HTMLElement|string} container - Container element or selector
   */
  async init(container) {
    if (typeof container === 'string') {
      this.container = document.querySelector(container);
    } else {
      this.container = container;
    }

    if (!this.container) {
      console.error('Live feed container not found');
      return;
    }

    this.isInitialized = true;

    // Load feed actions
    await this.loadFeedActions();

    // Initial update
    await this.update(true);

    // Start auto-update if enabled
    if (this.config.autoUpdate !== false) {
      this.startAutoUpdate();
    }

    // Emit initialized event
    eventBus.emit(Events.FEED_INITIALIZED);
  }

  /**
   * Load feed actions from JSON or use defaults
   * @private
   */
  async loadFeedActions() {
    try {
      const response = await fetch('/data/feed-actions.json');
      const data = await response.json();
      this.feedActions = data.feedActions || this.config.defaultActions;
    } catch (error) {
      console.error('Error loading feed actions:', error);
      this.feedActions = this.config.defaultActions;
    }

    stateManager.set('feed.actions', this.feedActions);
  }

  /**
   * Update the live feed
   * @param {boolean} showLoading - Whether to show loading state
   */
  async update(showLoading = false) {
    if (!this.container) return;

    // Show loading state if requested
    if (showLoading) {
      this.clearContainer();
      this.showLoading();
    }

    try {
      const signups = await this.fetchRecentSignups();
      
      // Clear container
      this.clearContainer();

      if (signups && signups.length > 0) {
        this.renderSignups(signups);
      } else {
        this.showEmpty();
      }

      // Update state
      stateManager.set('feed.lastUpdate', new Date().toISOString());
      stateManager.set('feed.itemCount', signups.length);

      // Emit update event
      eventBus.emit(Events.FEED_UPDATED, { count: signups.length });

    } catch (error) {
      console.error('Error updating live feed:', error);
      this.showError();
      
      eventBus.emit(Events.FEED_ERROR, error);
    }
  }

  /**
   * Fetch recent signups from API
   * @private
   */
  async fetchRecentSignups() {
    const response = await fetch('/api/get-recent-signups');
    
    if (!response.ok) {
      throw new Error('Failed to fetch signups');
    }

    const data = await response.json();
    return data.signups || [];
  }

  /**
   * Clear the container
   * @private
   */
  clearContainer() {
    const items = this.container.querySelectorAll(
      `${this.config.selectors.item}, ${this.config.selectors.loading}, ${this.config.selectors.empty}, ${this.config.selectors.error}`
    );
    items.forEach(item => item.remove());
  }

  /**
   * Show loading state
   * @private
   */
  showLoading() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = this.config.selectors.loading.substring(1);
    loadingDiv.innerHTML = `
      <div class="loading-spinner"></div>
      <p>${this.config.messages.loading}</p>
    `;
    this.container.appendChild(loadingDiv);
  }

  /**
   * Show empty state
   * @private
   */
  showEmpty() {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = this.config.selectors.empty.substring(1);
    emptyDiv.innerHTML = `
      <p style="color: #666;">
        ${this.config.messages.empty}
      </p>
    `;
    this.container.appendChild(emptyDiv);
  }

  /**
   * Show error state
   * @private
   */
  showError() {
    // Only show error if there are no existing items
    const existingItems = this.container.querySelectorAll(this.config.selectors.item);
    if (existingItems.length === 0) {
      this.clearContainer();
      
      const errorDiv = document.createElement('div');
      errorDiv.className = this.config.selectors.error.substring(1);
      errorDiv.innerHTML = `
        <p style="color: #ff6666;">
          ${this.config.messages.error}
        </p>
      `;
      this.container.appendChild(errorDiv);
    }
  }

  /**
   * Render signups
   * @private
   */
  renderSignups(signups) {
    // Limit to max items
    const itemsToShow = signups.slice(0, this.config.maxItems);

    itemsToShow.forEach((signup, index) => {
      const feedItem = this.createFeedItem(signup, index);
      this.container.appendChild(feedItem);
    });
  }

  /**
   * Create a feed item element
   * @private
   */
  createFeedItem(signup, index) {
    const feedItem = document.createElement('div');
    feedItem.className = this.config.selectors.item.substring(1);
    feedItem.style.animationDelay = `${index * this.config.animationDelay}ms`;

    const relativeTime = this.getRelativeTime(signup.timestamp);
    const action = this.getRandomAction();

    let feedContent = `
      <div class="feed-time">${relativeTime}</div>
      <div class="feed-message">${signup.name} ${action}</div>
    `;

    // Add comment if present
    if (signup.comment) {
      feedContent += `<div class="feed-comment">"${signup.comment}"</div>`;
    }

    feedItem.innerHTML = feedContent;
    
    return feedItem;
  }

  /**
   * Get relative time from timestamp
   * @private
   */
  getRelativeTime(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  }

  /**
   * Get random action from feed actions
   * @private
   */
  getRandomAction() {
    return this.feedActions[Math.floor(Math.random() * this.feedActions.length)];
  }

  /**
   * Start auto-update timer
   */
  startAutoUpdate() {
    this.stopAutoUpdate(); // Clear any existing timer
    
    this.updateTimer = setInterval(() => {
      this.update(false);
    }, this.config.updateInterval);

    stateManager.set('feed.autoUpdate', true);
  }

  /**
   * Stop auto-update timer
   */
  stopAutoUpdate() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    stateManager.set('feed.autoUpdate', false);
  }

  /**
   * Pause updates
   */
  pause() {
    this.stopAutoUpdate();
    eventBus.emit(Events.FEED_PAUSED);
  }

  /**
   * Resume updates
   */
  resume() {
    this.startAutoUpdate();
    this.update(false); // Update immediately
    eventBus.emit(Events.FEED_RESUMED);
  }

  /**
   * Add a new item to the feed (for real-time updates)
   * @param {Object} signup - Signup data
   */
  addItem(signup) {
    if (!this.container) return;

    // Remove empty state if present
    const emptyState = this.container.querySelector(this.config.selectors.empty);
    if (emptyState) {
      emptyState.remove();
    }

    // Create and prepend new item
    const feedItem = this.createFeedItem(signup, 0);
    feedItem.style.animation = 'none';
    this.container.insertBefore(feedItem, this.container.firstChild);

    // Trigger animation
    setTimeout(() => {
      feedItem.style.animation = '';
    }, 10);

    // Remove oldest item if exceeding max
    const items = this.container.querySelectorAll(this.config.selectors.item);
    if (items.length > this.config.maxItems) {
      items[items.length - 1].remove();
    }

    // Update state
    const currentCount = stateManager.get('feed.itemCount') || 0;
    stateManager.set('feed.itemCount', Math.min(currentCount + 1, this.config.maxItems));

    eventBus.emit(Events.FEED_ITEM_ADDED, signup);
  }

  /**
   * Set update interval
   * @param {number} interval - Interval in milliseconds
   */
  setUpdateInterval(interval) {
    this.config.updateInterval = interval;
    
    if (this.updateTimer) {
      this.startAutoUpdate(); // Restart with new interval
    }
  }

  /**
   * Destroy the feed manager
   */
  destroy() {
    this.stopAutoUpdate();
    this.clearContainer();
    this.container = null;
    this.isInitialized = false;
    
    eventBus.emit(Events.FEED_DESTROYED);
  }
}

// Add feed event constants
export const FeedEvents = {
  FEED_INITIALIZED: 'feed:initialized',
  FEED_UPDATED: 'feed:updated',
  FEED_ERROR: 'feed:error',
  FEED_ITEM_ADDED: 'feed:item:added',
  FEED_PAUSED: 'feed:paused',
  FEED_RESUMED: 'feed:resumed',
  FEED_DESTROYED: 'feed:destroyed'
};

// Add to main Events object
Object.assign(Events, FeedEvents);

// Create singleton instance
const liveFeedManager = new LiveFeedManager();

// Export functions for backward compatibility
export const updateLiveFeed = (showLoading) => liveFeedManager.update(showLoading);
export const initLiveFeed = (container) => liveFeedManager.init(container);

// Export classes and instance
export default liveFeedManager;
export { LiveFeedManager, liveFeedManager };
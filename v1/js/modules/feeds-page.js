/**
 * Feeds Page Module
 * @module FeedsPage
 */

import eventBus, { Events } from '../core/eventBus.js';
import stateManager from '../core/StateManager.js';

/**
 * Cache configuration for feeds data
 */
const CACHE_CONFIG = {
  participants: {
    key: 'nstcg_feeds_participants',
    ttl: 5 * 60 * 1000, // 5 minutes
    version: '1.0.0'
  },
  hotTopics: {
    key: 'nstcg_feeds_hot_topics',
    ttl: 6 * 60 * 60 * 1000, // 6 hours
    version: '1.0.0'
  }
};

/**
 * Feeds Page configuration
 */
const FeedsConfig = {
  baseCount: 215, // Historical count before database tracking
  
  selectors: {
    totalCount: '#total-count',
    todayCount: '#today-count',
    weekCount: '#week-count',
    feedsGrid: '#feeds-grid',
    feedsCount: '#feeds-count span',
    loadingState: '#loading-state',
    errorState: '#error-state',
    emptyState: '#empty-state',
    graphLoading: '#graph-loading',
    signupChart: '#signup-chart',
    hotTopicsContainer: '#hot-topics-container',
    hotTopicsLoading: '#hot-topics-loading',
    hotTopicsError: '#hot-topics-error',
    hotTopicsEmpty: '#hot-topics-empty'
  },
  
  colors: {
    primary: '#ff6600',
    primaryLight: 'rgba(255, 102, 0, 0.2)',
    gridColor: 'rgba(255, 255, 255, 0.1)',
    textColor: '#ffffff'
  }
};

/**
 * Feeds Page Manager class
 */
class FeedsPageManager {
  constructor() {
    this.participants = [];
    this.chart = null;
    this.isLoading = false;
    this.hotTopics = null;
    this.revalidationInProgress = new Set();
  }

  /**
   * Initialize the feeds page
   */
  async init() {
    // Check and clear outdated cache if needed
    this.checkCacheVersions();
    
    // Load all participants
    await this.loadAllParticipants();
    
    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Window resize for chart responsiveness
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (this.chart) {
          this.chart.resize();
        }
      }, 250);
    });
  }

  /**
   * Check cache versions and clear if outdated
   */
  checkCacheVersions() {
    try {
      // Check participants cache version
      const participantsVersionKey = `${CACHE_CONFIG.participants.key}_version`;
      const participantsVersion = localStorage.getItem(participantsVersionKey);
      if (participantsVersion !== CACHE_CONFIG.participants.version) {
        localStorage.removeItem(CACHE_CONFIG.participants.key);
        localStorage.setItem(participantsVersionKey, CACHE_CONFIG.participants.version);
        console.log('Cleared outdated participants cache');
      }

      // Check hot topics cache version
      const hotTopicsVersionKey = `${CACHE_CONFIG.hotTopics.key}_version`;
      const hotTopicsVersion = localStorage.getItem(hotTopicsVersionKey);
      if (hotTopicsVersion !== CACHE_CONFIG.hotTopics.version) {
        localStorage.removeItem(CACHE_CONFIG.hotTopics.key);
        localStorage.setItem(hotTopicsVersionKey, CACHE_CONFIG.hotTopics.version);
        console.log('Cleared outdated hot topics cache');
      }
    } catch (error) {
      console.warn('Error checking cache versions:', error);
    }
  }

  /**
   * Get cached data with TTL validation
   */
  getCachedData(cacheType) {
    try {
      const config = CACHE_CONFIG[cacheType];
      if (!config) return null;

      const cached = localStorage.getItem(config.key);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      // Check if cache is still valid
      if (age < config.ttl) {
        console.log(`Using cached ${cacheType} data (age: ${Math.round(age / 1000)}s)`);
        return data;
      }

      // Cache is expired
      console.log(`Cache expired for ${cacheType} (age: ${Math.round(age / 1000)}s)`);
      return null;
    } catch (error) {
      console.warn(`Error reading ${cacheType} cache:`, error);
      return null;
    }
  }

  /**
   * Save data to cache
   */
  setCachedData(cacheType, data) {
    try {
      const config = CACHE_CONFIG[cacheType];
      if (!config) return;

      const cacheData = {
        data: data,
        timestamp: Date.now()
      };

      localStorage.setItem(config.key, JSON.stringify(cacheData));
      console.log(`Cached ${cacheType} data`);
    } catch (error) {
      console.warn(`Error caching ${cacheType} data:`, error);
    }
  }

  /**
   * Revalidate cached data in background
   */
  async revalidateInBackground(cacheType, fetchFunction) {
    // Prevent duplicate revalidations
    if (this.revalidationInProgress.has(cacheType)) {
      return;
    }

    this.revalidationInProgress.add(cacheType);
    console.log(`Starting background revalidation for ${cacheType}`);

    try {
      const freshData = await fetchFunction();
      if (freshData) {
        this.setCachedData(cacheType, freshData);
        console.log(`Background revalidation completed for ${cacheType}`);
      }
    } catch (error) {
      console.warn(`Background revalidation failed for ${cacheType}:`, error);
    } finally {
      this.revalidationInProgress.delete(cacheType);
    }
  }

  /**
   * Load all participants from API
   */
  async loadAllParticipants() {
    if (this.isLoading) return;
    
    // Check cache first
    const cachedData = this.getCachedData('participants');
    if (cachedData) {
      // Use cached data immediately
      this.handleParticipantsData(cachedData);
      
      // Revalidate in background for fresh data
      this.revalidateInBackground('participants', () => this.fetchParticipants());
      return;
    }
    
    // No cache, fetch from API
    this.isLoading = true;
    this.showLoadingState();

    try {
      const data = await this.fetchParticipants();
      
      if (data) {
        // Cache the fresh data
        this.setCachedData('participants', data);
        
        // Handle the data
        this.handleParticipantsData(data);
      }

    } catch (error) {
      console.error('Error loading participants:', error);
      this.showErrorState();
      
      eventBus.emit(Events.FEEDS_ERROR, error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Fetch participants from API
   */
  async fetchParticipants() {
    const response = await fetch('/api/get-all-participants');
    
    if (!response.ok) {
      throw new Error('Failed to fetch participants');
    }

    const data = await response.json();
    
    console.log('Feeds API Response:', {
      participantCount: data.participants?.length || 0,
      totalCount: data.totalCount,
      todayCount: data.todayCount,
      weekCount: data.weekCount,
      hasError: !!data.error
    });
    
    return data;
  }

  /**
   * Handle participants data (from cache or API)
   */
  async handleParticipantsData(data) {
    // Store participants
    this.participants = data.participants || [];
    
    // Update statistics
    this.updateStatistics(data);
    
    // Render participant grid
    this.renderParticipants();
    
    // Create line graph
    this.createLineGraph();
    
    // Load hot topics
    await this.loadHotTopics();
    
    // Hide loading state
    this.hideLoadingState();
    
    // Emit success event
    eventBus.emit(Events.FEEDS_LOADED, {
      count: this.participants.length,
      total: data.totalCount
    });
  }

  /**
   * Update statistics displays
   */
  updateStatistics(data) {
    // Update total count (add base count to database count)
    const totalElement = document.querySelector(FeedsConfig.selectors.totalCount);
    if (totalElement) {
      const totalWithBase = (data.totalCount || 0) + FeedsConfig.baseCount;
      totalElement.innerHTML = this.formatNumber(totalWithBase);
    }

    // Update today count
    const todayElement = document.querySelector(FeedsConfig.selectors.todayCount);
    if (todayElement) {
      todayElement.innerHTML = this.formatNumber(data.todayCount || 0);
    }

    // Update week count
    const weekElement = document.querySelector(FeedsConfig.selectors.weekCount);
    if (weekElement) {
      weekElement.innerHTML = this.formatNumber(data.weekCount || 0);
    }

    // Update feeds count
    const feedsCountElement = document.querySelector(FeedsConfig.selectors.feedsCount);
    if (feedsCountElement) {
      feedsCountElement.textContent = this.participants.length;
    }
  }

  /**
   * Format number with animation
   */
  formatNumber(num) {
    return `<span class="count-animate">${num.toLocaleString()}</span>`;
  }

  /**
   * Render participant cards
   */
  renderParticipants() {
    const grid = document.querySelector(FeedsConfig.selectors.feedsGrid);
    if (!grid) return;

    // Clear existing content
    grid.innerHTML = '';

    if (this.participants.length === 0) {
      this.showEmptyState();
      return;
    }

    // Sort by most recent first for display
    const sortedParticipants = [...this.participants].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Create participant cards
    sortedParticipants.forEach((participant, index) => {
      const card = this.createParticipantCard(participant, index);
      grid.appendChild(card);
    });

    // Add staggered animation
    requestAnimationFrame(() => {
      const cards = grid.querySelectorAll('.participant-card');
      cards.forEach((card, index) => {
        setTimeout(() => {
          card.classList.add('visible');
        }, index * 20); // 20ms delay between cards
      });
    });
  }

  /**
   * Create participant card element
   */
  createParticipantCard(participant, index) {
    const card = document.createElement('div');
    card.className = 'participant-card';
    
    const timeAgo = this.getRelativeTime(participant.timestamp);
    
    let cardContent = `
      <div class="participant-header">
        <div class="participant-info">
          <h3 class="participant-name">${participant.name}</h3>
          <time class="participant-time">${timeAgo}</time>
        </div>
        <div class="participant-number">#${this.participants.length - index}</div>
      </div>
    `;

    if (participant.comment) {
      cardContent += `
        <div class="participant-comment">
          <i class="fas fa-quote-left"></i>
          <p>${participant.comment}</p>
        </div>
      `;
    }

    card.innerHTML = cardContent;
    return card;
  }

  /**
   * Get relative time string
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
    if (diffDays < 30) return `${diffDays} days ago`;
    
    // Format as date for older entries
    return then.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  }

  /**
   * Create cumulative signup line graph
   */
  createLineGraph() {
    const canvas = document.querySelector(FeedsConfig.selectors.signupChart);
    if (!canvas) {
      console.error('Campaign Momentum: Canvas element not found');
      return;
    }
    
    if (!window.Chart) {
      console.error('Campaign Momentum: Chart.js not loaded');
      return;
    }

    // Hide loading state
    const graphLoading = document.querySelector(FeedsConfig.selectors.graphLoading);
    if (graphLoading) {
      graphLoading.style.display = 'none';
    }

    try {
      // Prepare data
      const graphData = this.prepareGraphData();
      console.log('Campaign Momentum: Graph data prepared', { 
        labels: graphData.labels.length, 
        dataPoints: graphData.data.length,
        firstValue: graphData.data[0],
        lastValue: graphData.data[graphData.data.length - 1]
      });

    // Create chart
    const ctx = canvas.getContext('2d');
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: graphData.labels,
        datasets: [{
          label: 'Total Participants',
          data: graphData.data,
          borderColor: FeedsConfig.colors.primary,
          backgroundColor: FeedsConfig.colors.primaryLight,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: FeedsConfig.colors.primary,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: FeedsConfig.colors.primary,
            borderWidth: 1,
            cornerRadius: 4,
            padding: 12,
            displayColors: false,
            callbacks: {
              title: function(context) {
                return context[0].label;
              },
              label: function(context) {
                return 'Total: ' + context.parsed.y.toLocaleString() + ' participants';
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: FeedsConfig.colors.gridColor,
              borderColor: FeedsConfig.colors.gridColor
            },
            ticks: {
              color: FeedsConfig.colors.textColor,
              font: {
                size: 12
              },
              maxRotation: 45,
              minRotation: 45
            }
          },
          y: {
            beginAtZero: false,
            grid: {
              color: FeedsConfig.colors.gridColor,
              borderColor: FeedsConfig.colors.gridColor
            },
            ticks: {
              color: FeedsConfig.colors.textColor,
              font: {
                size: 12
              },
              callback: function(value) {
                return value.toLocaleString();
              }
            }
          }
        }
      }
    });
    } catch (error) {
      console.error('Campaign Momentum: Error creating chart', error);
      // Show loading state as error indicator
      if (graphLoading) {
        graphLoading.innerHTML = '<p style="color: #ff6b6b;">Failed to load graph</p>';
        graphLoading.style.display = 'flex';
      }
    }
  }

  /**
   * Prepare data for line graph
   */
  prepareGraphData() {
    // Group participants by date
    const dailyCounts = {};
    const dateToTimestamp = {}; // Store first timestamp for each date key
    
    this.participants.forEach(participant => {
      const date = new Date(participant.timestamp);
      const dateKey = date.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short',
        year: 'numeric'
      });
      
      dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
      
      // Store the first timestamp for this date key for sorting
      if (!dateToTimestamp[dateKey]) {
        dateToTimestamp[dateKey] = participant.timestamp;
      }
    });

    // Convert to cumulative data
    const labels = [];
    const data = [];
    let cumulative = FeedsConfig.baseCount;
    
    // Sort dates chronologically using actual timestamps
    const sortedDates = Object.keys(dailyCounts).sort((a, b) => {
      const dateA = new Date(dateToTimestamp[a]);
      const dateB = new Date(dateToTimestamp[b]);
      return dateA - dateB;
    });

    sortedDates.forEach(dateKey => {
      cumulative += dailyCounts[dateKey];
      // Remove year from label for cleaner display
      const labelWithoutYear = dateKey.split(' ').slice(0, 2).join(' ');
      labels.push(labelWithoutYear);
      data.push(cumulative);
    });

    // Ensure we show at least the base count if no data
    if (labels.length === 0) {
      labels.push('Start');
      data.push(FeedsConfig.baseCount);
    }

    return { labels, data };
  }

  /**
   * Show loading state
   */
  showLoadingState() {
    const loadingState = document.querySelector(FeedsConfig.selectors.loadingState);
    const errorState = document.querySelector(FeedsConfig.selectors.errorState);
    const emptyState = document.querySelector(FeedsConfig.selectors.emptyState);
    const grid = document.querySelector(FeedsConfig.selectors.feedsGrid);

    if (loadingState) loadingState.style.display = 'flex';
    if (errorState) errorState.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
    if (grid) grid.style.display = 'none';
  }

  /**
   * Hide loading state
   */
  hideLoadingState() {
    const loadingState = document.querySelector(FeedsConfig.selectors.loadingState);
    const grid = document.querySelector(FeedsConfig.selectors.feedsGrid);

    if (loadingState) loadingState.style.display = 'none';
    if (grid) grid.style.display = 'grid';
  }

  /**
   * Show error state
   */
  showErrorState() {
    const loadingState = document.querySelector(FeedsConfig.selectors.loadingState);
    const errorState = document.querySelector(FeedsConfig.selectors.errorState);
    const emptyState = document.querySelector(FeedsConfig.selectors.emptyState);
    const grid = document.querySelector(FeedsConfig.selectors.feedsGrid);

    if (loadingState) loadingState.style.display = 'none';
    if (errorState) errorState.style.display = 'flex';
    if (emptyState) emptyState.style.display = 'none';
    if (grid) grid.style.display = 'none';
  }

  /**
   * Show empty state
   */
  showEmptyState() {
    const loadingState = document.querySelector(FeedsConfig.selectors.loadingState);
    const errorState = document.querySelector(FeedsConfig.selectors.errorState);
    const emptyState = document.querySelector(FeedsConfig.selectors.emptyState);

    if (loadingState) loadingState.style.display = 'none';
    if (errorState) errorState.style.display = 'none';
    if (emptyState) emptyState.style.display = 'flex';
  }

  /**
   * Load hot topics analysis from API
   */
  async loadHotTopics() {
    // Check cache first
    const cachedData = this.getCachedData('hotTopics');
    if (cachedData) {
      // Use cached data immediately
      this.hotTopics = cachedData;
      this.renderHotTopics();
      eventBus.emit('hot-topics-loaded', cachedData);
      
      // Revalidate in background for fresh data
      this.revalidateInBackground('hotTopics', () => this.fetchHotTopics());
      return;
    }
    
    // No cache, fetch from API
    this.showHotTopicsLoading();

    try {
      const data = await this.fetchHotTopics();
      
      if (data) {
        // Cache the fresh data
        this.setCachedData('hotTopics', data);
        
        // Handle the data
        this.hotTopics = data;
        this.renderHotTopics();
        eventBus.emit('hot-topics-loaded', data);
      }

    } catch (error) {
      console.error('Error loading hot topics:', error);
      this.showHotTopicsError();
      
      eventBus.emit('hot-topics-error', error);
    }
  }

  /**
   * Fetch hot topics from API
   */
  async fetchHotTopics() {
    const response = await fetch('/api/analyze-concerns');
    
    if (!response.ok) {
      throw new Error('Failed to fetch hot topics');
    }

    const data = await response.json();
    console.log('Hot topics API Response:', {
      concernsCount: data.concerns?.length || 0,
      totalComments: data.totalComments
    });
    
    return data;
  }

  /**
   * Render hot topics cards
   */
  renderHotTopics() {
    const container = document.querySelector(FeedsConfig.selectors.hotTopicsContainer);
    if (!container) return;

    // Hide loading/error states
    this.hideHotTopicsLoading();

    // Check if we have concerns to display
    if (!this.hotTopics.concerns || this.hotTopics.concerns.length === 0) {
      this.showHotTopicsEmpty();
      return;
    }

    // Clear container
    container.innerHTML = '';

    // Get max frequency for percentage calculations
    const maxFrequency = Math.max(...this.hotTopics.concerns.map(c => c.frequency));

    // Create cards for each concern
    this.hotTopics.concerns.forEach((concern, index) => {
      const card = this.createHotTopicCard(concern, maxFrequency);
      container.appendChild(card);
    });

    // Show container
    container.style.display = 'grid';

    // Add staggered animation
    requestAnimationFrame(() => {
      const cards = container.querySelectorAll('.hot-topic-card');
      cards.forEach((card, index) => {
        setTimeout(() => {
          card.classList.add('visible');
        }, index * 200); // 200ms delay between cards
      });
    });
  }

  /**
   * Create hot topic card element
   */
  createHotTopicCard(concern, maxFrequency) {
    const card = document.createElement('div');
    card.className = `hot-topic-card rank-${concern.rank}`;
    
    // Calculate frequency percentage for bar
    const frequencyPercent = (concern.frequency / maxFrequency) * 100;
    
    card.innerHTML = `
      <div class="hot-topic-header">
        <div class="hot-topic-info">
          <h3 class="hot-topic-title">${concern.title}</h3>
          <p class="hot-topic-description">${concern.description}</p>
          <div class="hot-topic-frequency">
            <i class="fas fa-users"></i>
            <span>${concern.frequency} mentions</span>
          </div>
          <div class="frequency-bar">
            <div class="frequency-fill" style="--fill-width: ${frequencyPercent}%; width: ${frequencyPercent}%;"></div>
          </div>
        </div>
        <div class="hot-topic-rank rank-${concern.rank}">${concern.rank}</div>
      </div>
    `;

    return card;
  }

  /**
   * Show hot topics loading state
   */
  showHotTopicsLoading() {
    const loading = document.querySelector(FeedsConfig.selectors.hotTopicsLoading);
    const error = document.querySelector(FeedsConfig.selectors.hotTopicsError);
    const empty = document.querySelector(FeedsConfig.selectors.hotTopicsEmpty);
    const container = document.querySelector(FeedsConfig.selectors.hotTopicsContainer);

    if (loading) loading.style.display = 'flex';
    if (error) error.style.display = 'none';
    if (empty) empty.style.display = 'none';
    if (container) container.style.display = 'none';
  }

  /**
   * Hide hot topics loading state
   */
  hideHotTopicsLoading() {
    const loading = document.querySelector(FeedsConfig.selectors.hotTopicsLoading);
    if (loading) loading.style.display = 'none';
  }

  /**
   * Show hot topics error state
   */
  showHotTopicsError() {
    const loading = document.querySelector(FeedsConfig.selectors.hotTopicsLoading);
    const error = document.querySelector(FeedsConfig.selectors.hotTopicsError);
    const empty = document.querySelector(FeedsConfig.selectors.hotTopicsEmpty);
    const container = document.querySelector(FeedsConfig.selectors.hotTopicsContainer);

    if (loading) loading.style.display = 'none';
    if (error) error.style.display = 'flex';
    if (empty) empty.style.display = 'none';
    if (container) container.style.display = 'none';
  }

  /**
   * Show hot topics empty state
   */
  showHotTopicsEmpty() {
    const loading = document.querySelector(FeedsConfig.selectors.hotTopicsLoading);
    const error = document.querySelector(FeedsConfig.selectors.hotTopicsError);
    const empty = document.querySelector(FeedsConfig.selectors.hotTopicsEmpty);
    const container = document.querySelector(FeedsConfig.selectors.hotTopicsContainer);

    if (loading) loading.style.display = 'none';
    if (error) error.style.display = 'none';
    if (empty) empty.style.display = 'flex';
    if (container) container.style.display = 'none';
  }

  /**
   * Force refresh all cached data
   */
  async forceRefresh() {
    console.log('Force refreshing all feeds data...');
    
    // Clear cache
    localStorage.removeItem(CACHE_CONFIG.participants.key);
    localStorage.removeItem(CACHE_CONFIG.hotTopics.key);
    
    // Reload all data
    await this.loadAllParticipants();
  }
}

// Create instance and expose globally for retry button
const feedsPage = new FeedsPageManager();
window.feedsPage = feedsPage;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => feedsPage.init());
} else {
  feedsPage.init();
}

// Export
export default feedsPage;
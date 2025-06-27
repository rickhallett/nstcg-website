/**
 * Feeds Page Module
 * @module FeedsPage
 */

import eventBus, { Events } from '../core/eventBus.js';
import stateManager from '../core/StateManager.js';

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
  }

  /**
   * Initialize the feeds page
   */
  async init() {
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
   * Load all participants from API
   */
  async loadAllParticipants() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.showLoadingState();

    try {
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

    } catch (error) {
      console.error('Error loading participants:', error);
      this.showErrorState();
      
      eventBus.emit(Events.FEEDS_ERROR, error);
    } finally {
      this.isLoading = false;
    }
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
    this.showHotTopicsLoading();

    try {
      const response = await fetch('/api/analyze-concerns');
      
      if (!response.ok) {
        throw new Error('Failed to fetch hot topics');
      }

      const data = await response.json();
      this.hotTopics = data;
      
      // Render hot topics
      this.renderHotTopics();
      
      // Emit success event
      eventBus.emit('hot-topics-loaded', data);

    } catch (error) {
      console.error('Error loading hot topics:', error);
      this.showHotTopicsError();
      
      eventBus.emit('hot-topics-error', error);
    }
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
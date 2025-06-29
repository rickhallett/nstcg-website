/**
 * API Communication Module
 * @module API
 */

import { ApiConfig, ApiStatus, buildApiUrl, getErrorMessage } from '../config/api.config.js';
import eventBus, { Events } from '../core/eventBus.js';
import stateManager from '../core/StateManager.js';
import cache, { CACHE_TTL } from '../utils/cache.js';

/**
 * API Client class for handling all API communications
 */
class ApiClient {
  constructor(config = {}) {
    this.config = {
      ...ApiConfig.http,
      ...config
    };
    this.requestQueue = [];
    this.rateLimitTracker = new Map();
  }

  /**
   * Make an API request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise} Response data
   */
  async request(endpoint, options = {}) {
    const url = buildApiUrl(endpoint);
    const config = {
      ...this.config,
      ...options,
      headers: {
        ...this.config.headers,
        ...(options.headers || {})
      }
    };

    // Check rate limiting
    if (this.isRateLimited(endpoint)) {
      throw new Error(ApiConfig.errorMessages.rateLimit);
    }

    // Update rate limit tracker
    this.trackRequest(endpoint);

    // Set loading state
    stateManager.set('ui.isLoading', true);
    eventBus.emit(Events.API_REQUEST_START, { endpoint, options });

    try {
      const response = await this.fetchWithTimeout(url, config);
      const data = await this.handleResponse(response, endpoint);

      // Success
      eventBus.emit(Events.API_REQUEST_SUCCESS, { endpoint, data });
      eventBus.emit(Events.DATA_LOADED, { endpoint, data });

      return data;
    } catch (error) {
      // Error
      eventBus.emit(Events.API_REQUEST_ERROR, { endpoint, error });
      eventBus.emit(Events.DATA_ERROR, { endpoint, error });

      throw error;
    } finally {
      stateManager.set('ui.isLoading', false);
    }
  }

  /**
   * Fetch with timeout
   * @private
   */
  async fetchWithTimeout(url, options) {
    const timeout = options.timeout || this.config.timeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(ApiConfig.errorMessages.timeout);
      }
      throw error;
    }
  }

  /**
   * Handle API response
   * @private
   */
  async handleResponse(response, endpoint) {
    if (!response.ok) {
      const errorData = await this.parseErrorResponse(response);
      const errorMessage = errorData.error || getErrorMessage(response.status);

      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = errorData;
      error.endpoint = endpoint;

      throw error;
    }

    return response.json();
  }

  /**
   * Parse error response
   * @private
   */
  async parseErrorResponse(response) {
    try {
      return await response.json();
    } catch {
      return { error: getErrorMessage(response.status) };
    }
  }

  /**
   * Check if endpoint is rate limited
   * @private
   */
  isRateLimited(endpoint) {
    const tracker = this.rateLimitTracker.get(endpoint);
    if (!tracker) return false;

    const now = Date.now();
    const windowStart = now - ApiConfig.rateLimit.windowMs;

    // Clean old requests
    tracker.requests = tracker.requests.filter(time => time > windowStart);

    return tracker.requests.length >= ApiConfig.rateLimit.maxRequests;
  }

  /**
   * Track API request for rate limiting
   * @private
   */
  trackRequest(endpoint) {
    if (!this.rateLimitTracker.has(endpoint)) {
      this.rateLimitTracker.set(endpoint, { requests: [] });
    }

    const tracker = this.rateLimitTracker.get(endpoint);
    tracker.requests.push(Date.now());
  }

  /**
   * GET request with caching support
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise} Response data
   */
  async get(endpoint, options = {}) {
    // Check if caching is enabled for this endpoint
    const cacheKey = `api_${endpoint}`;
    const cacheTTL = this.getCacheTTL(endpoint);

    if (cacheTTL && !options.skipCache) {
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        console.log(`Cache hit for ${endpoint}`);
        return cachedData;
      }
    }

    const data = await this.request(endpoint, {
      ...options,
      method: 'GET'
    });

    // Cache the response if applicable
    if (cacheTTL && !options.skipCache) {
      cache.set(cacheKey, data, cacheTTL);
    }

    return data;
  }

  /**
   * Get cache TTL for endpoint
   * @private
   */
  getCacheTTL(endpoint) {
    const ttlMap = {
      'getCount': CACHE_TTL.PARTICIPANT_COUNT,
      'feature-flags': CACHE_TTL.FEATURE_FLAGS,
      'getUserStats': CACHE_TTL.USER_STATS,
      'getRecentSignups': CACHE_TTL.RECENT_SIGNUPS,
      'getLeaderboard': CACHE_TTL.LEADERBOARD,
      'getDonations': CACHE_TTL.DONATIONS,
      'analyzeConcerns': CACHE_TTL.HOT_TOPICS
    };

    return ttlMap[endpoint] || null;
  }

  /**
   * POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @param {Object} options - Request options
   * @returns {Promise} Response data
   */
  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @param {Object} options - Request options
   * @returns {Promise} Response data
   */
  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise} Response data
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'DELETE'
    });
  }
}

// Create singleton instance
const apiClient = new ApiClient();

/**
 * API methods for specific endpoints
 */

/**
 * Submit form data to API
 * @param {Object} formData - Form data to submit
 * @returns {Promise} Submission result
 */
export async function submitForm(formData) {
  try {
    const result = await apiClient.post('submitForm', formData);

    // Update state on success
    stateManager.update({
      'user.hasSubmitted': true,
      'user.submissionData': formData
    });

    eventBus.emit(Events.USER_SUBMIT, { data: formData, result });

    return result;
  } catch (error) {
    console.error('Form submission error:', error);
    throw error;
  }
}

/**
 * Get participant count from API
 * @returns {Promise<number>} Participant count
 */
export async function getParticipantCount() {
  try {
    const data = await apiClient.get('getCount');
    const count = data.count || 0;

    // Update state
    stateManager.update({
      'data.participantCount': count,
      'data.lastUpdated': new Date().toISOString()
    });

    eventBus.emit(Events.COUNT_UPDATED, count);

    return count;
  } catch (error) {
    console.error('Error fetching participant count:', error);
    // Return cached count or default
    return stateManager.get('data.participantCount') || 215;
  }
}

/**
 * Submit form with retry logic
 * @param {Object} formData - Form data to submit
 * @param {number} retries - Number of retry attempts
 * @returns {Promise} Submission result
 */
export async function submitFormWithRetry(formData, retries = ApiConfig.http.retryAttempts) {
  let lastError;

  for (let i = 0; i <= retries; i++) {
    try {
      return await submitForm(formData);
    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx)
      if (error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Wait before retry
      if (i < retries) {
        await new Promise(resolve =>
          setTimeout(resolve, ApiConfig.http.retryDelay * (i + 1))
        );
      }
    }
  }

  throw lastError;
}

/**
 * Batch API requests
 * @param {Array} requests - Array of request configurations
 * @returns {Promise<Array>} Array of results
 */
export async function batchRequests(requests) {
  const results = await Promise.allSettled(
    requests.map(({ endpoint, method = 'GET', data, options }) => {
      switch (method.toUpperCase()) {
        case 'POST':
          return apiClient.post(endpoint, data, options);
        case 'PUT':
          return apiClient.put(endpoint, data, options);
        case 'DELETE':
          return apiClient.delete(endpoint, options);
        default:
          return apiClient.get(endpoint, options);
      }
    })
  );

  return results.map((result, index) => ({
    ...requests[index],
    status: result.status,
    value: result.value,
    reason: result.reason
  }));
}

// Add API event constants
export const ApiEvents = {
  API_REQUEST_START: 'api:request:start',
  API_REQUEST_SUCCESS: 'api:request:success',
  API_REQUEST_ERROR: 'api:request:error'
};

// Add to main Events object
Object.assign(Events, ApiEvents);

// Export singleton and methods
export default apiClient;
export { ApiClient, apiClient };
/**
 * API configuration
 * @module ApiConfig
 */

// API endpoints configuration
export const ApiConfig = {
  // Base URL for API calls (relative for same-origin requests)
  baseUrl: '/api',

  // API endpoints
  endpoints: {
    submitForm: '/submit-form',
    getCount: '/get-count'
  },

  // HTTP configuration
  http: {
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000 // milliseconds
  },

  // Rate limiting configuration (client-side)
  rateLimit: {
    maxRequests: 10,
    windowMs: 60000 // 1 minute
  },

  // Error messages
  errorMessages: {
    network: 'Network error. Please check your connection and try again.',
    timeout: 'Request timed out. Please try again.',
    rateLimit: 'Too many requests. Please wait a moment and try again.',
    server: 'Server error. Please try again later.',
    validation: 'Please check your input and try again.',
    default: 'Something went wrong. Please try again.'
  },

  // Success messages
  successMessages: {
    formSubmitted: 'Thank you! Your response has been recorded.',
    countFetched: 'Participant count updated successfully.'
  }
};

// API response status codes
export const ApiStatus = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Helper function to build full API URL
export function buildApiUrl(endpoint) {
  const base = ApiConfig.baseUrl;
  const path = ApiConfig.endpoints[endpoint] || endpoint;
  return `${base}${path}`;
}

// Helper function to get error message by status code
export function getErrorMessage(statusCode, defaultMessage) {
  switch (statusCode) {
    case ApiStatus.BAD_REQUEST:
      return ApiConfig.errorMessages.validation;
    case ApiStatus.RATE_LIMITED:
      return ApiConfig.errorMessages.rateLimit;
    case ApiStatus.SERVER_ERROR:
    case ApiStatus.SERVICE_UNAVAILABLE:
      return ApiConfig.errorMessages.server;
    default:
      return defaultMessage || ApiConfig.errorMessages.default;
  }
}

export default ApiConfig;
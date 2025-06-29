/**
 * Application configuration
 * @module AppConfig
 */

export const AppConfig = {
  // Countdown configuration
  countdown: {
    deadline: '2025-06-29T23:59:59+01:00', // BST (British Summer Time)
    updateInterval: 1000, // milliseconds
    expiredMessage: 'Consultation Closed'
  },

  // Form configuration
  form: {
    requiredFields: ['name', 'email'],
    maxCommentLength: 500,
    submitDelay: 1500 // milliseconds before showing confirmation
  },

  // Animation configuration
  animation: {
    counterDuration: 3000, // milliseconds
    scrollOffset: 100, // pixels
    fadeInDelay: 300 // milliseconds
  },

  // Storage configuration
  storage: {
    userIdKey: 'nstcg_user_id',
    submissionKey: 'nstcg_submission',
    preferencesKey: 'nstcg_preferences'
  },

  // UI configuration
  ui: {
    mobileBreakpoint: 768, // pixels
    toastDuration: 5000, // milliseconds
    modalCloseDelay: 500 // milliseconds
  }
};

// Initial state structure
export const initialState = {
  // Application state
  app: {
    isInitialized: false,
    isMobile: false,
    currentSection: 'hero'
  },

  // User state
  user: {
    id: null,
    hasSubmitted: false,
    submissionData: null
  },

  // Form state
  form: {
    isSubmitting: false,
    errors: {},
    values: {}
  },

  // UI state
  ui: {
    modalOpen: false,
    toastMessage: null,
    isLoading: false
  },

  // Data state
  data: {
    participantCount: null,
    lastUpdated: null
  },

  // Feature flags
  features: {
    enableAnalytics: true,
    enableAnimations: true,
    enableComments: true
  }
};

export default AppConfig;
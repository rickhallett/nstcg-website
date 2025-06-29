/**
 * Test Constants
 * 
 * Shared constants used across all E2E tests
 */

// Points configuration (matching production values)
export const POINTS = {
  REGISTRATION_REFERRED: 100,  // Points for registering via referral
  REGISTRATION_DIRECT: 0,      // Points for direct registration
  REFERRAL_BONUS: 25,         // Points for referring someone
  SHARE_POINTS: 0,            // Points per share (currently 0)
  EMAIL_BONUS: 75             // Static email campaign bonus
};

// Rate limits
export const LIMITS = {
  DAILY_TWITTER_SHARES: 5,
  DAILY_FACEBOOK_SHARES: 5,
  DAILY_WHATSAPP_SHARES: 10,
  DAILY_LINKEDIN_SHARES: 5,
  DAILY_EMAIL_SHARES: 10
};

// Test timeouts
export const TIMEOUTS = {
  API_RESPONSE: 5000,
  NOTIFICATION: 3000,
  PAGE_LOAD: 10000,
  NOTION_SYNC: 3000,  // Time to wait for Notion DB sync
  ANIMATION: 500
};

// Test user prefixes
export const TEST_PREFIXES = {
  EMAIL: 'e2e-test-',
  FIRST_NAME: 'TestUser',
  LAST_NAME: 'E2E'
};

// Social platform codes
export const PLATFORM_CODES = {
  twitter: 'TW',
  facebook: 'FB',
  whatsapp: 'WA',
  linkedin: 'LI',
  email: 'EM',
  copy: 'CP'
};

// Error messages
export const ERROR_MESSAGES = {
  ALREADY_REGISTERED: 'already registered',
  NETWORK_ERROR: 'connection',
  INVALID_EMAIL: 'valid email',
  REQUIRED_FIELDS: 'required',
  RATE_LIMIT: 'limit reached'
};

// Success messages  
export const SUCCESS_MESSAGES = {
  REGISTRATION: 'successfully registered',
  SHARE_TRACKED: 'tracked successfully',
  ACTIVATION: 'account activated',
  COPIED: 'Copied!'
};

// Test environment domains
export const TEST_DOMAINS = {
  LOCAL: 'http://localhost:5173',
  STAGING: 'https://staging.nstcg.com',
  PRODUCTION: 'https://nstcg.com'
};

// Notion test database IDs (from environment)
export const NOTION_DBS = {
  LEADS: process.env.NOTION_DATABASE_ID,
  GAMIFICATION: process.env.NOTION_GAMIFICATION_DB_ID
};
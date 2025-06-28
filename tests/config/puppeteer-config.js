/**
 * Puppeteer Configuration
 * 
 * Central configuration for all E2E tests using Puppeteer MCP
 */

export const puppeteerConfig = {
  launchOptions: {
    headless: process.env.HEADLESS !== 'false',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ],
    defaultViewport: {
      width: 1280,
      height: 800
    }
  },
  testTimeout: 30000,
  baseUrl: process.env.TEST_URL || 'http://localhost:5173',
  waitOptions: {
    timeout: 10000,
    waitUntil: 'networkidle2'
  }
};

// Test environment configuration
export const testEnv = {
  isCI: process.env.CI === 'true',
  debug: process.env.DEBUG === 'true',
  slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
  screenshotOnFailure: process.env.SCREENSHOT_ON_FAILURE !== 'false'
};

// API endpoints
export const apiEndpoints = {
  submitForm: '/api/submit-form',
  trackShare: '/api/track-share',
  getUserStats: '/api/get-user-stats',
  getLeaderboard: '/api/get-leaderboard',
  activateUser: '/api/activate-user',
  getCount: '/api/get-count'
};

// Selectors used across tests
export const selectors = {
  // Registration form
  firstName: '#first-name',
  lastName: '#last-name',
  email: '#email',
  visitorTypeLocal: '#visitor-type-local',
  visitorTypeTourist: '#visitor-type-tourist',
  submitBtn: '#submit-btn',
  
  // Share page
  referralLink: '#referral-link',
  copyLinkBtn: '#copy-link-btn',
  copiedText: '.copied-text',
  userPoints: '#user-points',
  userReferrals: '#user-referrals',
  userRank: '#user-rank',
  
  // Social buttons
  twitterShare: '[data-platform="twitter"]',
  facebookShare: '[data-platform="facebook"]',
  whatsappShare: '[data-platform="whatsapp"]',
  emailShare: '[data-platform="email"]',
  
  // Leaderboard
  leaderboardTable: '.leaderboard-table',
  podium1: '.podium-1',
  podium2: '.podium-2',
  podium3: '.podium-3',
  filterBtns: '.filter-btn',
  
  // Notifications
  successNotification: '.notification.success',
  errorNotification: '.notification.error',
  
  // Modals
  activationModal: '#modal-activation',
  surveyModal: '#modal-1'
};

// Test data patterns
export const patterns = {
  referralCode: /^[A-Z]{3}[A-Z0-9]{8}$/,
  email: /^test-[a-z0-9]{8}@example\.com$/,
  shareUrl: /^https?:\/\/[^\/]+\?ref=[A-Z]{3}[A-Z0-9]{8}$/
};
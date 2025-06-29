/**
 * Enhanced Playwright Configuration
 * 
 * Optimized configuration with performance improvements
 */

import { defineConfig, devices } from '@playwright/test';
import { puppeteerConfig } from './config/puppeteer-config.js';

export default defineConfig({
  testDir: './e2e',
  
  // Test timeout configuration
  timeout: 30 * 1000,
  expect: {
    timeout: 10 * 1000
  },
  
  // Parallel execution configuration
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  
  // Fail fast in CI
  forbidOnly: !!process.env.CI,
  maxFailures: process.env.CI ? 5 : undefined,
  
  // Retry configuration
  retries: process.env.CI ? 2 : 1,
  
  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { 
      outputFolder: 'test-results/html',
      open: 'never'
    }],
    ['json', { 
      outputFile: 'test-results/results.json'
    }],
    ['junit', { 
      outputFile: 'test-results/junit.xml',
      stripANSIControlSequences: true
    }],
    ['./reporters/performance-reporter.js'],
    process.env.CI ? ['github'] : null
  ].filter(Boolean),
  
  // Global setup/teardown
  globalSetup: './setup/global-setup.js',
  globalTeardown: './setup/global-teardown.js',
  
  // Shared settings
  use: {
    // Base URL
    baseURL: puppeteerConfig.baseUrl,
    
    // Artifacts
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },
    video: process.env.CI ? 'retain-on-failure' : 'off',
    
    // Browser options
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
    
    // Timeouts
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
    
    // Custom test attributes
    testIdAttribute: 'data-testid',
    
    // Locale and timezone
    locale: 'en-GB',
    timezoneId: 'Europe/London',
    
    // Permissions
    permissions: ['clipboard-read', 'clipboard-write'],
    
    // Storage state
    storageState: process.env.STORAGE ? 'tests/auth/storage-state.json' : undefined
  },
  
  // Projects configuration
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-blink-features=AutomationControlled']
        }
      },
      grep: /@(smoke|critical|desktop)/,
      dependencies: process.env.SETUP ? ['setup'] : []
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      grep: /@(critical|desktop)/,
      dependencies: process.env.SETUP ? ['setup'] : []
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      grep: /@(critical|desktop)/,
      dependencies: process.env.SETUP ? ['setup'] : []
    },
    
    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        hasTouch: true
      },
      grep: /@(smoke|mobile)/
    },
    
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 13'],
        hasTouch: true
      },
      grep: /@(critical|mobile)/
    },
    
    // Special configurations
    {
      name: 'slow-network',
      use: {
        ...devices['Desktop Chrome'],
        // Simulate slow 3G
        offline: false,
        // Use Chrome DevTools Protocol
        launchOptions: {
          args: ['--throttle-cpu=4']
        }
      },
      grep: /@network/
    },
    
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
      teardown: 'cleanup'
    },
    
    // Cleanup project
    {
      name: 'cleanup',
      testMatch: /.*\.teardown\.js/
    }
  ],
  
  // Test filtering and organization
  grep: process.env.GREP ? new RegExp(process.env.GREP) : undefined,
  grepInvert: process.env.GREP_INVERT ? new RegExp(process.env.GREP_INVERT) : undefined,
  
  // Output configuration
  outputDir: 'test-results/artifacts',
  preserveOutput: 'failures-only',
  
  // Web server configuration
  webServer: process.env.CI || process.env.USE_DEPLOYED ? undefined : [
    {
      command: 'npm run dev:vite',
      port: 5173,
      timeout: 120 * 1000,
      reuseExistingServer: true,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        NODE_ENV: 'test'
      }
    },
    {
      command: 'npm run dev:vercel',
      port: 3000,
      timeout: 120 * 1000,
      reuseExistingServer: true,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        NODE_ENV: 'test'
      }
    }
  ],
  
  // Metadata for reporting
  metadata: {
    environment: process.env.CI ? 'ci' : 'local',
    branch: process.env.GITHUB_REF_NAME || 'local',
    commit: process.env.GITHUB_SHA || 'local',
    testRun: new Date().toISOString()
  }
});

// Export test tags for use in tests
export const tags = {
  smoke: '@smoke',
  critical: '@critical',
  regression: '@regression',
  slow: '@slow',
  flaky: '@flaky',
  desktop: '@desktop',
  mobile: '@mobile',
  network: '@network',
  parallel: '@parallel',
  serial: '@serial'
};
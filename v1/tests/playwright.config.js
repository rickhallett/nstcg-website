/**
 * Playwright Configuration
 * 
 * Configuration for E2E tests using Playwright
 */

import { defineConfig, devices } from '@playwright/test';
import { puppeteerConfig } from './config/puppeteer-config.js';

export default defineConfig({
  testDir: './e2e',
  
  // Maximum time one test can run
  timeout: 30 * 1000,
  
  // Maximum time to wait for page to load
  expect: {
    timeout: 10 * 1000
  },
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'test-results/html' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list']
  ],
  
  // Global setup/teardown
  globalSetup: './setup/global-setup.js',
  globalTeardown: './setup/global-teardown.js',
  
  // Shared settings for all projects
  use: {
    // Base URL
    baseURL: puppeteerConfig.baseUrl,
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Viewport size
    viewport: { width: 1280, height: 800 },
    
    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
    
    // Artifacts folder
    outputDir: 'test-results/artifacts',
  },
  
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
  
  // Run local dev server before starting tests
  webServer: process.env.CI ? undefined : {
    command: 'npm run both',
    port: 5173,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
});
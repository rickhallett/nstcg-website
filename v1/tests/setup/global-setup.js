/**
 * Global Setup
 * 
 * Runs once before all tests
 */

import { chromium } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

async function globalSetup() {
  console.log('🚀 Starting E2E test setup...');
  
  // Create directories for test artifacts
  const dirs = [
    'test-results',
    'test-results/html',
    'test-results/artifacts',
    'screenshots'
  ];
  
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
  
  // Verify environment variables
  const requiredEnvVars = [
    'NOTION_TOKEN',
    'NOTION_DATABASE_ID',
    'NOTION_GAMIFICATION_DB_ID'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('⚠️  Missing environment variables:', missingVars.join(', '));
    console.warn('   Some tests may fail without proper API credentials');
  }
  
  // Set test environment variables
  process.env.TEST_ENV = 'true';
  process.env.NODE_ENV = 'test';
  
  // If using test databases, set them
  if (process.env.NOTION_TEST_DATABASE_ID) {
    process.env.NOTION_DATABASE_ID = process.env.NOTION_TEST_DATABASE_ID;
  }
  if (process.env.NOTION_TEST_GAMIFICATION_DB_ID) {
    process.env.NOTION_GAMIFICATION_DB_ID = process.env.NOTION_TEST_GAMIFICATION_DB_ID;
  }
  
  // Warm up browser context
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Pre-load the site to warm up caches
  try {
    await page.goto(process.env.TEST_URL || 'http://localhost:5173', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
  } catch (error) {
    console.warn('⚠️  Could not pre-load site:', error.message);
  }
  
  await browser.close();
  
  console.log('✅ E2E test setup complete');
  
  // Return config for use in tests
  return {
    baseURL: process.env.TEST_URL || 'http://localhost:5173',
    testStartTime: new Date().toISOString()
  };
}

export default globalSetup;
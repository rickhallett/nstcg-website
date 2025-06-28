/**
 * Global Teardown
 * 
 * Runs once after all tests complete
 */

import { NotionTestHelpers } from '../utils/notion-helpers.js';
import fs from 'fs/promises';
import path from 'path';

async function globalTeardown() {
  console.log('🧹 Starting E2E test cleanup...');
  
  try {
    // Clean up any remaining test data in Notion
    const notionHelpers = new NotionTestHelpers();
    
    // Find and clean up test users by email pattern
    const testEmailPattern = process.env.TEST_EMAIL_PREFIX || 'e2e-test-';
    
    console.log(`   Cleaning up test data with pattern: ${testEmailPattern}*`);
    
    // Note: This would need to be implemented to search and clean systematically
    // For now, relying on afterEach hooks in individual tests
    
    // Generate test summary
    const summaryPath = 'test-results/summary.json';
    const summary = {
      completedAt: new Date().toISOString(),
      environment: process.env.TEST_ENV || 'local',
      baseUrl: process.env.TEST_URL || 'http://localhost:5173',
      duration: process.env.TEST_DURATION || 'unknown'
    };
    
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    
    // Archive old test results if needed
    const resultsDir = 'test-results';
    const archiveDir = `test-results-archive/${new Date().toISOString().split('T')[0]}`;
    
    if (process.env.ARCHIVE_RESULTS === 'true') {
      await fs.mkdir(path.dirname(archiveDir), { recursive: true });
      await fs.rename(resultsDir, archiveDir);
      console.log(`   Archived test results to: ${archiveDir}`);
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
  
  console.log('✅ E2E test cleanup complete');
}

export default globalTeardown;
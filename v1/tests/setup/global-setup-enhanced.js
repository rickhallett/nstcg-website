/**
 * Enhanced Global Setup for E2E Tests
 * 
 * Prepares test environment with validation and optimization
 */

import { chromium } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function globalSetup(config) {
  console.log('🔧 Setting up test environment...');
  
  const startTime = Date.now();
  
  try {
    // 1. Validate environment variables
    await validateEnvironment();
    
    // 2. Create necessary directories
    await createTestDirectories();
    
    // 3. Clear old test artifacts
    await clearOldArtifacts();
    
    // 4. Warm up servers
    if (!process.env.CI && !process.env.USE_DEPLOYED) {
      await warmUpServers(config);
    }
    
    // 5. Setup test databases
    if (process.env.SETUP_TEST_DB) {
      await setupTestDatabases();
    }
    
    // 6. Create baseline data if needed
    if (process.env.CREATE_BASELINE) {
      await createBaselineData();
    }
    
    // 7. Generate auth state if needed
    if (process.env.GENERATE_AUTH) {
      await generateAuthState();
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ Setup completed in ${(duration / 1000).toFixed(1)}s`);
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  }
}

async function validateEnvironment() {
  console.log('  Validating environment...');
  
  const requiredVars = [
    'NOTION_TOKEN',
    'NOTION_DATABASE_ID',
    'NOTION_GAMIFICATION_DB_ID'
  ];
  
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate API access
  if (!process.env.SKIP_API_CHECK) {
    try {
      const response = await fetch('https://api.notion.com/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Notion API validation failed: ${response.status}`);
      }
    } catch (error) {
      console.warn('  ⚠️  Could not validate Notion API access:', error.message);
    }
  }
}

async function createTestDirectories() {
  console.log('  Creating test directories...');
  
  const dirs = [
    'test-results',
    'test-results/artifacts',
    'test-results/performance',
    'test-results/html',
    'screenshots',
    'videos'
  ];
  
  for (const dir of dirs) {
    await fs.mkdir(path.join(__dirname, '..', dir), { recursive: true });
  }
}

async function clearOldArtifacts() {
  console.log('  Clearing old artifacts...');
  
  const artifactDirs = ['screenshots', 'videos', 'test-results/artifacts'];
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  for (const dir of artifactDirs) {
    const dirPath = path.join(__dirname, '..', dir);
    
    try {
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        
        if (Date.now() - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      // Directory might not exist yet
    }
  }
}

async function warmUpServers(config) {
  console.log('  Warming up servers...');
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Wait for frontend
    await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for API
    const response = await page.request.get('http://localhost:3000/api/get-count');
    if (!response.ok()) {
      console.warn('  ⚠️  API might not be ready:', response.status());
    }
    
  } catch (error) {
    console.warn('  ⚠️  Server warm-up failed:', error.message);
  } finally {
    await browser.close();
  }
}

async function setupTestDatabases() {
  console.log('  Setting up test databases...');
  
  // This would create separate test databases in Notion
  // For now, we'll just validate they exist
  
  const testDbs = [
    process.env.NOTION_TEST_DATABASE_ID,
    process.env.NOTION_TEST_GAMIFICATION_DB_ID
  ];
  
  for (const dbId of testDbs) {
    if (!dbId) continue;
    
    try {
      const response = await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28'
        }
      });
      
      if (!response.ok) {
        console.warn(`  ⚠️  Test database ${dbId} not accessible`);
      }
    } catch (error) {
      console.warn(`  ⚠️  Could not validate test database:`, error.message);
    }
  }
}

async function createBaselineData() {
  console.log('  Creating baseline data...');
  
  const baselineDir = path.join(__dirname, '..', 'baselines');
  await fs.mkdir(baselineDir, { recursive: true });
  
  // Create baseline performance metrics
  const performanceBaseline = {
    timestamp: new Date().toISOString(),
    summary: {
      averages: {
        pageLoad: 2000,
        apiCall: 500,
        formSubmission: 3000,
        test: 5000
      }
    }
  };
  
  await fs.writeFile(
    path.join(baselineDir, 'performance.json'),
    JSON.stringify(performanceBaseline, null, 2)
  );
}

async function generateAuthState() {
  console.log('  Generating auth state...');
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to site
    await page.goto('http://localhost:5173');
    
    // Create test user and save state
    await page.evaluate(() => {
      localStorage.setItem('nstcg_email', 'test@e2e.example.com');
      localStorage.setItem('nstcg_user_registered', 'true');
      localStorage.setItem('nstcg_referral_code', 'TESTE2E123');
    });
    
    // Save storage state
    await context.storageState({ 
      path: path.join(__dirname, '..', 'auth', 'storage-state.json') 
    });
    
  } finally {
    await browser.close();
  }
}

export default globalSetup;
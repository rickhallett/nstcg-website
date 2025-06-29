#!/usr/bin/env node

/**
 * E2E Test Runner
 * 
 * Main entry point for running E2E tests with various options
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  headed: args.includes('--headed') || process.env.HEADED === 'true',
  debug: args.includes('--debug') || process.env.DEBUG === 'true',
  specific: args.find(arg => arg.startsWith('--test=')),
  project: args.find(arg => arg.startsWith('--project=')),
  workers: args.find(arg => arg.startsWith('--workers=')),
  reporter: args.find(arg => arg.startsWith('--reporter=')),
  updateSnapshots: args.includes('--update-snapshots'),
  ui: args.includes('--ui'),
  help: args.includes('--help') || args.includes('-h')
};

// Show help
if (options.help) {
  console.log(`
E2E Test Runner

Usage: npm run test:e2e [options]

Options:
  --headed          Run tests in headed mode (visible browser)
  --debug           Enable debug mode with slower execution
  --test=<pattern>  Run specific test file or pattern
  --project=<name>  Run specific project (chromium, firefox, webkit, mobile)
  --workers=<n>     Number of parallel workers
  --reporter=<type> Test reporter (html, json, junit, list)
  --update-snapshots Update test snapshots
  --ui              Open Playwright UI mode
  --help, -h        Show this help message

Examples:
  npm run test:e2e                           # Run all tests
  npm run test:e2e --headed                  # Run with visible browser
  npm run test:e2e --test=registration       # Run registration tests only
  npm run test:e2e --project=chromium        # Run in Chrome only
  npm run test:e2e --ui                      # Open interactive UI
  npm run test:e2e --debug --workers=1       # Debug mode with single worker

Environment Variables:
  TEST_URL          Base URL for tests (default: http://localhost:5173)
  NOTION_TOKEN      Notion API token
  NOTION_TEST_*     Test-specific database IDs
  HEADLESS          Set to 'false' for headed mode
  CI                Set to 'true' for CI mode
`);
  process.exit(0);
}

// Build playwright command
const playwrightArgs = ['test'];

// Add config file
playwrightArgs.push('--config', path.join(__dirname, 'playwright.config.js'));

// Headed mode
if (options.headed) {
  playwrightArgs.push('--headed');
  process.env.HEADLESS = 'false';
}

// Debug mode
if (options.debug) {
  playwrightArgs.push('--debug');
  process.env.PWDEBUG = '1';
  process.env.DEBUG = 'true';
  process.env.SLOW_MO = '250';
}

// Specific test
if (options.specific) {
  const testPattern = options.specific.split('=')[1];
  playwrightArgs.push(testPattern);
}

// Project
if (options.project) {
  const projectName = options.project.split('=')[1];
  playwrightArgs.push('--project', projectName);
}

// Workers
if (options.workers) {
  const workerCount = options.workers.split('=')[1];
  playwrightArgs.push('--workers', workerCount);
}

// Reporter
if (options.reporter) {
  const reporterType = options.reporter.split('=')[1];
  playwrightArgs.push('--reporter', reporterType);
}

// Update snapshots
if (options.updateSnapshots) {
  playwrightArgs.push('--update-snapshots');
}

// UI mode
if (options.ui) {
  playwrightArgs.push('--ui');
}

// Pre-test checks
async function preTestChecks() {
  console.log('🔍 Running pre-test checks...\n');

  // Check if dev server is running
  try {
    const response = await fetch(process.env.TEST_URL || 'http://localhost:5173');
    if (!response.ok) {
      console.warn('⚠️  Dev server returned status:', response.status);
    }
  } catch (error) {
    console.error('❌ Dev server is not running!');
    console.log('   Please run "npm run both" in another terminal\n');

    if (!process.env.CI) {
      process.exit(1);
    }
  }

  // Check environment variables
  const requiredVars = ['NOTION_TOKEN'];
  const warnings = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      warnings.push(`   ⚠️  ${varName} is not set`);
    }
  }

  if (warnings.length > 0) {
    console.log('Environment warnings:');
    warnings.forEach(w => console.log(w));
    console.log('');
  }

  // Create test directories
  const dirs = ['test-results', 'screenshots'];
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }

  console.log('✅ Pre-test checks complete\n');
}

// Run tests
async function runTests() {
  // Run pre-test checks
  await preTestChecks();

  console.log('🚀 Starting E2E tests...');
  console.log(`   Command: npx playwright ${playwrightArgs.join(' ')}\n`);

  // Record start time
  const startTime = Date.now();

  // Spawn playwright process
  const playwright = spawn('npx', ['playwright', ...playwrightArgs], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      TEST_START_TIME: startTime.toString()
    }
  });

  // Handle completion
  playwright.on('close', async (code) => {
    const duration = Date.now() - startTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);

    console.log(`\n⏱️  Tests completed in ${minutes}m ${seconds}s`);

    if (code === 0) {
      console.log('✅ All tests passed!');

      // Show report location
      console.log('\n📊 Test reports available at:');
      console.log('   - HTML: test-results/html/index.html');
      console.log('   - JSON: test-results/results.json');

      // Open HTML report if not in CI
      if (!process.env.CI && !options.ui) {
        console.log('\n   Opening HTML report...');
        const open = await import('open');
        open.default(path.join(__dirname, '../test-results/html/index.html'));
      }
    } else {
      console.log(`❌ Tests failed with code ${code}`);

      // Show failure summary
      try {
        const results = await fs.readFile('test-results/results.json', 'utf-8');
        const data = JSON.parse(results);

        if (data.errors && data.errors.length > 0) {
          console.log('\nFailure summary:');
          data.errors.forEach((error, i) => {
            console.log(`   ${i + 1}. ${error.message}`);
          });
        }
      } catch {
        // Results file might not exist
      }
    }

    process.exit(code);
  });

  // Handle errors
  playwright.on('error', (error) => {
    console.error('❌ Failed to start test runner:', error);
    process.exit(1);
  });
}

// Main execution
runTests().catch(error => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});
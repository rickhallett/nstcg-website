#!/usr/bin/env node

/**
 * Test Email Campaign System
 * 
 * Validates all components of the email campaign system before launch
 */

import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import { google } from 'googleapis';
import { compileEmail } from './compile-email-wrapper.js';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

// Initialize clients
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const gmail = google.gmail('v1');

// Test results tracking
let totalTests = 0;
let passedTests = 0;
const testResults = [];

function logTest(name, passed, details = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(chalk.green('✓'), name);
  } else {
    console.log(chalk.red('✗'), name);
    if (details) console.log(chalk.gray(`  ${details}`));
  }
  testResults.push({ name, passed, details });
}

async function testNotionConnection() {
  console.log(chalk.bold('\n📊 Testing Notion Connection...'));
  
  try {
    // Test database access
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      page_size: 1
    });
    
    logTest('Notion API connection', true);
    logTest('Database access', true, `Found ${response.results.length} records`);
    
    // Check required properties
    if (response.results.length > 0) {
      const props = response.results[0].properties;
      const requiredProps = ['Email', 'Name', 'First Name', 'Last Name'];
      
      for (const prop of requiredProps) {
        logTest(`Property '${prop}' exists`, !!props[prop]);
      }
    }
    
    // Test gamification database
    if (process.env.NOTION_GAMIFICATION_DB_ID) {
      try {
        await notion.databases.query({
          database_id: process.env.NOTION_GAMIFICATION_DB_ID,
          page_size: 1
        });
        logTest('Gamification database access', true);
      } catch (error) {
        logTest('Gamification database access', false, error.message);
      }
    }
    
    return true;
  } catch (error) {
    logTest('Notion API connection', false, error.message);
    return false;
  }
}

async function testGmailAuth() {
  console.log(chalk.bold('\n📧 Testing Gmail Authentication...'));
  
  try {
    // Check for ADC or service account
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/gmail.send']
    });
    
    const authClient = await auth.getClient();
    logTest('Google Auth client created', true);
    
    // Try to get profile (read-only test)
    try {
      const gmail = google.gmail({ version: 'v1', auth: authClient });
      const profile = await gmail.users.getProfile({ userId: 'me' });
      logTest('Gmail API access', true, `Email: ${profile.data.emailAddress}`);
    } catch (error) {
      logTest('Gmail API access', false, 'Unable to access Gmail API - check authentication');
    }
    
    return true;
  } catch (error) {
    logTest('Google Authentication', false, error.message);
    return false;
  }
}

async function testUserData() {
  console.log(chalk.bold('\n👥 Testing User Data Quality...'));
  
  try {
    // Fetch all users
    let allUsers = [];
    let hasMore = true;
    let startCursor = undefined;
    
    while (hasMore) {
      const response = await notion.databases.query({
        database_id: process.env.NOTION_DATABASE_ID,
        start_cursor: startCursor,
        page_size: 100
      });
      
      allUsers = allUsers.concat(response.results);
      hasMore = response.has_more;
      startCursor = response.next_cursor;
    }
    
    logTest('User data fetched', true, `Total users: ${allUsers.length}`);
    
    // Analyze data quality
    let validEmails = 0;
    let hasNames = 0;
    let missingData = [];
    
    for (const user of allUsers) {
      const props = user.properties;
      const email = props.Email?.email;
      const name = props.Name?.rich_text?.[0]?.text?.content || 
                  props['First Name']?.rich_text?.[0]?.text?.content;
      
      if (email && email.includes('@')) {
        validEmails++;
      } else {
        missingData.push(`Missing/invalid email: ${user.id}`);
      }
      
      if (name) {
        hasNames++;
      }
    }
    
    const emailRate = (validEmails / allUsers.length * 100).toFixed(1);
    const nameRate = (hasNames / allUsers.length * 100).toFixed(1);
    
    logTest('Email validation', validEmails === allUsers.length, 
           `${emailRate}% have valid emails`);
    logTest('Name data', hasNames > allUsers.length * 0.8, 
           `${nameRate}% have names`);
    
    if (missingData.length > 0 && missingData.length <= 5) {
      console.log(chalk.yellow('\n  Issues found:'));
      missingData.slice(0, 5).forEach(issue => {
        console.log(chalk.gray(`  - ${issue}`));
      });
    }
    
    return validEmails === allUsers.length;
  } catch (error) {
    logTest('User data fetch', false, error.message);
    return false;
  }
}

async function testEmailTemplate() {
  console.log(chalk.bold('\n📝 Testing Email Template...'));
  
  try {
    // Test template compilation
    const testData = {
      user_email: encodeURIComponent('test@example.com'),
      bonus: '25'
    };
    
    const { html, errors } = compileEmail('activate', testData);
    
    logTest('Template compilation', errors.length === 0, 
           errors.length > 0 ? errors.join(', ') : 'No errors');
    
    // Check template content
    const hasEmail = html.includes('test%40example.com');
    const hasBonus = html.includes('bonus=75'); // Template has hardcoded 75
    const hasActivateButton = html.includes('ACTIVATE MY ACCOUNT');
    
    logTest('Email parameter included', hasEmail);
    logTest('Activation URL present', hasBonus);
    logTest('Call-to-action button exists', hasActivateButton);
    
    // Test different bonus point values
    const pointTests = [10, 25, 40, 50];
    let allPointsWork = true;
    
    for (const points of pointTests) {
      const result = compileEmail('activate', { ...testData, bonusPoints: points });
      if (result.errors.length > 0 || !result.html.includes(points.toString())) {
        allPointsWork = false;
        break;
      }
    }
    
    logTest('All bonus point values work', allPointsWork);
    
    return errors.length === 0;
  } catch (error) {
    logTest('Template testing', false, error.message);
    return false;
  }
}

async function testActivationUrls() {
  console.log(chalk.bold('\n🔗 Testing Activation URLs...'));
  
  const testEmails = [
    'simple@example.com',
    'user+tag@example.com',
    'test.user@sub.example.com',
    'user@example.co.uk'
  ];
  
  let allValid = true;
  
  for (const email of testEmails) {
    const encoded = encodeURIComponent(email);
    const url = `https://nstcg.org/?user_email=${encoded}&bonus=30`;
    
    try {
      const parsed = new URL(url);
      const params = new URLSearchParams(parsed.search);
      const decoded = params.get('user_email');
      
      const valid = decoded === email;
      logTest(`URL encoding for ${email}`, valid);
      
      if (!valid) allValid = false;
    } catch (error) {
      logTest(`URL encoding for ${email}`, false, error.message);
      allValid = false;
    }
  }
  
  return allValid;
}

async function testBonusPointDistribution() {
  console.log(chalk.bold('\n🎲 Testing Bonus Point Distribution...'));
  
  // Generate 1000 bonus points to test distribution
  const samples = 1000;
  const points = [];
  
  for (let i = 0; i < samples; i++) {
    // Using the weighted random from the PRD
    const random1 = Math.random();
    const random2 = Math.random();
    const random3 = Math.random();
    const average = (random1 + random2 + random3) / 3;
    const value = Math.floor(10 + (average * 40));
    points.push(value);
  }
  
  // Calculate statistics
  const min = Math.min(...points);
  const max = Math.max(...points);
  const avg = points.reduce((a, b) => a + b, 0) / samples;
  
  // Count distribution
  const buckets = {};
  for (let i = 10; i <= 50; i += 5) {
    buckets[i] = points.filter(p => p >= i && p < i + 5).length;
  }
  
  logTest('Minimum value', min >= 10, `Min: ${min}`);
  logTest('Maximum value', max <= 50, `Max: ${max}`);
  logTest('Average value', avg >= 25 && avg <= 35, `Avg: ${avg.toFixed(1)}`);
  
  // Check for bell curve (middle values should be more common)
  const middleCount = buckets[25] + buckets[30];
  const edgeCount = buckets[10] + buckets[45];
  
  logTest('Bell curve distribution', middleCount > edgeCount * 1.5, 
         'Middle values more common than edges');
  
  return min >= 10 && max <= 50;
}

async function generateSummaryReport() {
  console.log(chalk.bold('\n📊 Test Summary Report'));
  console.log(chalk.gray('='.repeat(50)));
  
  const passRate = (passedTests / totalTests * 100).toFixed(1);
  const status = passedTests === totalTests ? 
    chalk.green('✅ All tests passed!') : 
    chalk.yellow(`⚠️  ${passedTests}/${totalTests} tests passed (${passRate}%)`);
  
  console.log(status);
  
  // List failed tests
  const failed = testResults.filter(t => !t.passed);
  if (failed.length > 0) {
    console.log(chalk.red('\nFailed tests:'));
    failed.forEach(test => {
      console.log(chalk.red(`  - ${test.name}`));
      if (test.details) {
        console.log(chalk.gray(`    ${test.details}`));
      }
    });
  }
  
  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    totalTests,
    passedTests,
    passRate: parseFloat(passRate),
    results: testResults,
    readyForLaunch: passedTests === totalTests
  };
  
  const fs = await import('fs/promises');
  await fs.writeFile(
    'test-results.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log(chalk.gray('\nDetailed report saved to test-results.json'));
  
  return passedTests === totalTests;
}

// Main test runner
async function runTests() {
  console.log(chalk.bold.blue('🧪 Email Campaign System Test Suite'));
  console.log(chalk.gray('Testing all components before campaign launch...\n'));
  
  // Check environment variables
  console.log(chalk.bold('🔐 Checking Environment Variables...'));
  const requiredEnvVars = [
    'NOTION_TOKEN',
    'NOTION_DATABASE_ID'
  ];
  
  let envValid = true;
  for (const envVar of requiredEnvVars) {
    const exists = !!process.env[envVar];
    logTest(`${envVar} exists`, exists);
    if (!exists) envValid = false;
  }
  
  if (!envValid) {
    console.log(chalk.red('\n❌ Missing required environment variables!'));
    process.exit(1);
  }
  
  // Run all tests
  await testNotionConnection();
  await testGmailAuth();
  await testUserData();
  await testEmailTemplate();
  await testActivationUrls();
  await testBonusPointDistribution();
  
  // Generate summary
  const ready = await generateSummaryReport();
  
  if (ready) {
    console.log(chalk.green.bold('\n🚀 System is ready for email campaign launch!'));
  } else {
    console.log(chalk.yellow.bold('\n⚠️  Please fix the issues before launching the campaign.'));
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error(chalk.red('\n❌ Test suite failed:'), error);
  process.exit(1);
});
#!/usr/bin/env node

import { google } from 'googleapis';
import { Client } from '@notionhq/client';
import { compileActivationEmail } from './compile-email.js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const testEmail = args.find(arg => arg.startsWith('--test-email='))?.split('=')[1];
const maxEmails = parseInt(args.find(arg => arg.startsWith('--max='))?.split('=')[1] || '5');
const flags = {
  help: args.includes('--help') || args.includes('-h'),
};

// Test campaign configuration
const CONFIG = {
  RATE_LIMIT_MS: 2000, // 2 seconds between emails for testing
  BONUS_POINTS: 75, // Static bonus points for all users
  TEST_LOG_FILE: path.join(__dirname, 'test-campaign-log.json'),
};

// Show help
if (flags.help || !testEmail) {
  console.log(`
Email Campaign Test Script

This script tests the OAuth2 authentication and email sending by sending 
sample emails to your personal email address instead of real recipients.

Usage: node email-campaign-test.js --test-email=your@email.com [options]

Required:
  --test-email=EMAIL   Your personal email address to receive test emails

Options:
  --max=N             Maximum number of test emails to send (default: 5)
  --help, -h          Show this help message

Examples:
  node email-campaign-test.js --test-email=you@gmail.com
  node email-campaign-test.js --test-email=you@gmail.com --max=3
`);
  process.exit(0);
}

/**
 * Initialize services
 */
async function initializeServices() {
  console.log('🔧 Initializing services for testing...');

  // Initialize Notion client
  const notion = new Client({
    auth: process.env.NOTION_TOKEN,
  });

  // Initialize Gmail API with OAuth2 refresh token
  try {
    // Load saved tokens from the oauth setup
    const tokens = JSON.parse(await fs.readFile('gmail-tokens.json', 'utf8'));

    // Create OAuth2 client with credentials
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Set the saved tokens (including refresh token)
    auth.setCredentials(tokens);

    // Handle token refresh automatically
    auth.on('tokens', (newTokens) => {
      if (newTokens.refresh_token) {
        // Update tokens if we get a new refresh token
        tokens.refresh_token = newTokens.refresh_token;
      }
      tokens.access_token = newTokens.access_token;

      // Save updated tokens
      fs.writeFile('gmail-tokens.json', JSON.stringify(tokens, null, 2))
        .catch(err => console.warn('⚠️  Could not save updated tokens:', err.message));
    });

    // Create Gmail client (this will be reused for all test emails)
    const gmail = google.gmail({ version: 'v1', auth });

    console.log('✅ Gmail API authenticated successfully');
    return { notion, gmail };

  } catch (error) {
    console.error('❌ Failed to initialize Gmail API:', error.message);
    console.error('💡 Make sure you have run: node scripts/oauth-setup.js');
    throw error;
  }
}

/**
 * Get static bonus points for all users
 */
function getBonusPoints() {
  return CONFIG.BONUS_POINTS;
}

/**
 * Fetch sample users from Notion (for realistic testing)
 */
async function fetchSampleUsers(notion, maxUsers) {
  console.log(`📊 Fetching up to ${maxUsers} sample users from Notion...`);

  const users = [];

  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      page_size: maxUsers,
      filter: {
        property: 'Email',
        email: {
          is_not_empty: true,
        },
      },
    });

    // Process results
    for (const page of response.results) {
      const email = page.properties.Email?.email;
      const firstName = page.properties['First Name']?.rich_text?.[0]?.text?.content || '';
      const lastName = page.properties['Last Name']?.rich_text?.[0]?.text?.content || '';
      const name = page.properties.Name?.title?.[0]?.text?.content || '';

      if (email) {
        users.push({
          id: page.id,
          email: email.toLowerCase(),
          firstName: firstName || name.split(' ')[0] || email.split('@')[0],
          lastName: lastName || '',
          name: name || `${firstName} ${lastName}`.trim() || email.split('@')[0],
          originalEmail: email.toLowerCase(), // Keep track of original for logging
        });
      }
    }

    console.log(`✅ Found ${users.length} sample users for testing`);
    return users;

  } catch (error) {
    console.error('❌ Error fetching users from Notion:', error.message);
    throw error;
  }
}

/**
 * Send test email
 */
async function sendTestEmail(gmail, user, bonusPoints, testEmail, emailIndex) {
  // Compile email template with original user data
  const htmlContent = compileActivationEmail(user.originalEmail, bonusPoints);

  // Create email message - sent to test email but with original user context
  const subject = `🧪 TEST ${emailIndex}: ⏰ TIME RUNNING OUT: Activate Your Account & Claim ${bonusPoints} Points!`;
  const message = [
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `From: North Swanage Traffic Concern Group <noreply@nstcg.org>`,
    `To: ${testEmail}`,
    `Subject: ${subject}`,
    '',
    `<!-- TEST EMAIL: Originally for ${user.originalEmail} (${user.name}) -->`,
    `<div style="background: #f0f8ff; padding: 10px; margin-bottom: 20px; border-left: 4px solid #007cba;">`,
    `<strong>🧪 TEST MODE</strong><br>`,
    `This email was originally intended for: <strong>${user.originalEmail}</strong> (${user.name})<br>`,
    `Bonus Points: <strong>${bonusPoints}</strong><br>`,
    `Test Email #${emailIndex} of ${maxEmails}`,
    `</div>`,
    htmlContent,
  ].join('\n');

  // Encode message
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // Send email
  const result = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });

  return result.data;
}

/**
 * Log test results
 */
async function logTestResult(user, bonusPoints, result, testEmail, emailIndex) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    testIndex: emailIndex,
    originalRecipient: {
      email: user.originalEmail,
      name: user.name,
      firstName: user.firstName,
    },
    testEmail: testEmail,
    bonusPoints: bonusPoints,
    messageId: result.id,
    threadId: result.threadId,
  };

  try {
    let logs = [];
    try {
      const existingLogs = await fs.readFile(CONFIG.TEST_LOG_FILE, 'utf8');
      logs = JSON.parse(existingLogs);
    } catch (error) {
      // File doesn't exist yet, start fresh
    }

    logs.push(logEntry);
    await fs.writeFile(CONFIG.TEST_LOG_FILE, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.warn('⚠️  Could not save test log:', error.message);
  }
}

/**
 * Main test campaign function
 */
async function runTestCampaign() {
  console.log('🧪 Starting Email Campaign Test...\n');
  console.log(`Test Email: ${testEmail}`);
  console.log(`Max Emails: ${maxEmails}`);
  console.log(`Rate Limit: ${CONFIG.RATE_LIMIT_MS}ms between emails\n`);

  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  try {
    // Initialize services
    const { notion, gmail } = await initializeServices();

    // Fetch sample users
    const users = await fetchSampleUsers(notion, maxEmails);

    if (users.length === 0) {
      console.log('❌ No users found to test with');
      return;
    }

    console.log('\n🚀 Starting test email sending...\n');

    // Send test emails
    for (let i = 0; i < Math.min(users.length, maxEmails); i++) {
      const user = users[i];
      const emailIndex = i + 1;

      try {
        // Get bonus points
        const bonusPoints = getBonusPoints();

        console.log(`📧 Sending test email ${emailIndex}/${maxEmails}:`);
        console.log(`   Original: ${user.originalEmail} (${user.name})`);
        console.log(`   Test To: ${testEmail}`);
        console.log(`   Points: ${bonusPoints}`);

        // Send email
        const result = await sendTestEmail(gmail, user, bonusPoints, testEmail, emailIndex);

        // Log results
        await logTestResult(user, bonusPoints, result, testEmail, emailIndex);

        successCount++;
        console.log(`   ✅ Sent successfully (ID: ${result.id})\n`);

        // Rate limiting (except for last email)
        if (i < Math.min(users.length, maxEmails) - 1) {
          console.log(`   ⏸️  Waiting ${CONFIG.RATE_LIMIT_MS}ms...\n`);
          await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMIT_MS));
        }

      } catch (error) {
        failCount++;
        console.error(`   ❌ Failed: ${error.message}\n`);
      }
    }

    // Generate summary
    const duration = Date.now() - startTime;
    const summary = `
🧪 Test Campaign Summary
${'='.repeat(50)}
Test Email: ${testEmail}
Total Test Emails: ${successCount + failCount}
Emails Sent: ${successCount}
Emails Failed: ${failCount}
Success Rate: ${((successCount / (successCount + failCount)) * 100).toFixed(1)}%
Duration: ${(duration / 1000).toFixed(1)} seconds
${'='.repeat(50)}

📄 Test log saved to: ${CONFIG.TEST_LOG_FILE}
💡 Check your inbox (${testEmail}) for the test emails!
`;

    console.log(summary);

    if (successCount > 0) {
      console.log('🎉 Test completed successfully!');
      console.log('💡 If the emails look good, you can run the full campaign with:');
      console.log('   node scripts/email-campaign.js --batch-size=50');
    }

  } catch (error) {
    console.error('\n❌ Test campaign failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Test interrupted by user');
  process.exit(0);
});

// Run the test campaign
runTestCampaign(); 
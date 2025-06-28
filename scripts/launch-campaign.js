#!/usr/bin/env node

/**
 * Email Campaign Launch Script
 * 
 * Production-ready script to execute the email campaign
 */

import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import { google } from 'googleapis';
import { compileActivationEmail } from './compile-email.js';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Campaign configuration
const CONFIG = {
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE) || 50,
  DELAY_BETWEEN_EMAILS: 1000, // 1 second between emails
  DELAY_BETWEEN_BATCHES: 30000, // 30 seconds between batches
  BONUS_POINTS: 75, // Static bonus points for all users
  SITE_URL: process.env.SITE_URL || 'https://nstcg.org',
  FROM_EMAIL: process.env.GMAIL_SENDER_EMAIL || 'noreply@nstcg.org',
  CAMPAIGN_SUBJECT: '🎯 Your NSTCG Account is Ready - Claim Your Bonus Points!'
};

// Parse command line arguments
const args = {
  dryRun: process.argv.includes('--dry-run'),
  batchSize: parseInt(process.argv.find(arg => arg.startsWith('--batch-size='))?.split('=')[1]) || CONFIG.BATCH_SIZE,
  resume: process.argv.includes('--resume'),
  testBatch: process.argv.includes('--test-batch'),
  specificEmails: process.argv.find(arg => arg.startsWith('--emails='))?.split('=')[1]?.split(',')
};

// Initialize clients
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

let gmail;
let campaignLog = {
  startTime: new Date().toISOString(),
  totalUsers: 0,
  sent: [],
  failed: [],
  skipped: [],
  config: CONFIG,
  args
};

// Initialize Gmail client
async function initializeGmail() {
  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/gmail.send']
    });

    const authClient = await auth.getClient();
    gmail = google.gmail({ version: 'v1', auth: authClient });

    // Verify access
    const profile = await gmail.users.getProfile({ userId: 'me' });
    console.log(chalk.green('✓'), 'Gmail authenticated as:', profile.data.emailAddress);

    return true;
  } catch (error) {
    console.error(chalk.red('✗'), 'Gmail authentication failed:', error.message);
    return false;
  }
}

// Load previous campaign state if resuming
async function loadCampaignState() {
  if (!args.resume) return null;

  try {
    const logPath = path.join(__dirname, 'campaign-log.json');
    const data = await fs.readFile(logPath, 'utf-8');
    const previousLog = JSON.parse(data);

    console.log(chalk.yellow('📂 Resuming previous campaign'));
    console.log(chalk.gray(`  Previously sent: ${previousLog.sent.length}`));
    console.log(chalk.gray(`  Previously failed: ${previousLog.failed.length}`));

    return previousLog;
  } catch (error) {
    console.log(chalk.yellow('⚠'), 'No previous campaign state found');
    return null;
  }
}

// Save campaign state
async function saveCampaignState() {
  const logPath = path.join(__dirname, 'campaign-log.json');
  await fs.writeFile(logPath, JSON.stringify(campaignLog, null, 2));
}

// Fetch users from Notion
async function fetchUsers() {
  console.log(chalk.bold('\n📊 Fetching users from Notion...'));

  const users = [];
  let hasMore = true;
  let startCursor = undefined;

  while (hasMore) {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      start_cursor: startCursor,
      page_size: 100,
      filter: args.testBatch ? {
        property: 'Email',
        email: { is_not_empty: true }
      } : undefined
    });

    for (const page of response.results) {
      const props = page.properties;
      const email = props.Email?.email;

      if (email) {
        users.push({
          id: page.id,
          email: email.toLowerCase(),
          firstName: props['First Name']?.rich_text?.[0]?.text?.content || '',
          lastName: props['Last Name']?.rich_text?.[0]?.text?.content || '',
          name: props.Name?.rich_text?.[0]?.text?.content || ''
        });
      }
    }

    hasMore = response.has_more;
    startCursor = response.next_cursor;

    // Limit for test batch
    if (args.testBatch && users.length >= 5) break;
  }

  // Filter specific emails if provided
  if (args.specificEmails) {
    const emailSet = new Set(args.specificEmails.map(e => e.toLowerCase()));
    return users.filter(u => emailSet.has(u.email));
  }

  console.log(chalk.green('✓'), `Found ${users.length} users with valid emails`);
  return users;
}

// Generate weighted random bonus points (bell curve)
function getBonusPoints() {
  return CONFIG.BONUS_POINTS;
}

// Send email via Gmail API
async function sendEmail(user, bonusPoints) {
  const activationUrl = `${CONFIG.SITE_URL}/?user_email=${encodeURIComponent(user.email)}&bonus=${bonusPoints}`;

  // Compile email HTML
  const emailHtml = compileActivationEmail(user.email, bonusPoints);

  // Create email message
  const message = [
    `To: ${user.email}`,
    `From: NSTCG <${CONFIG.FROM_EMAIL}>`,
    `Subject: ${CONFIG.CAMPAIGN_SUBJECT}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    emailHtml
  ].join('\n');

  // Encode for Gmail API
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  if (args.dryRun) {
    console.log(chalk.blue('[DRY RUN]'), `Would send to ${user.email} with ${bonusPoints} points`);
    return { success: true, dryRun: true };
  }

  try {
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    return { success: true, messageId: result.data.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Process a batch of users
async function processBatch(users, batchNumber) {
  console.log(chalk.bold(`\n📦 Processing batch ${batchNumber} (${users.length} users)`));

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const bonusPoints = getBonusPoints();

    try {
      const result = await sendEmail(user, bonusPoints);

      if (result.success) {
        campaignLog.sent.push({
          email: user.email,
          timestamp: new Date().toISOString(),
          bonusPoints,
          messageId: result.messageId
        });

        console.log(chalk.green('✓'),
          `[${i + 1}/${users.length}] Sent to ${user.email} (${bonusPoints} points)`);
      } else {
        throw new Error(result.error);
      }

      // Save state after each email
      if (i % 10 === 0) {
        await saveCampaignState();
      }

      // Delay between emails
      if (i < users.length - 1) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_EMAILS));
      }

    } catch (error) {
      campaignLog.failed.push({
        email: user.email,
        timestamp: new Date().toISOString(),
        error: error.message
      });

      console.log(chalk.red('✗'),
        `[${i + 1}/${users.length}] Failed: ${user.email} - ${error.message}`);
    }
  }

  // Save state after batch
  await saveCampaignState();
}

// Main campaign execution
async function runCampaign() {
  console.log(chalk.bold.blue('🚀 NSTCG Email Campaign Launcher'));
  console.log(chalk.gray('='.repeat(50)));

  // Display configuration
  console.log(chalk.bold('\n⚙️  Configuration:'));
  console.log(chalk.gray(`  Batch size: ${args.batchSize}`));
  console.log(chalk.gray(`  Delay between emails: ${CONFIG.DELAY_BETWEEN_EMAILS}ms`));
  console.log(chalk.gray(`  Delay between batches: ${CONFIG.DELAY_BETWEEN_BATCHES}ms`));
  console.log(chalk.gray(`  Bonus points: ${CONFIG.BONUS_POINTS} (static)`));
  console.log(chalk.gray(`  Mode: ${args.dryRun ? 'DRY RUN' : 'PRODUCTION'}`));

  // Initialize Gmail
  if (!args.dryRun) {
    const gmailReady = await initializeGmail();
    if (!gmailReady) {
      console.error(chalk.red('\n❌ Cannot proceed without Gmail authentication'));
      process.exit(1);
    }
  }

  // Load previous state if resuming
  const previousState = await loadCampaignState();
  if (previousState) {
    campaignLog = previousState;
  }

  // Fetch users
  const allUsers = await fetchUsers();
  campaignLog.totalUsers = allUsers.length;

  // Filter out already sent emails if resuming
  let usersToProcess = allUsers;
  if (previousState) {
    const sentEmails = new Set(previousState.sent.map(s => s.email));
    const failedEmails = new Set(previousState.failed.map(f => f.email));

    usersToProcess = allUsers.filter(u =>
      !sentEmails.has(u.email) && !failedEmails.has(u.email)
    );

    console.log(chalk.yellow(`\n📊 Resuming with ${usersToProcess.length} remaining users`));
  }

  // Confirm before proceeding
  if (!args.dryRun && !args.testBatch) {
    console.log(chalk.bold.yellow(`\n⚠️  About to send ${usersToProcess.length} emails!`));
    console.log(chalk.gray('Press Ctrl+C to cancel, or wait 5 seconds to continue...'));
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Process in batches
  const batches = [];
  for (let i = 0; i < usersToProcess.length; i += args.batchSize) {
    batches.push(usersToProcess.slice(i, i + args.batchSize));
  }

  console.log(chalk.bold(`\n📬 Starting campaign with ${batches.length} batches`));

  for (let i = 0; i < batches.length; i++) {
    await processBatch(batches[i], i + 1);

    // Delay between batches (except for last batch)
    if (i < batches.length - 1) {
      console.log(chalk.gray(`\n⏳ Waiting ${CONFIG.DELAY_BETWEEN_BATCHES / 1000}s before next batch...`));
      await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_BATCHES));
    }
  }

  // Final summary
  console.log(chalk.bold('\n📊 Campaign Summary:'));
  console.log(chalk.gray('='.repeat(50)));
  console.log(chalk.green(`  Emails sent: ${campaignLog.sent.length}`));
  console.log(chalk.red(`  Failed: ${campaignLog.failed.length}`));
  console.log(chalk.gray(`  Total users: ${campaignLog.totalUsers}`));
  console.log(chalk.gray(`  Success rate: ${(campaignLog.sent.length / campaignLog.totalUsers * 100).toFixed(1)}%`));

  // Save final state
  campaignLog.endTime = new Date().toISOString();
  await saveCampaignState();

  console.log(chalk.green('\n✅ Campaign complete! Log saved to campaign-log.json'));

  // Show failed emails if any
  if (campaignLog.failed.length > 0) {
    console.log(chalk.yellow('\n⚠️  Failed emails:'));
    campaignLog.failed.forEach(f => {
      console.log(chalk.red(`  - ${f.email}: ${f.error}`));
    });
  }
}

// Error handler
process.on('unhandledRejection', async (error) => {
  console.error(chalk.red('\n❌ Fatal error:'), error);
  await saveCampaignState();
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n\n🛑 Campaign interrupted! Saving state...'));
  await saveCampaignState();
  console.log(chalk.green('✓ State saved. Use --resume flag to continue.'));
  process.exit(0);
});

// Run campaign
runCampaign().catch(async (error) => {
  console.error(chalk.red('\n❌ Campaign failed:'), error);
  await saveCampaignState();
  process.exit(1);
});
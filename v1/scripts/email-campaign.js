#!/usr/bin/env node

import sgMail from '@sendgrid/mail';
import { Client } from '@notionhq/client';
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
const flags = {
  dryRun: args.includes('--dry-run'),
  resume: args.includes('--resume'),
  batchSize: parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '50'),
  help: args.includes('--help') || args.includes('-h'),
};

// Campaign configuration
const CONFIG = {
  RATE_LIMIT_MS: 1000, // 1 second between emails
  BONUS_POINTS: 75, // Static bonus points for all users
  PROGRESS_LOG_INTERVAL: 10, // Log progress every 10 emails
  FAILED_EMAILS_FILE: path.join(__dirname, 'failed-emails.json'),
  SENT_EMAILS_FILE: path.join(__dirname, 'sent-emails.json'),
  TEMPLATE_ID: 'd-24401dab58ec4e9eb158de7034e307fe', // SendGrid template ID
};

// Show help
if (flags.help) {
  console.log(`
Email Campaign Script

Usage: node email-campaign.js [options]

Options:
  --dry-run         Run without sending emails (preview mode)
  --resume          Resume from previous run using sent-emails.json
  --batch-size=N    Process N users per batch (default: 50)
  --help, -h        Show this help message

Examples:
  node email-campaign.js --dry-run
  node email-campaign.js --batch-size=10
  node email-campaign.js --resume
`);
  process.exit(0);
}

/**
 * Initialize services
 */
async function initializeServices() {
  console.log('🔧 Initializing services...');

  // Initialize Notion client
  const notion = new Client({
    auth: process.env.NOTION_TOKEN,
  });

  // Initialize SendGrid
  try {
    // Check for SendGrid API key
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    if (!sendgridApiKey) {
      throw new Error('SENDGRID_API_KEY not found in environment variables');
    }

    // Set SendGrid API key
    sgMail.setApiKey(sendgridApiKey);

    console.log('✅ SendGrid initialized successfully');
    console.log('📌 Make sure info@nstcg.org is verified in SendGrid Sender Authentication');
    return { notion, sgMail };

  } catch (error) {
    console.error('❌ Failed to initialize SendGrid:', error.message);
    console.error('💡 Make sure SENDGRID_API_KEY is set in your .env file or environment');
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
 * Fetch all users from Notion Leads database
 */
async function fetchUsersFromNotion(notion) {
  console.log('📊 Fetching users from Notion Leads database...');

  const users = [];
  let hasMore = true;
  let startCursor = undefined;

  while (hasMore) {
    try {
      const response = await notion.databases.query({
        database_id: process.env.NOTION_DATABASE_ID,
        start_cursor: startCursor,
        page_size: 100,
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
          });
        }
      }

      hasMore = response.has_more;
      startCursor = response.next_cursor;

    } catch (error) {
      console.error('❌ Error fetching users from Notion:', error.message);
      throw error;
    }
  }

  console.log(`✅ Found ${users.length} registered users`);
  return users;
}

/**
 * Load previously sent emails (for resume functionality)
 */
async function loadSentEmails() {
  try {
    const data = await fs.readFile(CONFIG.SENT_EMAILS_FILE, 'utf-8');
    return new Set(JSON.parse(data));
  } catch (error) {
    return new Set();
  }
}

/**
 * Save sent email to tracking file
 */
async function saveSentEmail(email) {
  const sentEmails = await loadSentEmails();
  sentEmails.add(email);
  await fs.writeFile(CONFIG.SENT_EMAILS_FILE, JSON.stringify([...sentEmails], null, 2));
}

/**
 * Load failed emails for retry
 */
async function loadFailedEmails() {
  try {
    const data = await fs.readFile(CONFIG.FAILED_EMAILS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

/**
 * Save failed email for retry
 */
async function saveFailedEmail(user, error) {
  const failedEmails = await loadFailedEmails();
  failedEmails.push({
    ...user,
    error: error.message,
    timestamp: new Date().toISOString(),
  });
  await fs.writeFile(CONFIG.FAILED_EMAILS_FILE, JSON.stringify(failedEmails, null, 2));
}

/**
 * Send email to a single user
 */
async function sendEmail(sgMail, user, bonusPoints, dryRun = false) {
  // Create email message using SendGrid template
  const msg = {
    to: user.email,
    from: 'engineering@nstcg.org',
    templateId: CONFIG.TEMPLATE_ID,
    dynamic_template_data: {
      email: user.email,
      bonusPoints: bonusPoints,
      firstName: user.firstName,
      name: user.name,
    },
  };

  if (dryRun) {
    console.log(`📧 [DRY RUN] Would send to: ${user.email} (${bonusPoints} points)`);
    return { messageId: 'dry-run-' + Date.now() };
  }

  // Send email using SendGrid
  const [response] = await sgMail.send(msg);

  return {
    messageId: response.headers['x-message-id'],
    statusCode: response.statusCode
  };
}

/**
 * Process a batch of users
 */
async function processBatch(sgMail, users, startIndex, batchSize, sentEmails, dryRun) {
  const endIndex = Math.min(startIndex + batchSize, users.length);
  const batch = users.slice(startIndex, endIndex);

  console.log(`\n📦 Processing batch: ${startIndex + 1}-${endIndex} of ${users.length}`);

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (let i = 0; i < batch.length; i++) {
    const user = batch[i];
    const globalIndex = startIndex + i + 1;

    // Skip if already sent (resume functionality)
    if (sentEmails.has(user.email)) {
      skipCount++;
      if (skipCount === 1 || skipCount % 10 === 0) {
        console.log(`⏭️  Skipping ${user.email} (already sent)`);
      }
      continue;
    }

    try {
      // Get bonus points
      const bonusPoints = getBonusPoints();

      // Send email
      const result = await sendEmail(sgMail, user, bonusPoints, dryRun);

      // Track success
      successCount++;
      if (!dryRun) {
        await saveSentEmail(user.email);
      }

      // Log progress
      if (globalIndex % CONFIG.PROGRESS_LOG_INTERVAL === 0 || i === batch.length - 1) {
        console.log(`✅ Progress: ${globalIndex}/${users.length} - Sent to ${user.email} (${bonusPoints} points)`);
      }

      // Rate limiting
      if (i < batch.length - 1) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMIT_MS));
      }

    } catch (error) {
      failCount++;
      console.error(`❌ Failed to send to ${user.email}:`, error.message);
      await saveFailedEmail(user, error);

      // Continue with next user
      continue;
    }
  }

  return { successCount, skipCount, failCount };
}

/**
 * Generate campaign summary
 */
async function generateSummary(totalUsers, stats, duration, dryRun) {
  const summary = `
📊 Campaign Summary
${'='.repeat(50)}
Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}
Total Users: ${totalUsers}
Emails Sent: ${stats.successCount}
Emails Skipped: ${stats.skipCount}
Emails Failed: ${stats.failCount}
Success Rate: ${((stats.successCount / (totalUsers - stats.skipCount)) * 100).toFixed(1)}%
Duration: ${(duration / 1000 / 60).toFixed(1)} minutes
${'='.repeat(50)}
`;

  console.log(summary);

  // Save summary to file
  const summaryFile = path.join(__dirname, `campaign-summary-${new Date().toISOString().split('T')[0]}.txt`);
  await fs.writeFile(summaryFile, summary);
  console.log(`📄 Summary saved to: ${summaryFile}`);
}

/**
 * Main campaign function
 */
async function runCampaign() {
  console.log('🚀 Starting Email Campaign...\n');
  console.log(`Mode: ${flags.dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Batch Size: ${flags.batchSize}`);
  console.log(`Resume: ${flags.resume ? 'Yes' : 'No'}\n`);

  const startTime = Date.now();
  const stats = {
    successCount: 0,
    skipCount: 0,
    failCount: 0,
  };

  try {
    // Initialize services
    const { notion, sgMail } = await initializeServices();

    // Fetch users
    const users = await fetchUsersFromNotion(notion);

    if (users.length === 0) {
      console.log('❌ No users found to process');
      return;
    }

    // Load sent emails (for resume)
    const sentEmails = flags.resume ? await loadSentEmails() : new Set();
    if (sentEmails.size > 0) {
      console.log(`📌 Resuming: ${sentEmails.size} emails already sent`);
    }

    // Dry run preview
    if (flags.dryRun) {
      console.log('\n🔍 DRY RUN - Preview of first 5 emails:');
      for (let i = 0; i < Math.min(5, users.length); i++) {
        const bonusPoints = getBonusPoints();
        console.log(`   ${i + 1}. ${users[i].email} - ${bonusPoints} points`);
      }
      console.log('');
    }

    // Process users in batches
    for (let i = 0; i < users.length; i += flags.batchSize) {
      const batchStats = await processBatch(
        sgMail,
        users,
        i,
        flags.batchSize,
        sentEmails,
        flags.dryRun
      );

      stats.successCount += batchStats.successCount;
      stats.skipCount += batchStats.skipCount;
      stats.failCount += batchStats.failCount;

      // Pause between batches (except for last batch)
      if (i + flags.batchSize < users.length) {
        console.log(`⏸️  Pausing 5 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Generate summary
    const duration = Date.now() - startTime;
    await generateSummary(users.length, stats, duration, flags.dryRun);

    console.log('\n🎉 Email campaign completed!');

  } catch (error) {
    console.error('\n❌ Campaign failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Campaign interrupted by user');
  console.log('💡 Use --resume flag to continue from where you left off');
  process.exit(0);
});

// Run the campaign
runCampaign();
#!/usr/bin/env node

/**
 * Email Campaign Script
 * Sends emails to all users in the Leads Notion database about:
 * - Time remaining on the survey
 * - New referral scheme
 * - Bonus points opportunity
 */

import { Client } from '@notionhq/client';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_TOKEN || process.env.NOTION_API_KEY,
});

// Survey deadline
const SURVEY_DEADLINE = new Date('2025-06-29T23:59:59+01:00');

/**
 * Calculate time remaining until survey deadline
 */
function getTimeRemaining() {
  const now = new Date();
  const timeLeft = SURVEY_DEADLINE - now;
  
  if (timeLeft < 0) {
    return { expired: true };
  }
  
  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  return {
    expired: false,
    days,
    hours,
    formatted: `${days} days and ${hours} hours`
  };
}

/**
 * Initialize Gmail API with ADC (Application Default Credentials)
 */
async function initializeGmail() {
  try {
    // Create auth client using ADC
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/gmail.send'],
    });
    
    const authClient = await auth.getClient();
    
    // Create Gmail client
    const gmail = google.gmail({
      version: 'v1',
      auth: authClient,
    });
    
    return gmail;
  } catch (error) {
    console.error('Error initializing Gmail:', error);
    throw error;
  }
}

/**
 * Load and process email template
 */
async function loadEmailTemplate(userData) {
  const templatePath = path.join(__dirname, 'templates', 'campaign-email.html');
  let template = await fs.readFile(templatePath, 'utf-8');
  
  const timeRemaining = getTimeRemaining();
  const bonusPoints = Math.floor(Math.random() * 41) + 10; // 10-50 points
  
  // Replace template variables
  const replacements = {
    '{{firstName}}': userData.firstName || 'Neighbour',
    '{{timeRemaining}}': timeRemaining.formatted || 'limited time',
    '{{daysRemaining}}': timeRemaining.days || '0',
    '{{hoursRemaining}}': timeRemaining.hours || '0',
    '{{bonusPoints}}': bonusPoints,
    '{{activationLink}}': `https://nstcg.org/?user_email=${encodeURIComponent(userData.email)}&bonus=${bonusPoints}`,
    '{{referralCode}}': userData.referralCode || 'Your unique code',
    '{{currentYear}}': new Date().getFullYear()
  };
  
  for (const [key, value] of Object.entries(replacements)) {
    template = template.replace(new RegExp(key, 'g'), value);
  }
  
  return { html: template, bonusPoints };
}

/**
 * Send email via Gmail API
 */
async function sendEmail(gmail, to, subject, htmlContent) {
  try {
    // Create email message
    const message = [
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `From: North Swanage Traffic Safety Group <info@nstcg.org>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      '',
      htmlContent
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
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error.message);
    throw error;
  }
}

/**
 * Fetch all users from Leads database
 */
async function fetchAllUsers() {
  const users = [];
  let hasMore = true;
  let startCursor = undefined;
  
  const databaseId = process.env.NOTION_DATABASE_ID;
  if (!databaseId) {
    throw new Error('NOTION_DATABASE_ID not set in environment');
  }
  
  while (hasMore) {
    try {
      const response = await notion.databases.query({
        database_id: databaseId,
        start_cursor: startCursor,
        page_size: 100,
        filter: {
          property: 'Email',
          email: {
            is_not_empty: true
          }
        }
      });
      
      // Extract user data
      for (const page of response.results) {
        const props = page.properties;
        const email = props['Email']?.email;
        
        if (email) {
          users.push({
            id: page.id,
            email: email,
            firstName: props['First Name']?.rich_text[0]?.text?.content || '',
            lastName: props['Last Name']?.rich_text[0]?.text?.content || '',
            name: props['Name']?.rich_text[0]?.text?.content || '',
            userId: props['User ID']?.rich_text[0]?.text?.content || '',
            referralCode: props['Referral Code']?.rich_text[0]?.text?.content || '',
            timestamp: props['Timestamp']?.date?.start || ''
          });
        }
      }
      
      hasMore = response.has_more;
      startCursor = response.next_cursor;
      
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }
  
  return users;
}

/**
 * Update user's bonus points in Notion
 */
async function updateUserBonusPoints(userId, email, bonusPoints) {
  try {
    // Update in Gamification DB if it exists
    if (process.env.NOTION_GAMIFICATION_DB_ID) {
      // First check if user exists
      const queryResponse = await notion.databases.query({
        database_id: process.env.NOTION_GAMIFICATION_DB_ID,
        filter: {
          property: 'Email',
          email: {
            equals: email
          }
        },
        page_size: 1
      });
      
      if (queryResponse.results.length > 0) {
        // User exists, store bonus points for later activation
        const userPage = queryResponse.results[0];
        await notion.pages.update({
          page_id: userPage.id,
          properties: {
            'Bonus Points': {
              number: bonusPoints
            }
          }
        });
      }
    }
  } catch (error) {
    console.error(`Error updating bonus points for ${email}:`, error);
  }
}

/**
 * Main campaign function
 */
async function runCampaign() {
  console.log('🚀 Starting Email Campaign\n');
  
  // Check if survey has expired
  const timeRemaining = getTimeRemaining();
  if (timeRemaining.expired) {
    console.log('❌ Survey has expired. Campaign cancelled.');
    return;
  }
  
  console.log(`⏰ Time remaining: ${timeRemaining.formatted}\n`);
  
  // Initialize Gmail
  console.log('📧 Initializing Gmail API...');
  const gmail = await initializeGmail();
  
  // Fetch all users
  console.log('👥 Fetching users from Notion...');
  const users = await fetchAllUsers();
  console.log(`Found ${users.length} users\n`);
  
  // Confirm before sending
  console.log('⚠️  WARNING: This will send emails to all users!');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Send emails
  const results = {
    sent: 0,
    failed: 0,
    errors: []
  };
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    console.log(`[${i + 1}/${users.length}] Processing ${user.email}...`);
    
    try {
      // Load template with user data
      const { html, bonusPoints } = await loadEmailTemplate(user);
      
      // Send email
      await sendEmail(
        gmail,
        user.email,
        `⏰ ${timeRemaining.days} Days Left! Activate Your Referral Code & Earn Bonus Points`,
        html
      );
      
      // Update bonus points in database
      await updateUserBonusPoints(user.userId, user.email, bonusPoints);
      
      results.sent++;
      console.log(`✅ Sent (${bonusPoints} bonus points)`);
      
      // Rate limiting - wait 1 second between emails
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      results.failed++;
      results.errors.push({
        email: user.email,
        error: error.message
      });
      console.log(`❌ Failed: ${error.message}`);
    }
  }
  
  // Summary
  console.log('\n📊 Campaign Summary:');
  console.log(`✅ Sent: ${results.sent}`);
  console.log(`❌ Failed: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(err => {
      console.log(`  - ${err.email}: ${err.error}`);
    });
  }
}

// Run campaign if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCampaign().catch(console.error);
}

export { runCampaign, fetchAllUsers, sendEmail };
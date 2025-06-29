#!/usr/bin/env node

/**
 * Referral Code Generation Script
 * 
 * Usage:
 *   node migrate-referral-codes.js --gen    - Generate referral codes for users without them
 *   node migrate-referral-codes.js --easy   - Generate both User IDs and referral codes for all users
 * 
 * Note: Gamification database migration has been removed as the gamification system is deprecated
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Notion API configuration
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const LEADS_DB_ID = process.env.NOTION_DATABASE_ID;

// Log files
const GENERATION_ERROR_LOG = path.join(__dirname, 'generation-errors.log');

// Validate environment
if (!NOTION_TOKEN || !LEADS_DB_ID) {
  console.error('Missing required environment variables: NOTION_TOKEN, NOTION_DATABASE_ID');
  process.exit(1);
}

/**
 * Log error to file
 */
function logError(file, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    message,
    ...data
  };
  
  fs.appendFileSync(file, JSON.stringify(logEntry) + '\n');
}

/**
 * Generate unique referral code (same format as codebase)
 */
function generateUniqueReferralCode(firstName = 'USER') {
  const prefix = firstName.slice(0, 3).toUpperCase();
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

/**
 * Generate unique user ID (same format as main.js)
 */
function generateUserId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Fetch all users from a Notion database
 */
async function fetchAllUsers(databaseId) {
  const users = [];
  let cursor = undefined;
  
  do {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        start_cursor: cursor,
        page_size: 100
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from database: ${response.status}`);
    }
    
    const data = await response.json();
    users.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
    
  } while (cursor);
  
  return users;
}

/**
 * Update user's referral code in leads database
 */
async function updateUserReferralCode(pageId, referralCode) {
  const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({
      properties: {
        'Referral Code': {
          rich_text: [{
            text: {
              content: referralCode
            }
          }]
        }
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to update referral code: ${JSON.stringify(error)}`);
  }
  
  return response.json();
}

/**
 * Update user's referral code and/or user ID in leads database
 */
async function updateUserFields(pageId, updates) {
  const properties = {};
  
  if (updates.referralCode) {
    properties['Referral Code'] = {
      rich_text: [{
        text: {
          content: updates.referralCode
        }
      }]
    };
  }
  
  if (updates.userId) {
    properties['User ID'] = {
      rich_text: [{
        text: {
          content: updates.userId
        }
      }]
    };
  }
  
  const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({ properties })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to update user fields: ${JSON.stringify(error)}`);
  }
  
  return response.json();
}

// Migration function removed - gamification system deprecated

/**
 * Generate referral codes for users without them
 */
async function generateMissingReferralCodes() {
  console.log('Starting referral code generation...');
  
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  
  try {
    // Fetch all users from leads database
    console.log('Fetching users from leads database...');
    const users = await fetchAllUsers(LEADS_DB_ID);
    console.log(`Found ${users.length} users in leads database`);
    
    // Process each user
    for (const user of users) {
      const existingReferralCode = user.properties['Referral Code']?.rich_text?.[0]?.text?.content;
      const email = user.properties['Email']?.email;
      const firstName = user.properties['First Name']?.rich_text?.[0]?.text?.content || '';
      const name = user.properties['Name']?.title?.[0]?.text?.content || email || 'Unknown';
      const userId = user.properties['User ID']?.rich_text?.[0]?.text?.content;
      
      // Skip if user already has a referral code
      if (existingReferralCode) {
        console.log(`User ${name} already has referral code: ${existingReferralCode}`);
        skippedCount++;
        continue;
      }
      
      // Generate new referral code
      const referralCode = generateUniqueReferralCode(firstName || email?.split('@')[0] || 'USER');
      
      try {
        await updateUserReferralCode(user.id, referralCode);
        console.log(`✓ Generated for ${name}: ${referralCode}`);
        successCount++;
      } catch (error) {
        console.error(`✗ Failed to update ${name}: ${error.message}`);
        logError(GENERATION_ERROR_LOG, 'Failed to generate referral code', {
          userId,
          email,
          name,
          referralCode,
          error: error.message
        });
        errorCount++;
      }
    }
    
  } catch (error) {
    console.error('Generation failed:', error);
    logError(GENERATION_ERROR_LOG, 'Generation failed', {
      error: error.message
    });
  }
  
  console.log('\nGeneration complete:');
  console.log(`✓ Success: ${successCount}`);
  console.log(`✗ Errors: ${errorCount}`);
  console.log(`- Skipped: ${skippedCount}`);
  
  if (errorCount > 0) {
    console.log(`\nErrors logged to: ${GENERATION_ERROR_LOG}`);
  }
}

/**
 * Easy mode - Generate both User IDs and Referral Codes for all users
 */
async function easyModeGeneration() {
  console.log('Starting easy mode generation (User IDs + Referral Codes)...');
  
  const EASY_ERROR_LOG = path.join(__dirname, 'easy-mode-errors.log');
  
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  let userIdGenerated = 0;
  let referralCodeGenerated = 0;
  
  try {
    // Fetch all users from leads database
    console.log('Fetching users from leads database...');
    const users = await fetchAllUsers(LEADS_DB_ID);
    console.log(`Found ${users.length} users in leads database`);
    
    // Process each user
    for (const user of users) {
      const existingUserId = user.properties['User ID']?.rich_text?.[0]?.text?.content;
      const existingReferralCode = user.properties['Referral Code']?.rich_text?.[0]?.text?.content;
      const email = user.properties['Email']?.email;
      const firstName = user.properties['First Name']?.rich_text?.[0]?.text?.content || '';
      const name = user.properties['Name']?.title?.[0]?.text?.content || email || 'Unknown';
      
      // Check what needs to be updated
      const updates = {};
      let needsUpdate = false;
      
      if (!existingUserId) {
        updates.userId = generateUserId();
        needsUpdate = true;
        console.log(`Generating User ID for ${name}: ${updates.userId}`);
      }
      
      if (!existingReferralCode) {
        updates.referralCode = generateUniqueReferralCode(firstName || email?.split('@')[0] || 'USER');
        needsUpdate = true;
        console.log(`Generating Referral Code for ${name}: ${updates.referralCode}`);
      }
      
      if (!needsUpdate) {
        console.log(`User ${name} already has both User ID and Referral Code`);
        skippedCount++;
        continue;
      }
      
      try {
        await updateUserFields(user.id, updates);
        console.log(`✓ Updated ${name} successfully`);
        successCount++;
        
        if (updates.userId) userIdGenerated++;
        if (updates.referralCode) referralCodeGenerated++;
        
      } catch (error) {
        console.error(`✗ Failed to update ${name}: ${error.message}`);
        logError(EASY_ERROR_LOG, 'Failed to update user in easy mode', {
          email,
          name,
          updates,
          error: error.message
        });
        errorCount++;
      }
    }
    
  } catch (error) {
    console.error('Easy mode generation failed:', error);
    logError(EASY_ERROR_LOG, 'Easy mode generation failed', {
      error: error.message
    });
  }
  
  console.log('\nEasy mode generation complete:');
  console.log(`✓ Success: ${successCount} users updated`);
  console.log(`  - User IDs generated: ${userIdGenerated}`);
  console.log(`  - Referral Codes generated: ${referralCodeGenerated}`);
  console.log(`✗ Errors: ${errorCount}`);
  console.log(`- Skipped: ${skippedCount} (already complete)`);
  
  if (errorCount > 0) {
    console.log(`\nErrors logged to: ${EASY_ERROR_LOG}`);
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const shouldGenerate = args.includes('--gen');
  const easyMode = args.includes('--easy');
  
  if (easyMode) {
    await easyModeGeneration();
  } else if (shouldGenerate) {
    await generateMissingReferralCodes();
  } else {
    console.log('Referral Code Generation Script\n');
    console.log('Usage:');
    console.log('  --gen    Generate referral codes for users without them');
    console.log('  --easy   Generate both User IDs and referral codes for all users');
    console.log('\nExample:');
    console.log('  node migrate-referral-codes.js --easy');
  }
}

// Run the script
main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
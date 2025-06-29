#!/usr/bin/env node

/**
 * Optimized Referral Code Generation Script
 * 
 * Usage:
 *   node migrate-referral-codes-optimized.js --gen    - Generate referral codes for users without them
 *   node migrate-referral-codes-optimized.js --easy   - Generate both User IDs and referral codes for all users
 * 
 * Optimizations:
 * - Parallel processing with configurable batch size
 * - Query filtering to only fetch users needing updates
 * - HTTP keep-alive for connection reuse
 * - Streaming/cursor-based processing
 * - Retry logic with exponential backoff
 * - Progress tracking with ETA
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Configuration
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const LEADS_DB_ID = process.env.NOTION_DATABASE_ID;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '20'); // Concurrent requests
const MAX_RETRIES = 3;

// Log files
const GENERATION_ERROR_LOG = path.join(__dirname, 'generation-errors-optimized.log');

// HTTP agent for connection reuse
const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: BATCH_SIZE
});

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
 * Progress tracking class
 */
class ProgressTracker {
  constructor(total) {
    this.total = total;
    this.current = 0;
    this.startTime = Date.now();
    this.successCount = 0;
    this.errorCount = 0;
    this.skippedCount = 0;
  }

  increment(type = 'success') {
    this.current++;
    if (type === 'success') this.successCount++;
    else if (type === 'error') this.errorCount++;
    else if (type === 'skip') this.skippedCount++;
    
    this.display();
  }

  display() {
    const elapsed = Date.now() - this.startTime;
    const rate = this.current / (elapsed / 1000);
    const remaining = (this.total - this.current) / rate;
    const eta = new Date(Date.now() + remaining * 1000).toLocaleTimeString();
    
    const percentage = Math.round((this.current / this.total) * 100);
    const bar = '='.repeat(Math.floor(percentage / 2.5)).padEnd(40, ' ');
    
    process.stdout.write(`\r[${bar}] ${percentage}% | ${this.current}/${this.total} | ✓ ${this.successCount} ✗ ${this.errorCount} - ${this.skippedCount} | ETA: ${eta}  `);
  }

  finish() {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log(`\n\nCompleted in ${elapsed}s`);
    console.log(`✓ Success: ${this.successCount}`);
    console.log(`✗ Errors: ${this.errorCount}`);
    console.log(`- Skipped: ${this.skippedCount}`);
  }
}

/**
 * Retry with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = MAX_RETRIES) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Check if it's a rate limit error
      if (error.status === 429) {
        const delay = Math.pow(2, i + 2) * 1000; // Start with 4 seconds
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

/**
 * Fetch users with filtering and cursor
 */
async function fetchFilteredUsers(cursor, filter) {
  const requestBody = {
    page_size: 100
  };
  
  if (cursor) requestBody.start_cursor = cursor;
  if (filter) requestBody.filter = filter;
  
  const response = await fetch(`https://api.notion.com/v1/databases/${LEADS_DB_ID}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify(requestBody),
    agent: httpsAgent
  });
  
  if (!response.ok) {
    const error = new Error(`Failed to fetch users: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  
  return response.json();
}

/**
 * Update user fields with retry
 */
async function updateUserFieldsWithRetry(pageId, updates) {
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
  
  return retryWithBackoff(async () => {
    const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({ properties }),
      agent: httpsAgent
    });
    
    if (!response.ok) {
      const error = new Error(`Failed to update: ${response.status}`);
      error.status = response.status;
      throw error;
    }
    
    return response.json();
  });
}

/**
 * Process users in parallel batches
 */
async function processBatch(users, mode, progress) {
  const updates = [];
  
  // Prepare updates for all users in batch
  for (const user of users) {
    const existingUserId = user.properties['User ID']?.rich_text?.[0]?.text?.content;
    const existingReferralCode = user.properties['Referral Code']?.rich_text?.[0]?.text?.content;
    const email = user.properties['Email']?.email;
    const firstName = user.properties['First Name']?.rich_text?.[0]?.text?.content || '';
    const name = user.properties['Name']?.title?.[0]?.text?.content || email || 'Unknown';
    
    const userUpdates = {};
    let needsUpdate = false;
    
    if (mode === 'easy' || mode === 'all') {
      if (!existingUserId) {
        userUpdates.userId = generateUserId();
        needsUpdate = true;
      }
    }
    
    if (!existingReferralCode) {
      userUpdates.referralCode = generateUniqueReferralCode(firstName || email?.split('@')[0] || 'USER');
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      updates.push({
        id: user.id,
        name,
        email,
        updates: userUpdates
      });
    } else {
      progress.increment('skip');
    }
  }
  
  // Process updates in parallel
  if (updates.length > 0) {
    const promises = updates.map(async ({ id, name, email, updates: userUpdates }) => {
      try {
        await updateUserFieldsWithRetry(id, userUpdates);
        progress.increment('success');
        return { success: true, name };
      } catch (error) {
        progress.increment('error');
        logError(GENERATION_ERROR_LOG, 'Failed to update user', {
          email,
          name,
          updates: userUpdates,
          error: error.message
        });
        return { success: false, name, error: error.message };
      }
    });
    
    await Promise.allSettled(promises);
  }
}

/**
 * Optimized generation with streaming and filtering
 */
async function optimizedGeneration(mode = 'referral') {
  console.log(`Starting optimized ${mode} mode generation...`);
  console.log(`Batch size: ${BATCH_SIZE} concurrent requests\n`);
  
  // Build filter based on mode
  let filter = null;
  if (mode === 'referral') {
    filter = {
      property: 'Referral Code',
      rich_text: { is_empty: true }
    };
  } else if (mode === 'easy') {
    filter = {
      or: [
        { property: 'Referral Code', rich_text: { is_empty: true } },
        { property: 'User ID', rich_text: { is_empty: true } }
      ]
    };
  }
  
  try {
    // First, get total count
    console.log('Counting users needing updates...');
    let totalUsers = 0;
    let cursor = undefined;
    
    do {
      const data = await fetchFilteredUsers(cursor, filter);
      totalUsers += data.results.length;
      cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);
    
    console.log(`Found ${totalUsers} users needing updates\n`);
    
    if (totalUsers === 0) {
      console.log('No users need updates!');
      return;
    }
    
    // Process with progress tracking
    const progress = new ProgressTracker(totalUsers);
    cursor = undefined;
    
    do {
      const data = await fetchFilteredUsers(cursor, filter);
      
      // Process in batches
      for (let i = 0; i < data.results.length; i += BATCH_SIZE) {
        const batch = data.results.slice(i, i + BATCH_SIZE);
        await processBatch(batch, mode, progress);
      }
      
      cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);
    
    progress.finish();
    
    if (progress.errorCount > 0) {
      console.log(`\nErrors logged to: ${GENERATION_ERROR_LOG}`);
    }
    
  } catch (error) {
    console.error('\nGeneration failed:', error);
    logError(GENERATION_ERROR_LOG, 'Generation failed', {
      error: error.message
    });
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const shouldGenerate = args.includes('--gen');
  const easyMode = args.includes('--easy');
  
  console.log('🚀 Optimized Referral Code Generation Script\n');
  
  if (easyMode) {
    await optimizedGeneration('easy');
  } else if (shouldGenerate) {
    await optimizedGeneration('referral');
  } else {
    console.log('Usage:');
    console.log('  --gen    Generate referral codes for users without them');
    console.log('  --easy   Generate both User IDs and referral codes for all users');
    console.log('\nOptimizations enabled:');
    console.log(`  ✓ Parallel processing (${BATCH_SIZE} concurrent requests)`);
    console.log('  ✓ Query filtering (only fetch users needing updates)');
    console.log('  ✓ HTTP keep-alive connection pooling');
    console.log('  ✓ Streaming with cursor-based pagination');
    console.log('  ✓ Retry logic with exponential backoff');
    console.log('  ✓ Real-time progress tracking with ETA');
    console.log('\nExample:');
    console.log('  node migrate-referral-codes-optimized.js --easy');
  }
}

// Run the script
main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
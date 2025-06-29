#!/usr/bin/env node

/**
 * Analyze why users are being skipped during referral code migration
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
const GAMIFICATION_DB_ID = process.env.NOTION_GAMIFICATION_DB_ID;

// Validate environment
if (!NOTION_TOKEN || !LEADS_DB_ID) {
  console.error('Missing required environment variables: NOTION_TOKEN, NOTION_DATABASE_ID');
  process.exit(1);
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
 * Analyze skip reasons
 */
async function analyzeSkipReasons() {
  console.log('Analyzing referral code migration skip reasons...\n');
  
  const stats = {
    totalLeadsUsers: 0,
    hasUserID: 0,
    noUserID: 0,
    hasReferralCode: 0,
    noReferralCode: 0,
    totalGamificationUsers: 0,
    gamificationWithUserID: 0,
    gamificationWithReferralCode: 0,
    matchingUserIDs: 0,
    noMatchInGamification: 0
  };
  
  try {
    // Analyze leads database
    console.log('Analyzing leads database...');
    const leadsUsers = await fetchAllUsers(LEADS_DB_ID);
    stats.totalLeadsUsers = leadsUsers.length;
    
    const leadsUserIDs = new Set();
    
    for (const user of leadsUsers) {
      const userId = user.properties['User ID']?.rich_text?.[0]?.text?.content;
      const referralCode = user.properties['Referral Code']?.rich_text?.[0]?.text?.content;
      const name = user.properties['Name']?.title?.[0]?.text?.content || 'Unknown';
      
      if (userId) {
        stats.hasUserID++;
        leadsUserIDs.add(userId);
      } else {
        stats.noUserID++;
      }
      
      if (referralCode) {
        stats.hasReferralCode++;
      } else {
        stats.noReferralCode++;
      }
    }
    
    console.log(`\nLeads Database Summary:`);
    console.log(`- Total users: ${stats.totalLeadsUsers}`);
    console.log(`- With User ID: ${stats.hasUserID}`);
    console.log(`- Without User ID: ${stats.noUserID}`);
    console.log(`- With referral code: ${stats.hasReferralCode}`);
    console.log(`- Without referral code: ${stats.noReferralCode}`);
    
    // Analyze gamification database if available
    if (GAMIFICATION_DB_ID) {
      console.log('\nAnalyzing gamification database...');
      const gamificationUsers = await fetchAllUsers(GAMIFICATION_DB_ID);
      stats.totalGamificationUsers = gamificationUsers.length;
      
      const gamificationUserIDs = new Map();
      
      for (const user of gamificationUsers) {
        const userId = user.properties['User ID']?.rich_text?.[0]?.text?.content;
        const referralCode = user.properties['Referral Code']?.rich_text?.[0]?.text?.content;
        
        if (userId) {
          stats.gamificationWithUserID++;
          if (referralCode) {
            gamificationUserIDs.set(userId, referralCode);
            stats.gamificationWithReferralCode++;
          }
        }
      }
      
      // Check matches
      for (const userId of leadsUserIDs) {
        if (gamificationUserIDs.has(userId)) {
          stats.matchingUserIDs++;
        } else {
          stats.noMatchInGamification++;
        }
      }
      
      console.log(`\nGamification Database Summary:`);
      console.log(`- Total users: ${stats.totalGamificationUsers}`);
      console.log(`- With User ID: ${stats.gamificationWithUserID}`);
      console.log(`- With referral code: ${stats.gamificationWithReferralCode}`);
      
      console.log(`\nMatching Analysis:`);
      console.log(`- Leads users with matching gamification entry: ${stats.matchingUserIDs}`);
      console.log(`- Leads users with NO gamification entry: ${stats.noMatchInGamification}`);
    }
    
    console.log(`\n--- Skip Reasons Summary ---`);
    console.log(`1. No User ID in leads DB: ${stats.noUserID} users`);
    console.log(`2. Already has referral code: ${stats.hasReferralCode} users`);
    if (GAMIFICATION_DB_ID) {
      console.log(`3. No match in gamification DB: ${stats.noMatchInGamification} users`);
      console.log(`\nPotential successful migrations: ${stats.matchingUserIDs - stats.hasReferralCode} users`);
    }
    
  } catch (error) {
    console.error('Analysis failed:', error);
  }
}

// Run the analysis
analyzeSkipReasons().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
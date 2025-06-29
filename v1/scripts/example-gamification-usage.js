#!/usr/bin/env node

/**
 * Example script showing how to interact with the gamification database
 * This demonstrates common operations like adding users, updating points, etc.
 */

import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

// Example: Add a new user to gamification system
async function addUserToGamification(email, name, referralCode) {
  const gamificationDbId = process.env.NOTION_GAMIFICATION_DATABASE_ID;
  
  if (!gamificationDbId) {
    console.error('❌ NOTION_GAMIFICATION_DATABASE_ID not set in .env');
    return;
  }

  try {
    const response = await notion.pages.create({
      parent: {
        database_id: gamificationDbId,
      },
      properties: {
        'Name': {
          title: [
            {
              text: {
                content: name,
              },
            },
          ],
        },
        'Email': {
          email: email,
        },
        'Display Name': {
          rich_text: [
            {
              text: {
                content: name.split(' ')[0], // First name for display
              },
            },
          ],
        },
        'Referral Code': {
          rich_text: [
            {
              text: {
                content: referralCode,
              },
            },
          ],
        },
        'Total Points': {
          number: 10, // Registration points
        },
        'Registration Points': {
          number: 10,
        },
        'Share Points': {
          number: 0,
        },
        'Referral Points': {
          number: 0,
        },
        'Direct Referrals Count': {
          number: 0,
        },
        'Opted Into Leaderboard': {
          checkbox: false, // Default opt-out
        },
        'Profile Visibility': {
          select: {
            name: 'Private',
          },
        },
        'Last Activity Date': {
          date: {
            start: new Date().toISOString(),
          },
        },
      },
    });

    console.log('✅ User added to gamification:', {
      name,
      email,
      referralCode,
      pageId: response.id,
    });
    
    return response;
  } catch (error) {
    console.error('❌ Error adding user:', error.message);
    throw error;
  }
}

// Example: Update user points after a share
async function updateSharePoints(email, platform) {
  const gamificationDbId = process.env.NOTION_GAMIFICATION_DATABASE_ID;
  
  try {
    // First, find the user by email
    const queryResponse = await notion.databases.query({
      database_id: gamificationDbId,
      filter: {
        property: 'Email',
        email: {
          equals: email,
        },
      },
    });

    if (queryResponse.results.length === 0) {
      console.log('User not found:', email);
      return;
    }

    const userPage = queryResponse.results[0];
    const currentSharePoints = userPage.properties['Share Points']?.number || 0;
    const currentTotalPoints = userPage.properties['Total Points']?.number || 0;
    const currentShareCount = userPage.properties['Share Count']?.number || 0;
    
    // Platform-specific share count
    const platformField = `${platform} Shares`;
    const currentPlatformShares = userPage.properties[platformField]?.number || 0;

    // Update the user's points
    await notion.pages.update({
      page_id: userPage.id,
      properties: {
        'Share Points': {
          number: currentSharePoints + 3, // 3 points per share
        },
        'Total Points': {
          number: currentTotalPoints + 3,
        },
        'Share Count': {
          number: currentShareCount + 1,
        },
        [platformField]: {
          number: currentPlatformShares + 1,
        },
        'Last Activity Date': {
          date: {
            start: new Date().toISOString(),
          },
        },
      },
    });

    console.log('✅ Share points updated:', {
      email,
      platform,
      newSharePoints: currentSharePoints + 3,
      newTotalPoints: currentTotalPoints + 3,
    });
  } catch (error) {
    console.error('❌ Error updating share points:', error.message);
    throw error;
  }
}

// Example: Get leaderboard data
async function getLeaderboard(limit = 10) {
  const gamificationDbId = process.env.NOTION_GAMIFICATION_DATABASE_ID;
  
  try {
    const response = await notion.databases.query({
      database_id: gamificationDbId,
      filter: {
        and: [
          {
            property: 'Opted Into Leaderboard',
            checkbox: {
              equals: true,
            },
          },
          {
            property: 'Profile Visibility',
            select: {
              equals: 'Public',
            },
          },
        ],
      },
      sorts: [
        {
          property: 'Total Points',
          direction: 'descending',
        },
      ],
      page_size: limit,
    });

    const leaderboard = response.results.map((page, index) => ({
      rank: index + 1,
      name: page.properties['Is Anonymous']?.checkbox 
        ? 'Anonymous' 
        : page.properties['Display Name']?.rich_text[0]?.text?.content || 'Unknown',
      points: page.properties['Total Points']?.number || 0,
      referrals: page.properties['Direct Referrals Count']?.number || 0,
    }));

    console.log('\n🏆 Leaderboard:');
    leaderboard.forEach(entry => {
      console.log(`${entry.rank}. ${entry.name} - ${entry.points} points (${entry.referrals} referrals)`);
    });

    return leaderboard;
  } catch (error) {
    console.error('❌ Error fetching leaderboard:', error.message);
    throw error;
  }
}

// Example usage
async function main() {
  console.log('🎮 Gamification Database Examples\n');

  // Example 1: Add a new user
  console.log('1️⃣ Adding a new user...');
  await addUserToGamification('test@example.com', 'Test User', 'TEST123');

  // Example 2: Update share points
  console.log('\n2️⃣ Updating share points...');
  await updateSharePoints('test@example.com', 'Facebook');

  // Example 3: Get leaderboard
  console.log('\n3️⃣ Fetching leaderboard...');
  await getLeaderboard(5);
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

// Export functions for use in other scripts
export { addUserToGamification, updateSharePoints, getLeaderboard };
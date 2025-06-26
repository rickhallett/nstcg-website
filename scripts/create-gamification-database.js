#!/usr/bin/env node

/**
 * Script to create the Gamification Profiles database in Notion
 * This creates a companion database to track user points, referrals, and achievements
 * 
 * Prerequisites:
 * 1. Install @notionhq/client: npm install @notionhq/client dotenv
 * 2. Set NOTION_TOKEN in .env file
 * 3. Set NOTION_PAGE_ID in .env file (parent page where database will be created)
 * 4. Set NOTION_DATABASE_ID in .env file (existing submissions database ID for relation)
 */

import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

async function createGamificationDatabase() {
  const parentPageId = process.env.NOTION_PAGE_ID;
  const submissionsDatabaseId = process.env.NOTION_DATABASE_ID;

  if (!parentPageId || !submissionsDatabaseId) {
    console.error('Missing required environment variables:');
    console.error('NOTION_PAGE_ID - Parent page where database will be created');
    console.error('NOTION_DATABASE_ID - Existing submissions database ID');
    process.exit(1);
  }

  try {
    console.log('Creating Gamification Profiles database...');

    const response = await notion.databases.create({
      parent: {
        type: 'page_id',
        page_id: parentPageId,
      },
      title: [
        {
          type: 'text',
          text: {
            content: 'NSTCG Gamification Profiles',
          },
        },
      ],
      description: [
        {
          type: 'text',
          text: {
            content: 'Tracks user points, referrals, and achievements for the NSTCG campaign',
          },
        },
      ],
      properties: {
        // Required title property - Notion requires exactly one title property
        'Name': {
          type: 'title',
          title: {},
        },
        
        // Primary identifier
        'Email': {
          type: 'email',
          email: {},
        },
        
        // Display fields
        'Display Name': {
          type: 'rich_text',
          rich_text: {},
        },
        'Is Anonymous': {
          type: 'checkbox',
          checkbox: {},
        },
        'Profile Visibility': {
          type: 'select',
          select: {
            options: [
              { name: 'Public', color: 'green' },
              { name: 'Private', color: 'gray' },
            ],
          },
        },
        'Opted Into Leaderboard': {
          type: 'checkbox',
          checkbox: {},
        },

        // Points tracking fields
        'Total Points': {
          type: 'number',
          number: {
            format: 'number',
          },
        },
        'Registration Points': {
          type: 'number',
          number: {
            format: 'number',
          },
        },
        'Share Points': {
          type: 'number',
          number: {
            format: 'number',
          },
        },
        'Referral Points': {
          type: 'number',
          number: {
            format: 'number',
          },
        },
        'Bonus Points': {
          type: 'number',
          number: {
            format: 'number',
          },
        },

        // Referral system fields
        'Referral Code': {
          type: 'rich_text',
          rich_text: {},
        },
        'Direct Referrals Count': {
          type: 'number',
          number: {
            format: 'number',
          },
        },
        'Indirect Referrals Count': {
          type: 'number',
          number: {
            format: 'number',
          },
        },
        'Referred By Email': {
          type: 'email',
          email: {},
        },

        // Activity tracking fields
        'Last Activity Date': {
          type: 'date',
          date: {},
        },
        'Share Count': {
          type: 'number',
          number: {
            format: 'number',
          },
        },
        'Facebook Shares': {
          type: 'number',
          number: {
            format: 'number',
          },
        },
        'Twitter Shares': {
          type: 'number',
          number: {
            format: 'number',
          },
        },
        'WhatsApp Shares': {
          type: 'number',
          number: {
            format: 'number',
          },
        },
        'Email Shares': {
          type: 'number',
          number: {
            format: 'number',
          },
        },

        // Gamification status fields
        'Rank': {
          type: 'number',
          number: {
            format: 'number',
          },
        },
        'Previous Rank': {
          type: 'number',
          number: {
            format: 'number',
          },
        },
        'Achievement Badges': {
          type: 'multi_select',
          multi_select: {
            options: [
              { name: 'Early Adopter', color: 'blue' },
              { name: 'Social Champion', color: 'green' },
              { name: 'Referral Master', color: 'yellow' },
              { name: 'Community Leader', color: 'red' },
              { name: 'Top Contributor', color: 'purple' },
            ],
          },
        },
        'Streak Days': {
          type: 'number',
          number: {
            format: 'number',
          },
        },

        // Relation to main database
        'Submission': {
          type: 'relation',
          relation: {
            database_id: submissionsDatabaseId,
            type: 'single_property',
            single_property: {},
          },
        },

        // Metadata
        'Created At': {
          type: 'created_time',
          created_time: {},
        },
        'Updated At': {
          type: 'last_edited_time',
          last_edited_time: {},
        },
      },
    });

    console.log('✅ Database created successfully!');
    console.log('Database ID:', response.id);
    console.log('Database URL:', response.url);
    
    // Save the new database ID
    console.log('\n📝 Add this to your .env file:');
    console.log(`NOTION_GAMIFICATION_DATABASE_ID=${response.id}`);
    
    return response;
  } catch (error) {
    console.error('❌ Error creating database:', error);
    throw error;
  }
}

// Helper function to generate unique referral codes
function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Function to migrate existing users to gamification database
async function migrateExistingUsers(gamificationDatabaseId) {
  console.log('\n📊 Migrating existing users...');
  
  try {
    let hasMore = true;
    let cursor = undefined;
    let totalMigrated = 0;
    const existingCodes = new Set();

    while (hasMore) {
      // Query existing submissions database
      const response = await notion.databases.query({
        database_id: process.env.NOTION_DATABASE_ID,
        start_cursor: cursor,
        page_size: 100,
      });

      // Process each submission
      for (const page of response.results) {
        const email = page.properties.Email?.email;
        const name = page.properties.Name?.rich_text[0]?.text?.content || '';
        const firstName = page.properties['First Name']?.rich_text[0]?.text?.content || '';
        const lastName = page.properties['Last Name']?.rich_text[0]?.text?.content || '';
        const timestamp = page.properties.Timestamp?.date?.start;

        if (!email) continue;

        // Generate unique referral code
        let referralCode;
        do {
          referralCode = generateReferralCode();
        } while (existingCodes.has(referralCode));
        existingCodes.add(referralCode);

        // Create gamification profile
        try {
          await notion.pages.create({
            parent: {
              database_id: gamificationDatabaseId,
            },
            properties: {
              'Name': {
                title: [
                  {
                    text: {
                      content: name || `${firstName} ${lastName}`.trim() || email,
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
                      content: firstName || name.split(' ')[0] || 'Anonymous',
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
              'Bonus Points': {
                number: 0,
              },
              'Direct Referrals Count': {
                number: 0,
              },
              'Indirect Referrals Count': {
                number: 0,
              },
              'Share Count': {
                number: 0,
              },
              'Facebook Shares': {
                number: 0,
              },
              'Twitter Shares': {
                number: 0,
              },
              'WhatsApp Shares': {
                number: 0,
              },
              'Email Shares': {
                number: 0,
              },
              'Streak Days': {
                number: 0,
              },
              'Is Anonymous': {
                checkbox: false,
              },
              'Opted Into Leaderboard': {
                checkbox: false, // Default opt-out for privacy
              },
              'Profile Visibility': {
                select: {
                  name: 'Private',
                },
              },
              'Last Activity Date': {
                date: {
                  start: timestamp || new Date().toISOString(),
                },
              },
              'Submission': {
                relation: [
                  {
                    id: page.id,
                  },
                ],
              },
            },
          });

          totalMigrated++;
          if (totalMigrated % 10 === 0) {
            console.log(`Migrated ${totalMigrated} users...`);
          }
        } catch (error) {
          console.error(`Failed to migrate user ${email}:`, error.message);
        }
      }

      hasMore = response.has_more;
      cursor = response.next_cursor;
    }

    console.log(`✅ Successfully migrated ${totalMigrated} users!`);
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    // Create the database
    const database = await createGamificationDatabase();
    
    // Ask if user wants to migrate existing data
    console.log('\n🤔 Would you like to migrate existing users? (y/n)');
    
    process.stdin.once('data', async (data) => {
      const answer = data.toString().trim().toLowerCase();
      if (answer === 'y' || answer === 'yes') {
        await migrateExistingUsers(database.id);
      }
      
      console.log('\n🎉 Setup complete!');
      console.log('\nNext steps:');
      console.log('1. Add NOTION_GAMIFICATION_DATABASE_ID to your .env file');
      console.log('2. Update API endpoints to use the new database');
      console.log('3. Test the referral code generation and points tracking');
      
      process.exit(0);
    });
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

// Run the script
main();
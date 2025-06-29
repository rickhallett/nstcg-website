#!/usr/bin/env node

/**
 * Script to create the Feature Flags database in Notion
 * This creates a database to control website features with Notion-first precedence
 * 
 * Prerequisites:
 * 1. Install @notionhq/client: npm install @notionhq/client dotenv
 * 2. Set NOTION_TOKEN in .env file
 * 3. Set NOTION_PAGE_ID in .env file (parent page where database will be created)
 */

import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

async function createFeatureFlagsDatabase() {
  const parentPageId = process.env.NOTION_PAGE_ID_FEATURE_FLAGS;

  if (!parentPageId) {
    console.error('Missing required environment variable:');
    console.error('NOTION_PAGE_ID_FEATURE_FLAGS - Parent page where database will be created');
    process.exit(1);
  }

  try {
    console.log('Creating Feature Flags database...');

    const response = await notion.databases.create({
      parent: {
        type: 'page_id',
        page_id: parentPageId,
      },
      title: [
        {
          type: 'text',
          text: {
            content: 'NSTCG Feature Flags',
          },
        },
      ],
      description: [
        {
          type: 'text',
          text: {
            content: 'Control website features with Notion-first precedence. Values: true/false/unset',
          },
        },
      ],
      properties: {
        // Primary identifier - the feature path
        'Feature Path': {
          type: 'title',
          title: {},
        },

        // The feature flag value
        'Value': {
          type: 'select',
          select: {
            options: [
              { name: 'true', color: 'green' },
              { name: 'false', color: 'red' },
              { name: 'unset', color: 'gray' },
            ],
          },
        },

        // Description of what the feature does
        'Description': {
          type: 'rich_text',
          rich_text: {},
        },

        // Category for organization
        'Category': {
          type: 'select',
          select: {
            options: [
              { name: 'donations', color: 'blue' },
              { name: 'campaignCosts', color: 'purple' },
              { name: 'leaderboard', color: 'yellow' },
              { name: 'referralScheme', color: 'pink' },
              { name: 'ui', color: 'orange' },
            ],
          },
        },

        // Default value when unset and no env var
        'Default Value': {
          type: 'select',
          select: {
            options: [
              { name: 'true', color: 'green' },
              { name: 'false', color: 'red' },
            ],
          },
        },

        // Environment variable name for reference
        'Environment Variable': {
          type: 'rich_text',
          rich_text: {},
        },

        // Additional notes or warnings
        'Notes': {
          type: 'rich_text',
          rich_text: {},
        },

        // Automatic tracking fields
        'Last Modified': {
          type: 'last_edited_time',
          last_edited_time: {},
        },

        'Modified By': {
          type: 'last_edited_by',
          last_edited_by: {},
        },
      },
    });

    console.log('✅ Database created successfully!');
    console.log('Database ID:', response.id);
    console.log('\n📝 Add this to your .env file:');
    console.log(`NOTION_FEATURE_FLAGS_DB_ID=${response.id}`);

    // Ask if user wants to populate with initial flags
    console.log('\n🤔 Do you want to populate with initial feature flags? (y/n)');

    process.stdin.once('data', async (data) => {
      const answer = data.toString().trim().toLowerCase();
      if (answer === 'y' || answer === 'yes') {
        await populateInitialFlags(response.id);
      } else {
        console.log('✅ Setup complete! You can manually add feature flags in Notion.');
      }
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error creating database:', error);
    if (error.code === 'unauthorized') {
      console.error('\n🔑 Make sure your NOTION_TOKEN has access to create databases in the specified page.');
    }
    process.exit(1);
  }
}

async function populateInitialFlags(databaseId) {
  console.log('\n📊 Populating initial feature flags...');

  const initialFlags = [
    // Donations
    {
      path: 'donations.enabled',
      value: 'unset',
      category: 'donations',
      default: 'false',
      env: 'FEATURE_DONATIONS',
      description: 'Enable donation functionality across the site',
      notes: 'Controls donate button, donation page, and Stripe integration'
    },
    {
      path: 'donations.showFinancialStatus',
      value: 'unset',
      category: 'donations',
      default: 'false',
      env: 'FEATURE_FINANCIAL_STATUS',
      description: 'Show financial status card on homepage',
      notes: 'Displays campaign costs, donations, and balance'
    },
    {
      path: 'donations.showRecentDonations',
      value: 'unset',
      category: 'donations',
      default: 'false',
      env: 'FEATURE_RECENT_DONATIONS',
      description: 'Show recent donations list on donate page'
    },
    {
      path: 'donations.showTotalDonations',
      value: 'unset',
      category: 'donations',
      default: 'false',
      env: 'FEATURE_TOTAL_DONATIONS',
      description: 'Show total donations amount in financial status'
    },

    // Campaign Costs
    {
      path: 'campaignCosts.enabled',
      value: 'unset',
      category: 'campaignCosts',
      default: 'false',
      env: 'FEATURE_CAMPAIGN_COSTS',
      description: 'Show campaign running costs'
    },
    {
      path: 'campaignCosts.showLiveCounter',
      value: 'unset',
      category: 'campaignCosts',
      default: 'false',
      env: 'FEATURE_LIVE_COUNTER',
      description: 'Show live updating cost counter'
    },
    {
      path: 'campaignCosts.showBreakdown',
      value: 'unset',
      category: 'campaignCosts',
      default: 'false',
      env: 'FEATURE_COST_BREAKDOWN',
      description: 'Show detailed cost breakdown'
    },

    // Leaderboard
    {
      path: 'leaderboard.enabled',
      value: 'unset',
      category: 'leaderboard',
      default: 'true',
      env: 'FEATURE_LEADERBOARD',
      description: 'Enable leaderboard functionality'
    },
    {
      path: 'leaderboard.showPrizePool',
      value: 'unset',
      category: 'leaderboard',
      default: 'false',
      env: 'FEATURE_PRIZE_POOL',
      description: 'Show prize pool information'
    },
    {
      path: 'leaderboard.showTopThree',
      value: 'unset',
      category: 'leaderboard',
      default: 'false',
      env: 'FEATURE_TOP_THREE',
      description: 'Show top three on homepage'
    },
    {
      path: 'leaderboard.showFullLeaderboard',
      value: 'unset',
      category: 'leaderboard',
      default: 'true',
      env: 'FEATURE_FULL_LEADERBOARD',
      description: 'Show full leaderboard page'
    },

    // Referral Scheme
    {
      path: 'referralScheme.enabled',
      value: 'unset',
      category: 'referralScheme',
      default: 'true',
      env: 'FEATURE_REFERRAL',
      description: 'Enable referral system'
    },
    {
      path: 'referralScheme.showShareButtons',
      value: 'unset',
      category: 'referralScheme',
      default: 'true',
      env: 'FEATURE_SHARE_BUTTONS',
      description: 'Show social share buttons after registration'
    },
    {
      path: 'referralScheme.trackReferrals',
      value: 'unset',
      category: 'referralScheme',
      default: 'true',
      env: 'FEATURE_TRACK_REFERRALS',
      description: 'Track and attribute referrals'
    },
    {
      path: 'referralScheme.showReferralBanner',
      value: 'unset',
      category: 'referralScheme',
      default: 'true',
      env: 'FEATURE_REFERRAL_BANNER',
      description: 'Show referral banner on homepage'
    },
    {
      path: 'referralScheme.awardReferralPoints',
      value: 'unset',
      category: 'referralScheme',
      default: 'true',
      env: 'FEATURE_REFERRAL_POINTS',
      description: 'Award points for successful referrals'
    },

    // UI Features
    {
      path: 'ui.communityActionRequired',
      value: 'unset',
      category: 'ui',
      default: 'true',
      env: 'FEATURE_COMMUNITY_ACTION_REQUIRED',
      description: 'Show "Community Action Required" alert header'
    },
    {
      path: 'ui.coloredTimer',
      value: 'unset',
      category: 'ui',
      default: 'false',
      env: 'FEATURE_COLORED_TIMER',
      description: 'Color code countdown timer based on time remaining',
      notes: 'Yellow > 24h, Amber 12-24h, Orange 1-12h, Red < 1h'
    },
    {
      path: 'ui.timerBlink',
      value: 'unset',
      category: 'ui',
      default: 'false',
      env: 'FEATURE_TIMER_BLINK',
      description: 'Make timer blink when less than 1 hour remains'
    },
  ];

  let successCount = 0;
  let failCount = 0;

  for (const flag of initialFlags) {
    try {
      await notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
          'Feature Path': {
            title: [{ text: { content: flag.path } }]
          },
          'Value': {
            select: { name: flag.value }
          },
          'Description': {
            rich_text: [{ text: { content: flag.description } }]
          },
          'Category': {
            select: { name: flag.category }
          },
          'Default Value': {
            select: { name: flag.default }
          },
          'Environment Variable': {
            rich_text: [{ text: { content: flag.env } }]
          },
          'Notes': flag.notes ? {
            rich_text: [{ text: { content: flag.notes } }]
          } : { rich_text: [] },
        },
      });
      console.log(`✅ Created: ${flag.path}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to create ${flag.path}:`, error.message);
      failCount++;
    }
  }

  console.log(`\n📊 Summary: ${successCount} created, ${failCount} failed`);
  console.log('✅ Initial feature flags populated!');
}

// Run the script
createFeatureFlagsDatabase();
#!/usr/bin/env node

/**
 * Test script to verify Notion API connection and database access
 */

import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

async function testConnection() {
  console.log('🔌 Testing Notion API connection...\n');

  // Test 1: Verify API token
  if (!process.env.NOTION_TOKEN) {
    console.error('❌ NOTION_TOKEN not found in environment variables');
    process.exit(1);
  }
  console.log('✅ NOTION_TOKEN found');

  // Test 2: Try to access the submissions database
  if (process.env.NOTION_DATABASE_ID) {
    try {
      const database = await notion.databases.retrieve({
        database_id: process.env.NOTION_DATABASE_ID,
      });
      console.log('✅ Submissions database accessible');
      console.log(`   Name: ${database.title[0]?.plain_text || 'Untitled'}`);
      console.log(`   ID: ${database.id}`);
    } catch (error) {
      console.error('❌ Failed to access submissions database:', error.message);
    }
  } else {
    console.log('⚠️  NOTION_DATABASE_ID not set');
  }

  // Test 3: Check if gamification database exists
  if (process.env.NOTION_GAMIFICATION_DATABASE_ID) {
    try {
      const database = await notion.databases.retrieve({
        database_id: process.env.NOTION_GAMIFICATION_DATABASE_ID,
      });
      console.log('✅ Gamification database accessible');
      console.log(`   Name: ${database.title[0]?.plain_text || 'Untitled'}`);
      console.log(`   ID: ${database.id}`);
      
      // Count entries
      const response = await notion.databases.query({
        database_id: process.env.NOTION_GAMIFICATION_DATABASE_ID,
        page_size: 1,
      });
      console.log(`   Entries: ${response.results.length} (showing first page only)`);
    } catch (error) {
      console.error('❌ Failed to access gamification database:', error.message);
      console.log('   Run create-gamification-database.js first');
    }
  } else {
    console.log('⚠️  NOTION_GAMIFICATION_DATABASE_ID not set');
    console.log('   Run create-gamification-database.js to create it');
  }

  // Test 4: Check parent page access
  if (process.env.NOTION_PAGE_ID) {
    try {
      const page = await notion.pages.retrieve({
        page_id: process.env.NOTION_PAGE_ID,
      });
      console.log('✅ Parent page accessible');
      console.log(`   ID: ${page.id}`);
    } catch (error) {
      console.error('❌ Failed to access parent page:', error.message);
    }
  } else {
    console.log('⚠️  NOTION_PAGE_ID not set');
    console.log('   Required for creating new databases');
  }

  console.log('\n📋 Summary:');
  console.log('- Make sure all required environment variables are set');
  console.log('- Run create-gamification-database.js to set up the gamification system');
  console.log('- Check the Notion integration has access to your workspace');
}

// Run the test
testConnection().catch(console.error);
#!/usr/bin/env node

/**
 * Test script for leaderboard API
 * Directly calls the API and logs the response structure
 */

import dotenv from 'dotenv';
import { Client } from '@notionhq/client';

dotenv.config({ path: '.env.local' });

async function testLeaderboardAPI() {
  console.log('🏆 Testing Leaderboard API\n');
  
  try {
    // Test the API endpoint
    console.log('1️⃣ Calling get-leaderboard API...');
    const response = await fetch('http://localhost:3000/api/get-leaderboard?period=all&limit=10');
    
    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText);
      const error = await response.text();
      console.error('Error details:', error);
      return;
    }
    
    const data = await response.json();
    console.log('✅ API Response received');
    console.log('   Total entries:', data.leaderboard?.length || 0);
    console.log('   Has message:', !!data.message);
    
    if (data.message) {
      console.log('   Message:', data.message);
    }
    
    // Display first 3 entries
    if (data.leaderboard && data.leaderboard.length > 0) {
      console.log('\n📊 Top 3 Leaderboard Entries:');
      data.leaderboard.slice(0, 3).forEach((entry, index) => {
        console.log(`\n${index + 1}. ${entry.name || 'UNDEFINED NAME'}`);
        console.log(`   Points: ${entry.points}`);
        console.log(`   Referrals: ${entry.referrals}`);
        console.log(`   Full entry:`, JSON.stringify(entry, null, 2));
      });
    }
    
    // Now query Notion directly to see raw data
    console.log('\n2️⃣ Querying Notion directly...');
    const notion = new Client({ auth: process.env.NOTION_TOKEN });
    
    const notionResponse = await notion.databases.query({
      database_id: process.env.NOTION_GAMIFICATION_DB_ID,
      filter: {
        property: 'Opted Into Leaderboard',
        checkbox: { equals: true }
      },
      sorts: [{
        property: 'Total Points',
        direction: 'descending'
      }],
      page_size: 3
    });
    
    console.log('✅ Notion response received');
    console.log('   Results count:', notionResponse.results.length);
    
    if (notionResponse.results.length > 0) {
      console.log('\n📋 Raw Notion Properties (First Entry):');
      const firstEntry = notionResponse.results[0];
      const props = firstEntry.properties;
      
      // Log all property names
      console.log('\nAll property names:', Object.keys(props));
      
      // Log specific properties we care about
      console.log('\nName-related properties:');
      if (props['Name']) console.log('  Name:', JSON.stringify(props['Name'], null, 2));
      if (props['Display Name']) console.log('  Display Name:', JSON.stringify(props['Display Name'], null, 2));
      if (props['First Name']) console.log('  First Name:', JSON.stringify(props['First Name'], null, 2));
      if (props['Last Name']) console.log('  Last Name:', JSON.stringify(props['Last Name'], null, 2));
      
      console.log('\nPoints and referrals:');
      if (props['Total Points']) console.log('  Total Points:', JSON.stringify(props['Total Points'], null, 2));
      if (props['Direct Referrals Count']) console.log('  Direct Referrals Count:', JSON.stringify(props['Direct Referrals Count'], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testLeaderboardAPI();
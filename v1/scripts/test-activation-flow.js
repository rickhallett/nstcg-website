#!/usr/bin/env node

/**
 * Test script for email activation flow
 * Simulates the activation process and verifies all components work correctly
 */

import dotenv from 'dotenv';
import { Client } from '@notionhq/client';

dotenv.config({ path: '.env.local' });

async function testActivation() {
  console.log('🧪 Testing Email Activation Flow\n');
  
  // Test data
  const testEmail = 'oceanheart22@gmail.com'; // Using a known email from the database
  const visitorType = 'local';
  const bonusPoints = 75;
  
  console.log('📧 Test Email:', testEmail);
  console.log('🏠 Visitor Type:', visitorType);
  console.log('🎁 Bonus Points:', bonusPoints);
  console.log('\n---\n');
  
  try {
    // Step 1: Call the activation API
    console.log('1️⃣ Calling activation API...');
    const response = await fetch('http://localhost:3001/api/activate-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail,
        visitor_type: visitorType,
        bonusPoints: bonusPoints
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ API Error:', result.error);
      return;
    }
    
    console.log('✅ API Response received');
    console.log('   User ID:', result.userData.user_id);
    console.log('   Referral Code:', result.userData.referral_code);
    console.log('   Visitor Type:', result.userData.visitor_type);
    console.log('   Bonus Points:', result.userData.bonus_points);
    console.log('   Total Points:', result.userData.total_points);
    
    // Step 2: Verify Leads database was updated
    console.log('\n2️⃣ Verifying Leads database update...');
    const notion = new Client({ auth: process.env.NOTION_TOKEN });
    
    const leadsResponse = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      filter: {
        property: 'Email',
        email: { equals: testEmail.toLowerCase() }
      }
    });
    
    if (leadsResponse.results.length > 0) {
      const lead = leadsResponse.results[0];
      const visitorTypeValue = lead.properties['Visitor Type']?.select?.name;
      const referralCode = lead.properties['Referral Code']?.rich_text?.[0]?.text?.content;
      
      console.log('✅ Leads database checked');
      console.log('   Visitor Type in DB:', visitorTypeValue || 'Not set');
      console.log('   Referral Code in DB:', referralCode || 'Not set');
    }
    
    // Step 3: Verify Gamification database
    console.log('\n3️⃣ Verifying Gamification database...');
    const gamificationResponse = await notion.databases.query({
      database_id: process.env.NOTION_GAMIFICATION_DB_ID,
      filter: {
        property: 'Email',
        email: { equals: testEmail.toLowerCase() }
      }
    });
    
    if (gamificationResponse.results.length > 0) {
      const profile = gamificationResponse.results[0];
      const totalPoints = profile.properties['Total Points']?.number;
      const bonusPointsInDB = profile.properties['Bonus Points']?.number;
      
      console.log('✅ Gamification profile found');
      console.log('   Total Points in DB:', totalPoints);
      console.log('   Bonus Points in DB:', bonusPointsInDB);
    } else {
      console.log('❌ No gamification profile found');
    }
    
    console.log('\n✨ Activation flow test completed!');
    
    // Generate test URL
    const testUrl = `http://localhost:5174/?user_email=${encodeURIComponent(testEmail)}&bonus=${bonusPoints}`;
    console.log('\n🔗 Test URL for browser:');
    console.log(testUrl);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testActivation();
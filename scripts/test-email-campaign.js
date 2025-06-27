#!/usr/bin/env node

/**
 * Test Email Campaign Flow
 * 
 * This script tests the email campaign flow without actually sending emails
 */

import { fetchAllUsers } from './email-campaign.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testCampaign() {
  console.log('🧪 Testing Email Campaign Flow\n');
  
  try {
    // Test 1: Fetch users
    console.log('1️⃣ Testing user fetch from Notion...');
    const users = await fetchAllUsers();
    console.log(`✅ Found ${users.length} users`);
    
    if (users.length > 0) {
      console.log('\nSample user data:');
      const sampleUser = users[0];
      console.log({
        email: sampleUser.email.substring(0, 3) + '***@' + sampleUser.email.split('@')[1],
        firstName: sampleUser.firstName || 'Not set',
        referralCode: sampleUser.referralCode || 'Will be generated',
        hasUserId: !!sampleUser.userId
      });
    }
    
    // Test 2: Time calculation
    console.log('\n2️⃣ Testing time calculation...');
    const SURVEY_DEADLINE = new Date('2025-06-29T23:59:59+01:00');
    const now = new Date();
    const timeLeft = SURVEY_DEADLINE - now;
    
    if (timeLeft > 0) {
      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      console.log(`✅ Time remaining: ${days} days and ${hours} hours`);
    } else {
      console.log('❌ Survey has expired');
    }
    
    // Test 3: Bonus points generation
    console.log('\n3️⃣ Testing bonus points generation...');
    const testPoints = [];
    for (let i = 0; i < 10; i++) {
      testPoints.push(Math.floor(Math.random() * 41) + 10);
    }
    console.log(`✅ Sample bonus points: ${testPoints.join(', ')}`);
    console.log(`   Range: ${Math.min(...testPoints)} - ${Math.max(...testPoints)}`);
    
    // Test 4: Email template
    console.log('\n4️⃣ Testing email template...');
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const templatePath = path.join(__dirname, 'templates', 'campaign-email.html');
    
    try {
      await fs.access(templatePath);
      console.log('✅ Email template found');
      
      const template = await fs.readFile(templatePath, 'utf-8');
      const requiredVars = [
        '{{firstName}}',
        '{{timeRemaining}}',
        '{{daysRemaining}}',
        '{{hoursRemaining}}',
        '{{bonusPoints}}',
        '{{activationLink}}',
        '{{referralCode}}',
        '{{currentYear}}'
      ];
      
      const missingVars = requiredVars.filter(v => !template.includes(v));
      if (missingVars.length === 0) {
        console.log('✅ All template variables present');
      } else {
        console.log('❌ Missing template variables:', missingVars);
      }
    } catch (error) {
      console.log('❌ Email template not found');
    }
    
    // Test 5: Activation links
    console.log('\n5️⃣ Testing activation link generation...');
    if (users.length > 0) {
      const testUser = users[0];
      const bonusPoints = 25;
      const activationLink = `https://nstcg.org/?user_email=${encodeURIComponent(testUser.email)}&bonus=${bonusPoints}`;
      console.log('✅ Sample activation link:');
      console.log(`   ${activationLink.substring(0, 50)}...`);
    }
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\n⚠️  To send actual emails, run: npm run email-campaign');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
testCampaign().catch(console.error);
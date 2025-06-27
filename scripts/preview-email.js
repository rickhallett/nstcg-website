#!/usr/bin/env node

/**
 * Preview Email Template
 * 
 * Generates a preview of the email that will be sent
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function previewEmail() {
  console.log('📧 Email Preview\n');
  
  // Load template
  const templatePath = path.join(__dirname, 'templates', 'campaign-email.html');
  let template = await fs.readFile(templatePath, 'utf-8');
  
  // Sample data
  const sampleData = {
    firstName: 'John',
    email: 'john.doe@example.com',
    daysRemaining: 2,
    hoursRemaining: 13,
    bonusPoints: 35,
    referralCode: 'JOH7X9K2'
  };
  
  // Calculate time remaining
  const timeRemaining = `${sampleData.daysRemaining} days and ${sampleData.hoursRemaining} hours`;
  
  // Replace variables
  const replacements = {
    '{{firstName}}': sampleData.firstName,
    '{{timeRemaining}}': timeRemaining,
    '{{daysRemaining}}': sampleData.daysRemaining,
    '{{hoursRemaining}}': sampleData.hoursRemaining,
    '{{bonusPoints}}': sampleData.bonusPoints,
    '{{activationLink}}': `https://nstcg.org/?user_email=${encodeURIComponent(sampleData.email)}&bonus=${sampleData.bonusPoints}`,
    '{{referralCode}}': sampleData.referralCode,
    '{{email}}': sampleData.email,
    '{{currentYear}}': new Date().getFullYear()
  };
  
  for (const [key, value] of Object.entries(replacements)) {
    template = template.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
  }
  
  // Save preview
  const previewPath = path.join(__dirname, 'email-preview.html');
  await fs.writeFile(previewPath, template);
  
  console.log('✅ Email preview generated: scripts/email-preview.html');
  console.log('\n📋 Sample Data Used:');
  console.log(`   Name: ${sampleData.firstName}`);
  console.log(`   Email: ${sampleData.email}`);
  console.log(`   Time Remaining: ${timeRemaining}`);
  console.log(`   Bonus Points: ${sampleData.bonusPoints}`);
  console.log(`   Referral Code: ${sampleData.referralCode}`);
  console.log('\n🔗 Activation Link:');
  console.log(`   https://nstcg.org/?user_email=${encodeURIComponent(sampleData.email)}&bonus=${sampleData.bonusPoints}`);
  console.log('\n💡 Open scripts/email-preview.html in a browser to see the email');
}

previewEmail().catch(console.error);
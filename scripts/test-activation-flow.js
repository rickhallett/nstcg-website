#!/usr/bin/env node

/**
 * Test script to verify the email activation flow
 * 
 * This generates test URLs that simulate clicking an email link
 */

const testUsers = [
  { email: 'test1@example.com', bonus: 25 },
  { email: 'test.user+special@example.com', bonus: 40 },
  { email: 'user@subdomain.example.com', bonus: 15 },
];

console.log('Email Activation Test URLs\n');
console.log('Use these URLs to test the activation flow:\n');

const baseUrl = process.argv[2] || 'http://localhost:3000';

testUsers.forEach((user, index) => {
  const encodedEmail = encodeURIComponent(user.email);
  const activationUrl = `${baseUrl}/?user_email=${encodedEmail}&bonus=${user.bonus}`;
  
  console.log(`Test ${index + 1}:`);
  console.log(`Email: ${user.email}`);
  console.log(`Bonus: ${user.bonus} points`);
  console.log(`URL: ${activationUrl}`);
  console.log('');
});

console.log('To test:');
console.log('1. Start local server: vercel dev');
console.log('2. Click one of the URLs above');
console.log('3. Verify modal appears with correct bonus points');
console.log('4. Select visitor type and submit');
console.log('5. Check that activation completes successfully');
console.log('\nNote: These test emails should exist in your Notion database');
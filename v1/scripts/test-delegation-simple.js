#!/usr/bin/env node

/**
 * Simple Domain-Wide Delegation Test
 * Tests only what's needed for email sending
 */

import { google } from 'googleapis';

async function testDelegation() {
  console.log('🔧 Simple Domain-Wide Delegation Test\n');
  
  try {
    console.log('Service Account:', 'nstcg-email-sender@nstcg-org.iam.gserviceaccount.com');
    console.log('Client ID:', '116861682133988247799');
    console.log('Testing with scope:', 'https://mail.google.com/');
    
    const testUsers = ['engineering@nstcg.org', 'noreply@nstcg.org'];
    
    for (const user of testUsers) {
      console.log(`\n📧 Testing delegation to: ${user}`);
      
      try {
        const auth = new google.auth.GoogleAuth({
          keyFile: './gmail-service-account.json',
          scopes: ['https://mail.google.com/'],
          subject: user
        });
        
        const authClient = await auth.getClient();
        console.log('  ✓ Auth client created');
        
        const gmail = google.gmail({ version: 'v1', auth: authClient });
        const profile = await gmail.users.getProfile({ userId: 'me' });
        
        console.log('  ✅ SUCCESS! Domain delegation working!');
        console.log(`  ✓ Authorized as: ${profile.data.emailAddress}`);
        console.log(`  ✓ Ready to send emails`);
        
        // Test successful - exit
        process.exit(0);
        
      } catch (error) {
        console.log('  ❌ Failed');
        console.log(`  Error: ${error.message} (${error.code})`);
        
        if (error.code === 400) {
          console.log('  → This user might not exist or delegation not configured');
        } else if (error.code === 403) {
          console.log('  → Domain delegation not configured or wrong scopes');
        }
      }
    }
    
    console.log('\n❌ Domain-wide delegation is not working yet');
    console.log('\n🔧 Next steps:');
    console.log('1. Go to Google Workspace Admin Console');
    console.log('2. Security → API controls → Domain-wide delegation');
    console.log('3. Remove existing entry for Client ID: 116861682133988247799');
    console.log('4. Wait 2 minutes');
    console.log('5. Add new entry with:');
    console.log('   Client ID: 116861682133988247799');
    console.log('   OAuth Scopes: https://mail.google.com/');
    console.log('6. Wait 5 minutes and run this test again');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDelegation();

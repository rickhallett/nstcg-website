import { google } from 'googleapis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test Gmail API Authentication using Application Default Credentials (ADC)
 * 
 * For local development:
 * 1. Install gcloud CLI: https://cloud.google.com/sdk/docs/install
 * 2. Run: gcloud auth application-default login --scopes=https://www.googleapis.com/auth/gmail.send
 * 
 * For production:
 * 1. Create a service account in Google Cloud Console
 * 2. Download the JSON key file
 * 3. Set GOOGLE_APPLICATION_CREDENTIALS environment variable to the path of the JSON file
 */
async function testGmailAuth() {
  console.log('🔐 Testing Gmail API Authentication...\n');

  try {
    // Initialize auth with Gmail send scope
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/gmail.send'],
    });

    // Get the authenticated client
    const authClient = await auth.getClient();
    console.log('✅ Authentication client created successfully');
    
    // Get project ID (if available)
    try {
      const projectId = await auth.getProjectId();
      console.log(`✅ Project ID: ${projectId}`);
    } catch (error) {
      console.log('ℹ️  Project ID not available (normal for user credentials)');
    }

    // Initialize Gmail API
    const gmail = google.gmail({ version: 'v1', auth: authClient });
    console.log('✅ Gmail API v1 initialized');

    // Test API access by getting user profile
    // Note: This will fail with service account auth, but succeed with user auth
    try {
      const profile = await gmail.users.getProfile({ userId: 'me' });
      console.log('✅ Gmail API access verified');
      console.log(`   Email: ${profile.data.emailAddress}`);
      console.log(`   Messages Total: ${profile.data.messagesTotal}`);
    } catch (error) {
      if (error.code === 400 && error.message.includes('delegation')) {
        console.log('ℹ️  Service account detected - profile access not available');
        console.log('   This is normal for service accounts');
      } else {
        console.log('⚠️  Could not fetch user profile:', error.message);
        console.log('   This might be normal depending on auth method');
      }
    }

    // Create a test email message (without sending)
    const testEmail = createTestEmailMessage('test@example.com');
    console.log('\n✅ Test email message created successfully');
    console.log(`   Size: ${testEmail.length} characters`);

    console.log('\n🎉 Gmail API authentication test complete!');
    console.log('\nNext steps:');
    console.log('1. For local development, ensure you have run:');
    console.log('   gcloud auth application-default login --scopes=https://www.googleapis.com/auth/gmail.send');
    console.log('2. For production, set GOOGLE_APPLICATION_CREDENTIALS to your service account key path');
    console.log('3. Enable Gmail API in Google Cloud Console');
    console.log('4. For sending from custom domain (info@nstcg.org), configure domain verification');

  } catch (error) {
    console.error('\n❌ Authentication test failed:', error.message);
    
    if (error.message.includes('Could not load the default credentials')) {
      console.error('\nTo fix this:');
      console.error('1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install');
      console.error('2. Run: gcloud auth application-default login --scopes=https://www.googleapis.com/auth/gmail.send');
      console.error('3. Or set GOOGLE_APPLICATION_CREDENTIALS to a service account key file');
    } else if (error.message.includes('Gmail API has not been used')) {
      console.error('\nTo fix this:');
      console.error('1. Go to https://console.cloud.google.com/apis/library');
      console.error('2. Search for "Gmail API"');
      console.error('3. Click "Enable"');
    }
  }
}

/**
 * Create a test email message in RFC822 format
 */
function createTestEmailMessage(to) {
  const message = [
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    'From: Test Sender <test@example.com>',
    `To: ${to}`,
    'Subject: Test Email - DO NOT SEND',
    '',
    'This is a test email message.',
    'It should not be sent.',
  ].join('\n');

  // Encode to base64
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return encodedMessage;
}

// Run the test
testGmailAuth();
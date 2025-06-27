import { google } from 'googleapis';
import { compileActivationEmail } from './compile-email.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test sending an actual email using Gmail API
 * 
 * IMPORTANT: This will send a real email!
 * Only run this after proper authentication is set up.
 */
async function testSendEmail() {
  // Test recipient - change this to your email for testing
  const TEST_RECIPIENT = process.argv[2];
  
  if (!TEST_RECIPIENT) {
    console.error('❌ Please provide a test email address as argument');
    console.error('Usage: node test-send-email.js your-email@example.com');
    process.exit(1);
  }

  console.log(`📧 Testing email send to: ${TEST_RECIPIENT}\n`);

  try {
    // Initialize auth
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/gmail.send'],
    });

    const authClient = await auth.getClient();
    const gmail = google.gmail({ version: 'v1', auth: authClient });

    // Compile the email template
    console.log('🔨 Compiling email template...');
    const bonusPoints = 25; // Test with 25 points
    const htmlContent = compileActivationEmail(TEST_RECIPIENT, bonusPoints);
    console.log('✅ Email template compiled successfully');

    // Create email message
    const subject = `⏰ TEST: Activate Your Account & Claim ${bonusPoints} Points!`;
    const message = [
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `From: North Swanage Traffic Concern Group <info@nstcg.org>`,
      `To: ${TEST_RECIPIENT}`,
      `Subject: ${subject}`,
      '',
      htmlContent
    ].join('\n');

    // Encode message
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    console.log('📤 Sending email...');
    
    // Send email
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log('✅ Email sent successfully!');
    console.log(`   Message ID: ${result.data.id}`);
    console.log(`   Thread ID: ${result.data.threadId}`);
    console.log('\n🎉 Email test complete! Check your inbox.');

  } catch (error) {
    console.error('\n❌ Email send failed:', error.message);
    
    if (error.code === 403) {
      console.error('\nThis might be due to:');
      console.error('1. Gmail API not enabled in your project');
      console.error('2. Insufficient permissions in auth scope');
      console.error('3. Domain not verified for custom "From" address');
    } else if (error.message.includes('invalid_grant')) {
      console.error('\nAuthentication issue detected. Please run:');
      console.error('gcloud auth application-default login --scopes=https://www.googleapis.com/auth/gmail.send');
    }
    
    console.error('\nFull error:', error);
  }
}

// Run the test
testSendEmail();
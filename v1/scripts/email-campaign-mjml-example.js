import { compileActivationEmail } from './compile-email.js';
import { google } from 'googleapis';

/**
 * Example integration with Gmail API using MJML template
 */
async function sendActivationEmailMJML(userEmail, bonusPoints = 75) {
  try {
    // Compile MJML template to HTML
    const htmlContent = compileActivationEmail(userEmail, bonusPoints);

    // Set up Gmail API (same as your existing setup)
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/gmail.send'],
    });

    const gmail = google.gmail({ version: 'v1', auth });

    // Create email message
    const subject = `⏰ TIME RUNNING OUT: Activate Your Account & Claim ${bonusPoints} Points!`;
    const message = [
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `From: North Swanage Traffic Concern Group <info@nstcg.org>`,
      `To: ${userEmail}`,
      `Subject: ${subject}`,
      '',
      htmlContent
    ].join('\n');

    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // Send email
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log(`✅ Email sent to ${userEmail} (Message ID: ${result.data.id})`);
    return result;

  } catch (error) {
    console.error(`❌ Failed to send email to ${userEmail}:`, error.message);
    throw error;
  }
}

/**
 * Send activation emails to multiple users with rate limiting
 */
async function sendBulkActivationEmails(users) {
  console.log(`🚀 Starting bulk email campaign for ${users.length} users...\n`);

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const bonusPoints = 75; // Static 75 points for all users

    try {
      await sendActivationEmailMJML(user.email, bonusPoints);
      console.log(`Progress: ${i + 1}/${users.length} emails sent`);

      // Rate limiting: 1 second delay between emails
      if (i < users.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error(`Failed to send to ${user.email}:`, error.message);
      // Continue with next user
    }
  }

  console.log('\n🎉 Bulk email campaign completed!');
}

// Example usage
const sampleUsers = [
  { email: 'user1@example.com' },
  { email: 'user2@example.com' },
  // Add your actual user list here
];

// Uncomment to run:
// sendBulkActivationEmails(sampleUsers);

export { sendActivationEmailMJML, sendBulkActivationEmails }; 
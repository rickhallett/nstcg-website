#!/usr/bin/env node

/**
 * Gmail API Authentication Setup
 * 
 * Guide for setting up Gmail API authentication for the email campaign
 */

import chalk from 'chalk';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

console.log(chalk.bold.blue('📧 Gmail API Authentication Setup\n'));

// Check current authentication status
async function checkAuthStatus() {
  console.log(chalk.bold('Current Authentication Status:\n'));
  
  // Check for service account key
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (serviceAccountPath) {
    try {
      await fs.access(serviceAccountPath);
      console.log(chalk.green('✓'), 'Service account key found:', serviceAccountPath);
    } catch {
      console.log(chalk.red('✗'), 'Service account key not found at:', serviceAccountPath);
    }
  } else {
    console.log(chalk.yellow('⚠'), 'GOOGLE_APPLICATION_CREDENTIALS not set');
  }
  
  // Check for ADC
  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/gmail.send']
    });
    
    const authClient = await auth.getClient();
    const projectId = await auth.getProjectId();
    
    console.log(chalk.green('✓'), 'Google Auth client initialized');
    console.log(chalk.gray('  Project ID:'), projectId || 'Not set');
    console.log(chalk.gray('  Auth type:'), authClient.constructor.name);
    
    // Try to verify Gmail access
    try {
      const gmail = google.gmail({ version: 'v1', auth: authClient });
      const profile = await gmail.users.getProfile({ userId: 'me' });
      console.log(chalk.green('✓'), 'Gmail API access verified');
      console.log(chalk.gray('  Email:'), profile.data.emailAddress);
      return true;
    } catch (error) {
      console.log(chalk.red('✗'), 'Gmail API access failed:', error.message);
      return false;
    }
  } catch (error) {
    console.log(chalk.red('✗'), 'Google Auth initialization failed:', error.message);
    return false;
  }
}

// Display setup instructions
function displaySetupInstructions() {
  console.log(chalk.bold('\n📋 Gmail API Setup Instructions:\n'));
  
  console.log(chalk.bold.cyan('Option 1: Application Default Credentials (Recommended for Development)'));
  console.log(chalk.gray('This is the easiest method for local development:\n'));
  
  console.log('1. Install Google Cloud SDK:');
  console.log(chalk.gray('   brew install google-cloud-sdk  # macOS'));
  console.log(chalk.gray('   Or download from: https://cloud.google.com/sdk/docs/install\n'));
  
  console.log('2. Authenticate with your Google account:');
  console.log(chalk.yellow('   gcloud auth application-default login --scopes=https://www.googleapis.com/auth/gmail.send\n'));
  
  console.log('3. Enable Gmail API in your project:');
  console.log(chalk.yellow('   gcloud services enable gmail.googleapis.com\n'));
  
  console.log(chalk.bold.cyan('\nOption 2: Service Account (Required for Production)'));
  console.log(chalk.gray('Use this method for Vercel deployment:\n'));
  
  console.log('1. Create a service account in Google Cloud Console:');
  console.log(chalk.gray('   - Go to: https://console.cloud.google.com/iam-admin/serviceaccounts'));
  console.log(chalk.gray('   - Click "Create Service Account"'));
  console.log(chalk.gray('   - Name: "nstcg-email-sender"'));
  console.log(chalk.gray('   - Grant role: "Service Account User"\n'));
  
  console.log('2. Create and download JSON key:');
  console.log(chalk.gray('   - Click on the service account'));
  console.log(chalk.gray('   - Go to "Keys" tab'));
  console.log(chalk.gray('   - Add Key → Create new key → JSON'));
  console.log(chalk.gray('   - Save as: gmail-service-account.json\n'));
  
  console.log('3. Enable Gmail API and configure domain-wide delegation:');
  console.log(chalk.gray('   - Enable Gmail API in Google Cloud Console'));
  console.log(chalk.gray('   - In Google Workspace Admin: Security → API controls'));
  console.log(chalk.gray('   - Add client ID with scope: https://www.googleapis.com/auth/gmail.send\n'));
  
  console.log('4. Set environment variable:');
  console.log(chalk.yellow('   export GOOGLE_APPLICATION_CREDENTIALS="./gmail-service-account.json"\n'));
  
  console.log(chalk.bold.cyan('\nOption 3: OAuth2 (Alternative)'));
  console.log(chalk.gray('For user-authorized access:\n'));
  
  console.log('1. Create OAuth2 credentials in Google Cloud Console');
  console.log('2. Download credentials.json');
  console.log('3. Run the OAuth2 flow to get refresh token');
  console.log('4. Store tokens securely\n');
}

// Test email sending
async function testEmailSending() {
  console.log(chalk.bold('\n🧪 Testing Email Sending...\n'));
  
  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/gmail.send']
    });
    
    const authClient = await auth.getClient();
    const gmail = google.gmail({ version: 'v1', auth: authClient });
    
    // Create test email
    const testEmail = {
      to: process.env.TEST_EMAIL || 'test@example.com',
      subject: 'NSTCG Campaign Test Email',
      html: '<h1>Test Email</h1><p>This is a test email from the NSTCG campaign system.</p>'
    };
    
    // Encode email
    const message = [
      `To: ${testEmail.to}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${testEmail.subject}`,
      '',
      testEmail.html
    ].join('\n');
    
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    if (process.argv.includes('--send')) {
      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });
      
      console.log(chalk.green('✓'), 'Test email sent successfully!');
      console.log(chalk.gray('  Message ID:'), result.data.id);
    } else {
      console.log(chalk.yellow('⚠'), 'Test email prepared but not sent');
      console.log(chalk.gray('  Run with --send flag to actually send the test email'));
      console.log(chalk.gray('  Email would be sent to:'), testEmail.to);
    }
    
  } catch (error) {
    console.log(chalk.red('✗'), 'Email sending failed:', error.message);
    console.log(chalk.gray('\nCommon issues:'));
    console.log(chalk.gray('- Gmail API not enabled in your project'));
    console.log(chalk.gray('- Insufficient scopes (need gmail.send)'));
    console.log(chalk.gray('- Service account needs domain-wide delegation'));
  }
}

// Create environment template
async function createEnvTemplate() {
  const envTemplate = `# Gmail API Configuration
GOOGLE_APPLICATION_CREDENTIALS=./gmail-service-account.json

# For service account impersonation (if using domain-wide delegation)
GMAIL_SENDER_EMAIL=noreply@nstcg.org

# Test email for verification
TEST_EMAIL=your-email@example.com
`;
  
  const envPath = path.join(__dirname, '.env.gmail');
  await fs.writeFile(envPath, envTemplate);
  
  console.log(chalk.green('\n✓'), 'Created .env.gmail template at:', envPath);
}

// Main setup flow
async function main() {
  // Check current status
  const isConfigured = await checkAuthStatus();
  
  if (!isConfigured) {
    displaySetupInstructions();
    
    // Create template files
    if (process.argv.includes('--init')) {
      await createEnvTemplate();
      
      console.log(chalk.bold.yellow('\n⚡ Quick Start:'));
      console.log('1. Follow one of the authentication options above');
      console.log('2. Update .env.gmail with your settings');
      console.log('3. Run this script again to verify setup');
    }
  } else {
    console.log(chalk.green.bold('\n✅ Gmail API is configured and ready!'));
    
    // Offer to test
    await testEmailSending();
  }
  
  // Additional production notes
  if (process.argv.includes('--production')) {
    console.log(chalk.bold.blue('\n🚀 Production Deployment Notes:\n'));
    
    console.log('1. Vercel Environment Variables:');
    console.log(chalk.gray('   - Add GOOGLE_APPLICATION_CREDENTIALS_JSON with the full JSON content'));
    console.log(chalk.gray('   - The deployment script will create the file from this variable\n'));
    
    console.log('2. Domain Verification:');
    console.log(chalk.gray('   - Add SPF record: "v=spf1 include:_spf.google.com ~all"'));
    console.log(chalk.gray('   - Add DKIM record from Google Workspace admin'));
    console.log(chalk.gray('   - Verify domain ownership in Google Search Console\n'));
    
    console.log('3. Email Best Practices:');
    console.log(chalk.gray('   - Use consistent "From" address'));
    console.log(chalk.gray('   - Include unsubscribe link'));
    console.log(chalk.gray('   - Test with small batches first'));
    console.log(chalk.gray('   - Monitor bounce rates'));
  }
}

// Run setup
main().catch(error => {
  console.error(chalk.red('\n❌ Setup failed:'), error.message);
  process.exit(1);
});
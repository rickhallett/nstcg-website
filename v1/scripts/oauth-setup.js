#!/usr/bin/env node

/**
 * OAuth2 Setup Script for Gmail API
 * 
 * Run this ONCE to get a refresh token that allows the email campaign
 * to send emails without re-authenticating every time.
 */

import { google } from 'googleapis';
import fs from 'fs/promises';
import open from 'open';
import readline from 'readline';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function setupOAuth2() {
  console.log(chalk.bold.blue('🔐 Gmail OAuth2 Setup\n'));

  // Validate environment variables
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error(chalk.red('❌ Missing required environment variables:'));
    console.error(chalk.red('   GOOGLE_CLIENT_ID'));
    console.error(chalk.red('   GOOGLE_CLIENT_SECRET'));
    console.error(chalk.yellow('\n💡 Add these to your .env file'));
    process.exit(1);
  }

  try {
    const oauth2Client = new google.auth.OAuth2({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI
    });

    // Generate authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Gets refresh token
      scope: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly' // For testing
      ],
      prompt: 'consent' // Forces refresh token generation
    });

    console.log(chalk.bold('📋 Steps to authorize:'));
    console.log('1. A browser window will open');
    console.log('2. Sign in as noreply@nstcg.org');
    console.log('3. Grant permissions');
    console.log('4. Copy the authorization code\n');

    console.log(chalk.cyan('🔗 Opening browser for authorization...'));
    await open(authUrl);

    const code = await new Promise(resolve => {
      rl.question(chalk.bold('📋 Paste the authorization code here: '), resolve);
    });

    console.log(chalk.gray('\n⏳ Exchanging code for tokens...'));

    const { tokens } = await oauth2Client.getToken(code.trim());

    // Save tokens to file
    await fs.writeFile('gmail-tokens.json', JSON.stringify(tokens, null, 2));

    console.log(chalk.green('✅ Tokens saved to gmail-tokens.json'));
    console.log(chalk.bold('\n🎉 Setup complete!'));
    console.log(chalk.gray('You can now run your email campaign without re-authenticating.'));

    // Test the tokens
    console.log(chalk.cyan('\n🧪 Testing authentication...'));
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const profile = await gmail.users.getProfile({ userId: 'me' });
    console.log(chalk.green(`✅ Authentication successful for: ${profile.data.emailAddress}`));

  } catch (error) {
    console.error(chalk.red('❌ Setup failed:'), error.message);

    if (error.code === 'invalid_grant') {
      console.error(chalk.yellow('💡 The authorization code may have expired. Please try again.'));
    } else if (error.message.includes('redirect_uri_mismatch')) {
      console.error(chalk.yellow('💡 Make sure your OAuth2 client is configured for "Desktop application"'));
    }

    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n⚠️  Setup interrupted'));
  rl.close();
  process.exit(0);
});

setupOAuth2().catch(console.error); 
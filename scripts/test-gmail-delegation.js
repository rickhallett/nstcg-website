#!/usr/bin/env node

/**
 * Gmail Domain-Wide Delegation Test Script
 * 
 * This script helps test and troubleshoot Gmail API access with domain-wide delegation
 */

import { google } from 'googleapis';
import fs from 'fs/promises';
import chalk from 'chalk';

async function testDomainWideDelegation() {
  console.log(chalk.bold.blue('🔐 Gmail Domain-Wide Delegation Test\n'));
  
  try {
    // Read service account credentials
    const credentialsPath = './gmail-service-account.json';
    const credentialsContent = await fs.readFile(credentialsPath, 'utf8');
    const credentials = JSON.parse(credentialsContent);
    
    console.log(chalk.bold('📋 Service Account Details:'));
    console.log(`  Email: ${credentials.client_email}`);
    console.log(`  Client ID: ${credentials.client_id}`);
    console.log(`  Project: ${credentials.project_id}\n`);
    
    // Test different configurations
    const testConfigs = [
      {
        name: 'With domain-wide delegation (noreply@nstcg.org)',
        subject: 'noreply@nstcg.org',
        scopes: ['https://www.googleapis.com/auth/gmail.send']
      },
      {
        name: 'With gmail.readonly scope',
        subject: 'noreply@nstcg.org',
        scopes: ['https://www.googleapis.com/auth/gmail.readonly']
      },
      {
        name: 'Without subject (service account only)',
        subject: null,
        scopes: ['https://www.googleapis.com/auth/gmail.send']
      }
    ];
    
    for (const config of testConfigs) {
      console.log(chalk.bold(`🧪 Testing: ${config.name}`));
      
      try {
        const authConfig = {
          credentials: credentials,
          scopes: config.scopes
        };
        
        if (config.subject) {
          authConfig.subject = config.subject;
        }
        
        const auth = new google.auth.GoogleAuth(authConfig);
        const authClient = await auth.getClient();
        
        console.log(chalk.green('  ✓ Auth client created'));
        
        const gmail = google.gmail({ version: 'v1', auth: authClient });
        const profile = await gmail.users.getProfile({ userId: 'me' });
        
        console.log(chalk.green('  ✓ Gmail API access successful'));
        console.log(chalk.gray(`    Authorized email: ${profile.data.emailAddress}`));
        console.log(chalk.gray(`    Messages total: ${profile.data.messagesTotal || 'N/A'}\n`));
        
      } catch (error) {
        console.log(chalk.red('  ✗ Failed'));
        console.log(chalk.gray(`    Error: ${error.message}`));
        
        if (error.code === 403) {
          if (error.message.includes('insufficient authentication scopes')) {
            console.log(chalk.yellow('    → Domain-wide delegation not configured or incorrect scopes'));
          } else if (error.message.includes('forbidden')) {
            console.log(chalk.yellow('    → API may not be enabled or access denied'));
          }
        } else if (error.code === 400) {
          console.log(chalk.yellow('    → Bad request - check subject email or credentials'));
        }
        console.log('');
      }
    }
    
    // Provide setup instructions
    console.log(chalk.bold.yellow('📝 Domain-Wide Delegation Setup Instructions:'));
    console.log('');
    console.log('1. Go to Google Workspace Admin Console:');
    console.log(chalk.cyan('   https://admin.google.com'));
    console.log('');
    console.log('2. Navigate to:');
    console.log(chalk.cyan('   Security → API controls → Domain-wide delegation'));
    console.log('');
    console.log('3. Click "Add new" and enter:');
    console.log(chalk.cyan(`   Client ID: ${credentials.client_id}`));
    console.log(chalk.cyan('   OAuth scopes: https://www.googleapis.com/auth/gmail.send'));
    console.log('');
    console.log('4. Make sure the email account exists:');
    console.log(chalk.cyan('   noreply@nstcg.org'));
    console.log('');
    console.log('5. Wait 5-10 minutes for changes to propagate');
    console.log('');
    console.log(chalk.bold('🔄 Run this script again after setup to verify!'));
    
  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error.message);
  }
}

// Run the test
testDomainWideDelegation().catch(console.error);

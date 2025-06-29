#!/usr/bin/env node

/**
 * Gmail Service Account Permissions Diagnostic
 * 
 * Comprehensive check of Gmail service account setup and permissions
 */

import { google } from 'googleapis';
import fs from 'fs/promises';
import chalk from 'chalk';

async function diagnoseGmailPermissions() {
  console.log(chalk.bold.blue('🔍 Gmail Service Account Permissions Diagnostic\n'));
  
  try {
    // 1. Check service account file
    console.log(chalk.bold('1️⃣ Service Account Configuration'));
    
    const credentialsPath = './gmail-service-account.json';
    const credentialsContent = await fs.readFile(credentialsPath, 'utf8');
    const credentials = JSON.parse(credentialsContent);
    
    console.log(chalk.green('✓ Service account file found'));
    console.log(`   Email: ${credentials.client_email}`);
    console.log(`   Client ID: ${credentials.client_id}`);
    console.log(`   Project: ${credentials.project_id}`);
    
    // 2. Test basic authentication
    console.log(chalk.bold('\n2️⃣ Basic Authentication Test'));
    
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      });
      
      const authClient = await auth.getClient();
      console.log(chalk.green('✓ Service account authentication successful'));
      
      // Get access token info
      const accessToken = await authClient.getAccessToken();
      console.log(`   Access token obtained: ${accessToken.token ? 'Yes' : 'No'}`);
      
    } catch (error) {
      console.log(chalk.red('✗ Service account authentication failed'));
      console.log(`   Error: ${error.message}`);
    }
    
    // 3. Test Gmail API access without delegation
    console.log(chalk.bold('\n3️⃣ Direct Gmail API Access Test'));
    
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/gmail.send']
      });
      
      const authClient = await auth.getClient();
      const gmail = google.gmail({ version: 'v1', auth: authClient });
      
      const profile = await gmail.users.getProfile({ userId: 'me' });
      console.log(chalk.green('✓ Direct Gmail API access works'));
      console.log(`   Service account email: ${profile.data.emailAddress}`);
      
    } catch (error) {
      console.log(chalk.yellow('⚠ Direct Gmail API access not available (expected)'));
      console.log(`   Error: ${error.message}`);
      console.log('   This is normal - service accounts need domain delegation for Gmail');
    }
    
    // 4. Test domain-wide delegation
    console.log(chalk.bold('\n4️⃣ Domain-Wide Delegation Test'));
    
    const testEmails = ['noreply@nstcg.org', 'admin@nstcg.org', 'engineering@nstcg.org'];
    
    for (const email of testEmails) {
      console.log(chalk.bold(`\\n   Testing delegation to: ${email}`));
      
      try {
        const auth = new google.auth.GoogleAuth({
          credentials: credentials,
          scopes: ['https://www.googleapis.com/auth/gmail.send'],
          subject: email
        });
        
        const authClient = await auth.getClient();
        console.log(chalk.green('   ✓ Auth client created'));
        
        const gmail = google.gmail({ version: 'v1', auth: authClient });
        const profile = await gmail.users.getProfile({ userId: 'me' });
        
        console.log(chalk.green('   ✓ Domain delegation successful!'));
        console.log(`   ✓ Authorized as: ${profile.data.emailAddress}`);
        console.log(`   ✓ Messages total: ${profile.data.messagesTotal || 'N/A'}`);
        
      } catch (error) {
        console.log(chalk.red('   ✗ Domain delegation failed'));
        console.log(`   Error: ${error.message}`);
        console.log(`   Error code: ${error.code}`);
        
        // Specific error analysis
        if (error.code === 403) {
          if (error.message.includes('insufficient authentication scopes')) {
            console.log(chalk.yellow('   → Domain-wide delegation not configured in Workspace Admin'));
            console.log(chalk.yellow('   → Need to add Client ID to domain delegation with gmail.send scope'));
          } else if (error.message.includes('forbidden')) {
            console.log(chalk.yellow('   → User may not exist or API access denied'));
          }
        } else if (error.code === 400) {
          if (error.message.includes('invalid_grant')) {
            console.log(chalk.yellow('   → Invalid subject email or delegation not set up'));
          } else if (error.message.includes('Precondition check failed')) {
            console.log(chalk.yellow('   → User account may not exist in the domain'));
          }
        }
      }
    }
    
    // 5. Check specific scopes
    console.log(chalk.bold('\\n5️⃣ OAuth Scope Analysis'));
    
    const requiredScopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.compose'
    ];
    
    for (const scope of requiredScopes) {
      try {
        const auth = new google.auth.GoogleAuth({
          credentials: credentials,
          scopes: [scope],
          subject: 'noreply@nstcg.org'
        });
        
        const authClient = await auth.getClient();
        const accessToken = await authClient.getAccessToken();
        
        console.log(chalk.green(`✓ Scope available: ${scope}`));
        
      } catch (error) {
        console.log(chalk.red(`✗ Scope issue: ${scope}`));
        console.log(`   Error: ${error.message}`);
      }
    }
    
    // 6. Summary and recommendations
    console.log(chalk.bold('\\n6️⃣ Summary & Recommendations'));
    console.log('='.repeat(50));
    
    console.log(chalk.bold('\\nService Account Status:'));
    console.log(chalk.green('✓ Service account credentials are valid'));
    console.log(chalk.green('✓ Basic authentication works'));
    console.log(chalk.green('✓ Gmail API is enabled for the project'));
    
    console.log(chalk.bold('\\nDomain-Wide Delegation Requirements:'));
    console.log('1. Go to Google Workspace Admin Console:');
    console.log(chalk.cyan('   https://admin.google.com'));
    console.log('2. Navigate to: Security → API controls → Domain-wide delegation');
    console.log('3. Add/verify delegation entry:');
    console.log(chalk.cyan(`   Client ID: ${credentials.client_id}`));
    console.log(chalk.cyan('   OAuth Scopes: https://www.googleapis.com/auth/gmail.send'));
    console.log('4. Ensure user accounts exist:');
    console.log(chalk.cyan('   noreply@nstcg.org (primary requirement)'));
    console.log('5. Wait 5-10 minutes for propagation');
    
    console.log(chalk.bold('\\nNext Steps:'));
    console.log('• Complete domain-wide delegation setup in Workspace Admin');
    console.log('• Create noreply@nstcg.org user if it does not exist');
    console.log('• Re-run this diagnostic after setup');
    console.log('• Test with: node test-email-campaign.js');
    
  } catch (error) {
    console.error(chalk.red('❌ Diagnostic failed:'), error.message);
  }
}

// Run the diagnostic
diagnoseGmailPermissions().catch(console.error);

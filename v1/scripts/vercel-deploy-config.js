#!/usr/bin/env node

/**
 * Vercel Deployment Configuration Helper
 * 
 * Helps set up environment variables for production deployment
 */

import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(chalk.bold.blue('🚀 Vercel Deployment Configuration\n'));

// Required environment variables
const requiredVars = [
  {
    name: 'NOTION_TOKEN',
    description: 'Notion API integration token',
    example: 'ntn_...',
    sensitive: true
  },
  {
    name: 'NOTION_DATABASE_ID',
    description: 'Notion Leads database ID',
    example: '2174753d608e80acb6becf0e623262fe',
    sensitive: false
  },
  {
    name: 'NOTION_GAMIFICATION_DB_ID',
    description: 'Notion Gamification database ID',
    example: '21d4753d608e81a49bdcef5920c5ec30',
    sensitive: false
  },
  {
    name: 'GOOGLE_APPLICATION_CREDENTIALS_JSON',
    description: 'Google service account JSON (entire content)',
    example: '{ "type": "service_account", ... }',
    sensitive: true
  },
  {
    name: 'SITE_URL',
    description: 'Production site URL',
    example: 'https://nstcg.org',
    sensitive: false
  },
  {
    name: 'GMAIL_SENDER_EMAIL',
    description: 'Email address for sending',
    example: 'noreply@nstcg.org',
    sensitive: false
  }
];

// Generate Vercel CLI commands
function generateVercelCommands() {
  console.log(chalk.bold('📋 Vercel CLI Commands:\n'));
  console.log(chalk.gray('Run these commands to set environment variables:\n'));
  
  for (const envVar of requiredVars) {
    if (!envVar.sensitive) {
      console.log(`vercel env add ${envVar.name} production`);
      console.log(chalk.gray(`# ${envVar.description}`));
      console.log(chalk.gray(`# Example: ${envVar.example}\n`));
    }
  }
  
  console.log(chalk.yellow('\n⚠️  For sensitive variables, add them through Vercel dashboard:'));
  console.log(chalk.gray('https://vercel.com/[your-team]/[your-project]/settings/environment-variables\n'));
}

// Create deployment setup script
async function createDeploymentScript() {
  const setupScript = `#!/bin/bash
# Vercel Production Deployment Setup

echo "🚀 Setting up Vercel environment variables..."

# Non-sensitive variables (update values as needed)
vercel env add SITE_URL production <<< "https://nstcg.org"
vercel env add GMAIL_SENDER_EMAIL production <<< "noreply@nstcg.org"

echo ""
echo "⚠️  Please add these sensitive variables in Vercel dashboard:"
echo "1. NOTION_TOKEN"
echo "2. NOTION_DATABASE_ID" 
echo "3. NOTION_GAMIFICATION_DB_ID"
echo "4. GOOGLE_APPLICATION_CREDENTIALS_JSON"

echo ""
echo "📝 For GOOGLE_APPLICATION_CREDENTIALS_JSON:"
echo "1. Copy the entire content of your service account JSON file"
echo "2. Add it as a single environment variable in Vercel"
echo "3. The app will create the file from this variable at runtime"

echo ""
echo "✅ Once all variables are set, deploy with: vercel --prod"
`;

  const scriptPath = path.join(__dirname, 'setup-vercel-env.sh');
  await fs.writeFile(scriptPath, setupScript);
  await fs.chmod(scriptPath, '755');
  
  console.log(chalk.green('✓'), 'Created setup script:', scriptPath);
}

// Create runtime initialization for Google credentials
async function createGoogleCredentialsInit() {
  const initScript = `// Initialize Google Application Credentials from environment variable
// This runs at server startup in Vercel

const fs = require('fs');
const path = require('path');

function initializeGoogleCredentials() {
  // Check if running in Vercel
  if (process.env.VERCEL && process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      // Parse and validate JSON
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      
      // Write to temporary file
      const credentialsPath = path.join('/tmp', 'google-credentials.json');
      fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
      
      // Set environment variable to point to file
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
      
      console.log('✓ Google credentials initialized from environment variable');
    } catch (error) {
      console.error('❌ Failed to initialize Google credentials:', error.message);
    }
  }
}

// Run initialization
initializeGoogleCredentials();

module.exports = { initializeGoogleCredentials };
`;

  const initPath = path.join(path.dirname(__dirname), 'api', '_init-google-credentials.js');
  await fs.writeFile(initPath, initScript);
  
  console.log(chalk.green('✓'), 'Created Google credentials initializer:', initPath);
}

// Verify current .env file
async function verifyEnvFile() {
  console.log(chalk.bold('\n🔍 Checking current .env file...\n'));
  
  try {
    const envPath = path.join(path.dirname(__dirname), '.env');
    const envContent = await fs.readFile(envPath, 'utf-8');
    const lines = envContent.split('\n');
    
    const foundVars = new Set();
    
    for (const line of lines) {
      const match = line.match(/^([A-Z_]+)=/);
      if (match) {
        foundVars.add(match[1]);
      }
    }
    
    for (const envVar of requiredVars) {
      if (foundVars.has(envVar.name)) {
        console.log(chalk.green('✓'), envVar.name, '- Found in .env');
      } else {
        console.log(chalk.yellow('⚠'), envVar.name, '- Not found in .env');
      }
    }
  } catch (error) {
    console.log(chalk.red('✗'), 'Could not read .env file');
  }
}

// Create production checklist
async function createProductionChecklist() {
  console.log(chalk.bold('\n📋 Production Deployment Checklist:\n'));
  
  const checklist = [
    '1. Set all environment variables in Vercel dashboard',
    '2. Verify Gmail API authentication is configured',
    '3. Test activation endpoint with production URL',
    '4. Run test-email-campaign.js locally',
    '5. Deploy to Vercel: vercel --prod',
    '6. Send test batch of 5 emails',
    '7. Monitor activation rates',
    '8. Launch full campaign if tests pass'
  ];
  
  checklist.forEach(item => {
    console.log(chalk.gray(`□ ${item}`));
  });
}

// Main function
async function main() {
  // Check current environment
  await verifyEnvFile();
  
  // Generate commands
  generateVercelCommands();
  
  // Create helper scripts
  await createDeploymentScript();
  await createGoogleCredentialsInit();
  
  // Show checklist
  await createProductionChecklist();
  
  console.log(chalk.bold.green('\n✅ Deployment configuration ready!'));
  console.log(chalk.gray('\nNext steps:'));
  console.log(chalk.gray('1. Run ./setup-vercel-env.sh'));
  console.log(chalk.gray('2. Add sensitive variables in Vercel dashboard'));
  console.log(chalk.gray('3. Deploy with: vercel --prod'));
}

main().catch(error => {
  console.error(chalk.red('❌ Error:'), error.message);
  process.exit(1);
});
#!/usr/bin/env node

/**
 * Fix Invalid Email in Database
 * 
 * Removes or fixes the user with invalid/missing email
 */

import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const INVALID_USER_ID = '21c4753d-608e-800f-b6a0-ffac2b01e87a';

async function findAndFixInvalidEmail() {
  console.log(chalk.bold.blue('🔍 Finding user with invalid email...\n'));
  
  try {
    // First, try to fetch the specific page
    console.log('Fetching user with ID:', INVALID_USER_ID);
    
    const page = await notion.pages.retrieve({
      page_id: INVALID_USER_ID
    });
    
    console.log(chalk.green('✓'), 'Found user page');
    
    // Check the current email value
    const email = page.properties.Email?.email;
    const name = page.properties.Name?.rich_text?.[0]?.text?.content || 'Unknown';
    
    console.log('  Name:', name);
    console.log('  Email:', email || chalk.red('MISSING/INVALID'));
    
    if (!email || !email.includes('@')) {
      console.log(chalk.yellow('\n⚠️  Invalid or missing email detected'));
      
      // Options for fixing
      console.log('\nOptions:');
      console.log('1. Delete this user record');
      console.log('2. Update with a placeholder email');
      console.log('3. Archive the page (soft delete)');
      
      // For now, let's archive the page (safest option)
      if (process.argv.includes('--fix')) {
        console.log(chalk.yellow('\n🗂️  Archiving user page...'));
        
        await notion.pages.update({
          page_id: INVALID_USER_ID,
          archived: true
        });
        
        console.log(chalk.green('✓'), 'User page archived successfully');
        console.log(chalk.gray('  The page is not deleted but hidden from queries'));
      } else {
        console.log(chalk.gray('\n💡 Run with --fix flag to archive this user'));
      }
    } else {
      console.log(chalk.green('\n✓'), 'Email appears to be valid:', email);
    }
    
  } catch (error) {
    if (error.code === 'object_not_found') {
      console.log(chalk.yellow('⚠️'), 'User not found. It may have been already removed.');
    } else {
      console.error(chalk.red('✗'), 'Error:', error.message);
    }
  }
}

// Also search for any other users with invalid emails
async function findAllInvalidEmails() {
  console.log(chalk.bold('\n🔍 Searching for other users with invalid emails...\n'));
  
  let allUsers = [];
  let hasMore = true;
  let startCursor = undefined;
  
  while (hasMore) {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      start_cursor: startCursor,
      page_size: 100
    });
    
    allUsers = allUsers.concat(response.results);
    hasMore = response.has_more;
    startCursor = response.next_cursor;
  }
  
  const invalidUsers = [];
  
  for (const user of allUsers) {
    const email = user.properties.Email?.email;
    const name = user.properties.Name?.rich_text?.[0]?.text?.content || 'Unknown';
    
    if (!email || !email.includes('@')) {
      invalidUsers.push({
        id: user.id,
        name: name,
        email: email || 'MISSING'
      });
    }
  }
  
  if (invalidUsers.length > 0) {
    console.log(chalk.yellow(`Found ${invalidUsers.length} users with invalid emails:`));
    invalidUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.id}): ${user.email}`);
    });
  } else {
    console.log(chalk.green('✓'), 'No other users with invalid emails found');
  }
  
  console.log(chalk.gray(`\nTotal users checked: ${allUsers.length}`));
}

// Main execution
async function main() {
  console.log(chalk.bold.blue('🔧 Fix Invalid Email Tool\n'));
  
  // Find and fix the specific invalid user
  await findAndFixInvalidEmail();
  
  // Search for any other invalid emails
  if (process.argv.includes('--scan-all')) {
    await findAllInvalidEmails();
  }
  
  console.log(chalk.green('\n✅ Done!'));
}

main().catch(error => {
  console.error(chalk.red('❌ Error:'), error.message);
  process.exit(1);
});
#!/usr/bin/env node

/**
 * Cleanup script to list and optionally archive test gamification databases
 * Use this if you created multiple test databases during development
 */

import { Client } from '@notionhq/client';
import dotenv from 'dotenv';
import readline from 'readline';

// Load environment variables
dotenv.config();

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function findGamificationDatabases() {
  const parentPageId = process.env.NOTION_PAGE_ID;

  if (!parentPageId) {
    console.error('❌ NOTION_PAGE_ID not set in .env');
    return [];
  }

  try {
    console.log('🔍 Searching for gamification databases...\n');

    // Get all child databases of the parent page
    const response = await notion.blocks.children.list({
      block_id: parentPageId,
      page_size: 100,
    });

    const databases = response.results.filter(block =>
      block.type === 'child_database' &&
      block.child_database.title.toLowerCase().includes('gamification')
    );

    return databases;
  } catch (error) {
    console.error('❌ Error searching for databases:', error.message);
    return [];
  }
}

async function archiveDatabase(databaseId) {
  try {
    await notion.databases.update({
      database_id: databaseId,
      archived: true,
    });
    console.log('✅ Database archived successfully');
  } catch (error) {
    console.error('❌ Error archiving database:', error.message);
  }
}

async function main() {
  console.log('🧹 Gamification Database Cleanup Tool\n');

  const databases = await findGamificationDatabases();

  if (databases.length === 0) {
    console.log('No gamification databases found.');
    rl.close();
    return;
  }

  console.log(`Found ${databases.length} gamification database(s):\n`);

  databases.forEach((db, index) => {
    console.log(`${index + 1}. ${db.child_database.title}`);
    console.log(`   ID: ${db.id}`);
    console.log(`   Created: ${new Date(db.created_time).toLocaleString()}`);
    console.log('');
  });

  console.log('Current NOTION_GAMIFICATION_DATABASE_ID:', process.env.NOTION_GAMIFICATION_DATABASE_ID || 'Not set');
  console.log('');

  const answer = await question('Would you like to archive any of these databases? (y/n) ');

  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    const indexStr = await question('Enter the number of the database to archive (or "all" for all except current): ');

    if (indexStr.toLowerCase() === 'all') {
      const currentId = process.env.NOTION_GAMIFICATION_DATABASE_ID;

      for (const db of databases) {
        if (db.id !== currentId) {
          console.log(`\nArchiving: ${db.child_database.title}`);
          await archiveDatabase(db.id);
        } else {
          console.log(`\nSkipping current database: ${db.child_database.title}`);
        }
      }
    } else {
      const index = parseInt(indexStr) - 1;

      if (index >= 0 && index < databases.length) {
        const db = databases[index];
        console.log(`\nArchiving: ${db.child_database.title}`);
        await archiveDatabase(db.id);
      } else {
        console.log('Invalid selection.');
      }
    }
  }

  console.log('\n✨ Cleanup complete!');
  rl.close();
}

// Run the script
main().catch(error => {
  console.error('Script failed:', error);
  rl.close();
  process.exit(1);
});
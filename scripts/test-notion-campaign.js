import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testNotionConnection() {
  console.log('Testing Notion connection for email campaign...\n');
  
  console.log('Environment variables loaded:');
  console.log('- NOTION_TOKEN:', process.env.NOTION_TOKEN ? '✓ Set' : '✗ Missing');
  console.log('- NOTION_DATABASE_ID:', process.env.NOTION_DATABASE_ID ? '✓ Set' : '✗ Missing');
  
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
    console.error('\n❌ Missing required environment variables');
    return;
  }

  try {
    const notion = new Client({
      auth: process.env.NOTION_TOKEN,
    });

    console.log('\n📊 Querying Leads database for registered users...');
    
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      page_size: 5,
      filter: {
        and: [
          {
            property: 'Email',
            email: {
              is_not_empty: true,
            },
          },
          {
            property: 'Status',
            select: {
              equals: 'Registered',
            },
          },
        ],
      },
    });

    console.log(`\n✅ Successfully connected to Notion!`);
    console.log(`Found ${response.results.length} users (showing first 5)`);
    
    // Display sample users
    response.results.forEach((page, index) => {
      const email = page.properties.Email?.email;
      const name = page.properties.Name?.title?.[0]?.text?.content || '';
      const status = page.properties.Status?.select?.name || '';
      console.log(`${index + 1}. ${email} - ${name} (${status})`);
    });

  } catch (error) {
    console.error('\n❌ Notion connection failed:', error.message);
    if (error.code === 'unauthorized') {
      console.error('\nPossible issues:');
      console.error('1. Token might be expired or invalid');
      console.error('2. Integration might not have access to the database');
      console.error('3. Database ID might be incorrect');
    }
  }
}

testNotionConnection();
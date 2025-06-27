import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testUsersQuery() {
  console.log('Testing different user queries...\n');
  
  const notion = new Client({
    auth: process.env.NOTION_TOKEN,
  });

  try {
    // Query 1: All users with email
    console.log('1. All users with email (no filter):');
    const allUsers = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      page_size: 5,
      filter: {
        property: 'Email',
        email: {
          is_not_empty: true,
        },
      },
    });
    console.log(`   Found: ${allUsers.results.length} users`);
    
    // Query 2: Check Status property values
    console.log('\n2. Sample of Status values:');
    allUsers.results.forEach((page, index) => {
      const email = page.properties.Email?.email;
      const status = page.properties.Status?.select?.name || 'No status';
      console.log(`   ${index + 1}. ${email} - Status: "${status}"`);
    });

    // Query 3: Total count
    console.log('\n3. Getting total count of all entries:');
    let totalCount = 0;
    let hasMore = true;
    let startCursor = undefined;
    
    while (hasMore) {
      const response = await notion.databases.query({
        database_id: process.env.NOTION_DATABASE_ID,
        start_cursor: startCursor,
        page_size: 100,
      });
      totalCount += response.results.length;
      hasMore = response.has_more;
      startCursor = response.next_cursor;
    }
    console.log(`   Total entries in database: ${totalCount}`);

  } catch (error) {
    console.error('\n❌ Query failed:', error.message);
  }
}

testUsersQuery();
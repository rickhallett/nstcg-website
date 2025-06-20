// Simple caching mechanism
let cachedCount = null;
let cacheTime = 0;
const CACHE_DURATION = 60000; // 1 minute cache

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check cache
  const now = Date.now();
  if (cachedCount !== null && (now - cacheTime) < CACHE_DURATION) {
    return res.status(200).json({ count: cachedCount });
  }

  try {
    // Query Notion database
    const response = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        page_size: 1 // We only need the count, not the data
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Notion API error:', {
        status: response.status,
        error: errorData
      });
      throw new Error('Failed to fetch from Notion');
    }

    const data = await response.json();

    // Get total count - need to handle pagination
    let totalCount = data.results.length;
    let hasMore = data.has_more;
    let nextCursor = data.next_cursor;

    // If there are more pages, we need to count them
    while (hasMore) {
      const nextResponse = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
          start_cursor: nextCursor,
          page_size: 100 // Get more items per page for efficiency
        })
      });

      if (!nextResponse.ok) {
        throw new Error('Failed to fetch next page from Notion');
      }

      const nextData = await nextResponse.json();
      totalCount += nextData.results.length;
      hasMore = nextData.has_more;
      nextCursor = nextData.next_cursor;
    }

    // Update cache
    cachedCount = 215 + totalCount; // Add base count to database count
    cacheTime = now;

    // Log count for monitoring
    console.log('Database count fetched:', {
      databaseCount: totalCount,
      displayCount: cachedCount,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ count: cachedCount });

  } catch (error) {
    console.error('Error fetching count:', {
      error: error.message,
      timestamp: new Date().toISOString()
    });

    // Return default count on error
    res.status(200).json({ count: 215 });
  }
}
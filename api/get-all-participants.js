// Simple in-memory cache
let cachedData = null;
let cacheTime = 0;
const CACHE_DURATION = 900000; // 15 minutes

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Cache for 15 minutes with stale-while-revalidate for better performance
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=86400, max-age=300');

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
  if (cachedData !== null && (now - cacheTime) < CACHE_DURATION) {
    return res.status(200).json(cachedData);
  }

  try {
    const allParticipants = [];
    let hasMore = true;
    let cursor = undefined;

    // Fetch all participants using pagination
    while (hasMore) {
      const requestBody = {
        page_size: 100, // Maximum allowed by Notion API
        sorts: [
          {
            property: 'Timestamp',
            direction: 'ascending' // Oldest first for cumulative graph
          }
        ]
      };

      // Add cursor for pagination
      if (cursor) {
        requestBody.start_cursor = cursor;
      }

      const response = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Notion API error:', {
          status: response.status,
          error: errorData,
          timestamp: new Date().toISOString()
        });
        throw new Error('Failed to fetch from Notion');
      }

      const data = await response.json();

      // Process results
      const processedResults = data.results.map(page => {
        try {
          // Extract name
          const nameProperty = page.properties['Name'];
          let fullName = 'Anonymous';

          if (nameProperty && nameProperty.rich_text && nameProperty.rich_text.length > 0) {
            fullName = nameProperty.rich_text[0].plain_text;
          }

          // Anonymize name: First name + last initial
          const nameParts = fullName.trim().split(' ');
          let displayName = nameParts[0];

          if (nameParts.length > 1) {
            const lastNameInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();
            displayName = `${nameParts[0]} ${lastNameInitial}.`;
          }

          // Extract timestamp
          const timestampProperty = page.properties['Timestamp'];
          let timestamp = new Date().toISOString();

          if (timestampProperty && timestampProperty.date && timestampProperty.date.start) {
            timestamp = timestampProperty.date.start;
          }

          // Extract comment
          const commentProperty = page.properties['Comments'];
          let comment = null;

          if (commentProperty && commentProperty.rich_text && commentProperty.rich_text.length > 0) {
            comment = commentProperty.rich_text[0].plain_text;
          }

          return {
            name: displayName,
            timestamp: timestamp,
            comment: comment
          };
        } catch (error) {
          console.error('Error processing participant:', error);
          return null;
        }
      }).filter(participant => participant !== null);

      allParticipants.push(...processedResults);

      // Check if there are more pages
      hasMore = data.has_more;
      cursor = data.next_cursor;
    }

    // Calculate statistics
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const todayCount = allParticipants.filter(p =>
      new Date(p.timestamp) >= todayStart
    ).length;

    const weekCount = allParticipants.filter(p =>
      new Date(p.timestamp) >= weekStart
    ).length;

    // Prepare response data
    const responseData = {
      participants: allParticipants,
      totalCount: allParticipants.length, // Just database count, frontend adds base count
      todayCount: todayCount,
      weekCount: weekCount,
      timestamp: new Date().toISOString()
    };

    // Update cache
    cachedData = responseData;
    cacheTime = now;

    // Return all participants with statistics
    res.status(200).json(responseData);

  } catch (error) {
    console.error('Error fetching all participants:', {
      error: error.message,
      timestamp: new Date().toISOString()
    });

    // Return cached data if available (even if stale)
    if (cachedData !== null) {
      console.log('Returning stale cache due to error');
      return res.status(200).json({
        ...cachedData,
        stale: true
      });
    }

    // Return error response
    res.status(500).json({
      error: 'Failed to fetch participants',
      participants: [],
      totalCount: 0, // No participants fetched
      todayCount: 0,
      weekCount: 0,
      timestamp: new Date().toISOString()
    });
  }
}
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Cache for 1 minute with stale-while-revalidate
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=3600, max-age=30');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Query Notion database for recent entries
    const response = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        page_size: 5, // Get last 5 entries
        sorts: [
          {
            property: 'Timestamp',
            direction: 'descending'
          }
        ]
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
    
    // Process results to extract names and timestamps
    const signups = data.results.map(page => {
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
        console.error('Error processing signup:', error);
        return null;
      }
    }).filter(signup => signup !== null);
    
    // Return the processed signups
    res.status(200).json({ 
      signups: signups,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching recent signups:', {
      error: error.message,
      timestamp: new Date().toISOString()
    });

    // Return empty array on error
    res.status(200).json({ 
      signups: [],
      timestamp: new Date().toISOString()
    });
  }
}
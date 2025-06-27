// Get recent donations from Notion database
import { requireFeatures } from './middleware/feature-flags.js';

// Cache configuration
let cache = null;
let cacheTime = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute cache

export default async function handler(req, res) {
  // Check if donations feature is enabled
  if (await requireFeatures('donations.enabled', 'donations.showRecentDonations')(req, res) !== true) {
    return; // Response already sent by middleware
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Cache for 1 minute with stale-while-revalidate
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300, max-age=60');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if donations database is configured
  if (!process.env.NOTION_DONATIONS_DB_ID) {
    console.log('Donations database not configured, returning empty array');
    return res.status(200).json({ donations: [] });
  }

  try {
    // Check cache first
    if (cache && Date.now() - cacheTime < CACHE_DURATION) {
      return res.status(200).json(cache);
    }

    // Get limit from query params (default 10, max 50)
    const limit = Math.min(
      Math.max(1, parseInt(req.query.limit) || 10),
      50
    );

    // Query recent donations from Notion database
    const response = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_DONATIONS_DB_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter: {
          property: 'Status',
          select: { equals: 'Completed' }
        },
        sorts: [{
          property: 'Timestamp',
          direction: 'descending'
        }],
        page_size: limit
      })
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

    // Format donations for frontend
    const donations = data.results.map(page => {
      const props = page.properties;

      // Safely extract values with defaults
      const amount = props['Amount']?.number || 0;
      const donorName = props['Donor Name']?.rich_text?.[0]?.text?.content || 'Anonymous';
      const message = props['Message']?.rich_text?.[0]?.text?.content || '';
      const timestamp = props['Timestamp']?.date?.start || new Date().toISOString();

      return {
        amount: amount,
        name: anonymizeName(donorName),
        message: message,
        timestamp: timestamp
      };
    }).filter(donation => donation.amount > 0); // Filter out any invalid donations

    // Update cache
    const responseData = { donations };
    cache = responseData;
    cacheTime = Date.now();

    res.status(200).json(responseData);

  } catch (error) {
    console.error('Error fetching donations:', error);

    // Return cached data if available, even if expired
    if (cache) {
      console.log('Returning stale cache due to error');
      return res.status(200).json(cache);
    }

    // Otherwise return empty array
    res.status(200).json({ donations: [] });
  }
}

// Anonymize donor names for privacy
function anonymizeName(fullName) {
  // if (!fullName || fullName === 'Anonymous') {
  //   return 'Anonymous';
  // }

  const parts = fullName.trim().split(' ');

  if (parts.length >= 2) {
    // Show first name and last initial
    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1][0].toUpperCase();
    return `${firstName} ${lastInitial}.`;
  }

  // Single name - show first few characters
  if (parts[0].length > 3) {
    return `${parts[0].substring(0, 3)}...`;
  }

  return parts[0];
}
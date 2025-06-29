// Get total donations amount with caching
import { requireFeatures } from './middleware/feature-flags.js';

// Cache configuration
let cache = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

export default async function handler(req, res) {
  // Check if donations feature is enabled
  if (await requireFeatures('donations.enabled', 'donations.showTotalDonations')(req, res) !== true) {
    return; // Response already sent by middleware
  }
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Cache for 5 minutes with stale-while-revalidate
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600, max-age=300');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Check cache first
    if (cache && Date.now() - cacheTime < CACHE_DURATION) {
      console.log('Returning cached total donations');
      return res.status(200).json(cache);
    }
    
    // Check if donations database is configured
    if (!process.env.NOTION_DONATIONS_DB_ID) {
      console.log('Donations database not configured');
      return res.status(200).json({ 
        total: 0,
        count: 0,
        currency: 'GBP'
      });
    }
    
    // Query all completed donations
    let allDonations = [];
    let hasMore = true;
    let startCursor = undefined;
    
    while (hasMore) {
      const requestBody = {
        page_size: 100, // Max allowed by Notion API
        filter: {
          property: 'Status',
          select: { equals: 'Completed' }
        }
      };
      
      if (startCursor) {
        requestBody.start_cursor = startCursor;
      }
      
      const response = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_DONATIONS_DB_ID}/query`, {
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
        console.error('Notion API error:', errorData);
        throw new Error('Failed to fetch from Notion');
      }
      
      const data = await response.json();
      allDonations = allDonations.concat(data.results);
      hasMore = data.has_more;
      startCursor = data.next_cursor;
    }
    
    // Calculate total
    let totalAmount = 0;
    let validDonations = 0;
    
    allDonations.forEach(page => {
      const amount = page.properties['Amount']?.number;
      if (amount && amount > 0) {
        totalAmount += amount;
        validDonations++;
      }
    });
    
    // Round to 2 decimal places
    totalAmount = Math.round(totalAmount * 100) / 100;
    
    // Prepare response
    const responseData = {
      total: totalAmount,
      count: validDonations,
      currency: 'GBP',
      lastUpdated: new Date().toISOString()
    };
    
    // Update cache
    cache = responseData;
    cacheTime = Date.now();
    
    console.log(`Total donations: £${totalAmount} from ${validDonations} donations`);
    
    res.status(200).json(responseData);
    
  } catch (error) {
    console.error('Error fetching total donations:', error);
    
    // Return cached data if available, even if expired
    if (cache) {
      console.log('Returning stale cache due to error');
      return res.status(200).json({
        ...cache,
        stale: true
      });
    }
    
    // Otherwise return zero
    res.status(200).json({ 
      total: 0,
      count: 0,
      currency: 'GBP',
      error: true
    });
  }
}
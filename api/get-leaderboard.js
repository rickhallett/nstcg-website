/**
 * Get Leaderboard API Endpoint
 * 
 * Retrieves the leaderboard data with time period filtering.
 * Only includes users who have opted in to the leaderboard.
 */

import { requireFeatures } from './middleware/feature-flags.js';

// Cache for leaderboard data
const cache = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export default async function handler(req, res) {
  // Check if leaderboard feature is enabled
  if (await requireFeatures('leaderboard.enabled', 'referralScheme.enabled')(req, res) !== true) {
    return; // Response already sent by middleware
  }
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Cache for 2 minutes with stale-while-revalidate
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600, max-age=120');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get query parameters
    const { period = 'all', limit = 50, page = 1 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 50, 100); // Max 100 per page
    
    // Validate period
    const validPeriods = ['all', 'month', 'week', 'today'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({ error: 'Invalid time period' });
    }
    
    // Check cache
    const cacheKey = `${period}-${pageNum}-${limitNum}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.status(200).json(cached.data);
    }
    
    // Check if gamification database is configured
    if (!process.env.NOTION_GAMIFICATION_DB_ID) {
      console.log('Gamification database not configured');
      return res.status(200).json({
        leaderboard: [],
        total: 0,
        page: pageNum,
        limit: limitNum,
        message: 'Leaderboard not available - database not configured'
      });
    }
    
    // Check if Notion token is configured
    if (!process.env.NOTION_TOKEN) {
      console.error('Notion token not configured');
      return res.status(200).json({
        leaderboard: [],
        total: 0,
        page: pageNum,
        limit: limitNum,
        message: 'Leaderboard not available - authentication not configured'
      });
    }
    
    // Build filter based on time period
    const filters = [
      {
        property: 'Opted Into Leaderboard',
        checkbox: { equals: true }
      }
    ];
    
    // Add time-based filter
    if (period !== 'all') {
      const dateFilter = getDateFilter(period);
      if (dateFilter) {
        filters.push(dateFilter);
      }
    }
    
    // Query leaderboard data
    const response = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_GAMIFICATION_DB_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter: filters.length > 1 ? { and: filters } : filters[0],
        sorts: [{
          property: 'Total Points',
          direction: 'descending'
        }],
        start_cursor: pageNum > 1 ? getStartCursor(pageNum, limitNum) : undefined,
        page_size: limitNum
      })
    });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: 'Failed to parse error response' };
      }
      console.error('Notion API error:', {
        status: response.status,
        error: errorData,
        databaseId: process.env.NOTION_GAMIFICATION_DB_ID,
        hasToken: !!process.env.NOTION_TOKEN
      });
      throw new Error(`Failed to query leaderboard: ${response.status} - ${errorData.message || errorData.code || 'Unknown error'}`);
    }
    
    const data = await response.json();
    
    // Format leaderboard entries
    const leaderboard = data.results.map((page, index) => {
      const props = page.properties;
      const rank = (pageNum - 1) * limitNum + index + 1;
      
      // Extract name - anonymize if needed
      let displayName = 'Anonymous';
      const firstName = props['First Name']?.rich_text?.[0]?.text?.content || '';
      const lastName = props['Last Name']?.rich_text?.[0]?.text?.content || '';
      
      if (firstName) {
        // Show first name and last initial
        const lastInitial = lastName ? lastName.charAt(0).toUpperCase() + '.' : '';
        displayName = `${firstName} ${lastInitial}`;
      }
      
      return {
        rank,
        name: displayName,
        points: props['Total Points']?.number || 0,
        referrals: props['Direct Referrals Count']?.number || 0,
        badges: props['Achievement Badges']?.multi_select?.map(badge => badge.name) || [],
        registrationDate: props['Registration Date']?.date?.start,
        // Include breakdown if requested
        breakdown: {
          registrationPoints: props['Registration Points']?.number || 0,
          sharePoints: props['Share Points']?.number || 0,
          referralPoints: props['Referral Points']?.number || 0,
          donationPoints: props['Donation Points']?.number || 0
        }
      };
    });
    
    // Get total count for pagination
    const totalCount = await getTotalOptedInCount(filters);
    
    const result = {
      leaderboard,
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
      period,
      lastUpdated: new Date().toISOString()
    };
    
    // Cache the result
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    
    res.status(200).json(result);
    
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      error: 'Failed to fetch leaderboard',
      message: error.message
    });
  }
}

// Get date filter based on period
function getDateFilter(period) {
  const now = new Date();
  let startDate;
  
  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      return null;
  }
  
  return {
    property: 'Last Activity Date',
    date: { 
      after: startDate.toISOString() 
    }
  };
}

// Calculate start cursor for pagination (simplified)
function getStartCursor(page, limit) {
  // In a real implementation, you'd store and use actual Notion cursors
  // This is a placeholder
  return undefined;
}

// Get total count of opted-in users
async function getTotalOptedInCount(filters) {
  try {
    // Query with minimal data just to get count
    const response = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_GAMIFICATION_DB_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter: filters.length > 1 ? { and: filters } : filters[0],
        page_size: 1 // Just need count
      })
    });
    
    if (!response.ok) {
      return 0;
    }
    
    const data = await response.json();
    // Notion doesn't provide total count directly, so we'd need to paginate through all
    // For now, return a reasonable estimate
    return data.has_more ? 100 : data.results.length;
    
  } catch (error) {
    console.error('Error getting total count:', error);
    return 0;
  }
}
/**
 * Get Leaderboard API Endpoint
 * 
 * Retrieves the leaderboard data with time period filtering.
 * Only includes users who have opted in to the leaderboard.
 */

import { requireFeatures } from './middleware/feature-flags.js';
import Logger from './utils/logger.js';

// Initialize logger
const logger = new Logger('get-leaderboard');

// Cache for leaderboard data
const cache = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export default async function handler(req, res) {
  logger.logRequest(req);
  
  // Check if leaderboard feature is enabled
  if (await requireFeatures('leaderboard.enabled', 'referralScheme.enabled')(req, res) !== true) {
    logger.info('Leaderboard features not enabled');
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
      logger.debug('Returning cached data', { cacheKey });
      return res.status(200).json(cached.data);
    }
    
    logger.info('Fetching leaderboard data', { period, page: pageNum, limit: limitNum });

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
      },
      {
        property: 'Total Points',
        number: {
          greater_than: 0
        }
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
        filter: { and: filters },
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
    
    logger.info('Notion API response received', { 
      resultsCount: data.results.length,
      hasMore: data.has_more 
    });
    
    // Log first result structure for debugging
    if (data.results.length > 0) {
      logger.debug('First result properties', {
        properties: Object.keys(data.results[0].properties),
        sampleData: JSON.stringify(data.results[0].properties, null, 2)
      });
    }

    // Format leaderboard entries
    const leaderboard = data.results.map((page, index) => {
      const props = page.properties;
      const rank = (pageNum - 1) * limitNum + index + 1;

      // Log property structure for first entry
      if (index === 0) {
        logger.debug('Processing first entry properties', {
          hasDisplayName: !!props['Display Name'],
          hasName: !!props['Name'],
          hasFirstName: !!props['First Name'],
          hasTotalPoints: !!props['Total Points'],
          hasDirectReferrals: !!props['Direct Referrals Count']
        });
      }
      
      // Extract name - try multiple property names
      let displayName = 'Unknown';
      
      // Try Display Name first (rich_text field)
      const displayNameProp = props['Display Name']?.rich_text?.[0]?.text?.content;
      if (displayNameProp) {
        displayName = displayNameProp;
        logger.debug(`Using Display Name: ${displayName}`);
      } else {
        // Try Name (title field)
        const nameProp = props['Name']?.title?.[0]?.text?.content;
        if (nameProp) {
          displayName = nameProp;
          logger.debug(`Using Name: ${displayName}`);
        } else {
          // Fallback to First Name + Last Name
          const firstName = props['First Name']?.rich_text?.[0]?.text?.content || '';
          const lastName = props['Last Name']?.rich_text?.[0]?.text?.content || '';
          
          if (firstName) {
            const lastInitial = lastName ? lastName.charAt(0).toUpperCase() + '.' : '';
            displayName = `${firstName} ${lastInitial}`;
            logger.debug(`Using First/Last Name: ${displayName}`);
          } else {
            logger.warn('No name found for entry', { rank });
          }
        }
      }

      const entryData = {
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
      
      // Log first few entries for debugging
      if (index < 3) {
        logger.debug(`Entry ${index + 1}`, entryData);
      }
      
      return entryData;
    });

    // Filter out any entries with 0 points (backup filtering)
    const filteredLeaderboard = leaderboard.filter(entry => {
      if (entry.points === 0) {
        logger.debug('Filtering out zero-point entry', { name: entry.name });
        return false;
      }
      return true;
    });
    
    logger.info('Filtered leaderboard', { 
      originalCount: leaderboard.length,
      filteredCount: filteredLeaderboard.length,
      removedCount: leaderboard.length - filteredLeaderboard.length
    });

    // Get total count for pagination
    const totalCount = await getTotalOptedInCount(filters);

    const result = {
      leaderboard: filteredLeaderboard,
      total: filteredLeaderboard.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(filteredLeaderboard.length / limitNum),
      period,
      lastUpdated: new Date().toISOString()
    };

    // Cache the result
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    
    logger.info('Leaderboard data formatted', {
      entriesCount: filteredLeaderboard.length,
      totalCount: totalCount,
      firstThreeNames: filteredLeaderboard.slice(0, 3).map(e => e.name)
    });
    
    logger.logResponse(200, result);
    res.status(200).json(result);

  } catch (error) {
    logger.error('Error fetching leaderboard', { error: error.message, stack: error.stack });
    const errorResponse = {
      error: 'Failed to fetch leaderboard',
      message: error.message
    };
    logger.logResponse(500, errorResponse);
    res.status(500).json(errorResponse);
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
        filter: { and: filters },
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
/**
 * Get User Stats API Endpoint
 * 
 * Retrieves user statistics from the gamification database including:
 * - Total points
 * - Referral counts
 * - Rank
 * - Share counts
 */

import { requireFeature } from './middleware/feature-flags.js';

// Cache for user stats (5 minute TTL)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default async function handler(req, res) {
  // Check if referral feature is enabled
  if (await requireFeature('referralScheme.enabled')(req, res) !== true) {
    return; // Response already sent by middleware
  }
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Cache for 5 minutes with stale-while-revalidate
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600, max-age=300');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Get user identifier from query params (email or user_id)
  const { email, user_id } = req.query;
  
  if (!email && !user_id) {
    return res.status(400).json({ 
      error: 'Email or user_id required',
      stats: getDefaultStats()
    });
  }
  
  // Check cache
  const cacheKey = email || user_id;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.status(200).json(cached.data);
  }
  
  try {
    // Check if gamification database is configured
    if (!process.env.NOTION_GAMIFICATION_DB_ID) {
      console.log('Gamification database not configured');
      return res.status(200).json({
        stats: getDefaultStats(),
        message: 'Gamification system not active'
      });
    }
    
    // Query user from gamification database by email or user_id
    const filter = email 
      ? { property: 'Email', email: { equals: email } }
      : { property: 'User ID', rich_text: { equals: user_id } };
    
    const response = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_GAMIFICATION_DB_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter: filter,
        page_size: 1
      })
    });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: 'Failed to parse error response' };
      }
      console.error('Notion API error in get-user-stats:', {
        status: response.status,
        error: errorData,
        databaseId: process.env.NOTION_GAMIFICATION_DB_ID,
        hasToken: !!process.env.NOTION_TOKEN
      });
      throw new Error(`Failed to query gamification database: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.results.length === 0) {
      // User not found in gamification database
      const result = {
        stats: getDefaultStats(),
        exists: false
      };
      
      // Cache the result
      cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return res.status(200).json(result);
    }
    
    // Extract user stats from Notion page
    const userPage = data.results[0];
    const props = userPage.properties;
    
    const stats = {
      totalPoints: props['Total Points']?.number || 0,
      registrationPoints: props['Registration Points']?.number || 0,
      sharePoints: props['Share Points']?.number || 0,
      referralPoints: props['Referral Points']?.number || 0,
      donationPoints: props['Donation Points']?.number || 0,
      directReferrals: props['Direct Referrals Count']?.number || 0,
      indirectReferrals: props['Indirect Referrals Count']?.number || 0,
      referralCode: props['Referral Code']?.rich_text?.[0]?.text?.content || '',
      rank: 0, // Will be calculated separately
      badges: props['Achievement Badges']?.multi_select?.map(badge => badge.name) || [],
      sharesByPlatform: {
        twitter: props['Twitter Shares']?.number || 0,
        facebook: props['Facebook Shares']?.number || 0,
        whatsapp: props['WhatsApp Shares']?.number || 0,
        linkedin: props['LinkedIn Shares']?.number || 0,
        email: props['Email Shares']?.number || 0
      },
      lastActivity: props['Last Activity Date']?.date?.start || null,
      optedInToLeaderboard: props['Opted Into Leaderboard']?.checkbox || false
    };
    
    // Calculate rank if user opted in to leaderboard
    if (stats.optedInToLeaderboard) {
      stats.rank = await calculateUserRank(stats.totalPoints);
    }
    
    const result = {
      stats,
      exists: true
    };
    
    // Cache the result
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    
    res.status(200).json(result);
    
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(200).json({
      stats: getDefaultStats(),
      error: true,
      message: 'Unable to fetch user stats'
    });
  }
}

// Get default stats for new/unknown users
function getDefaultStats() {
  return {
    totalPoints: 0,
    registrationPoints: 0,
    sharePoints: 0,
    referralPoints: 0,
    donationPoints: 0,
    directReferrals: 0,
    indirectReferrals: 0,
    referralCode: '',
    rank: 0,
    badges: [],
    sharesByPlatform: {
      twitter: 0,
      facebook: 0,
      whatsapp: 0,
      linkedin: 0,
      email: 0
    },
    lastActivity: null,
    optedInToLeaderboard: false
  };
}

// Calculate user's rank among opted-in users
async function calculateUserRank(userPoints) {
  try {
    // Query all opted-in users sorted by points
    const response = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_GAMIFICATION_DB_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter: {
          property: 'Opted Into Leaderboard',
          checkbox: { equals: true }
        },
        sorts: [{
          property: 'Total Points',
          direction: 'descending'
        }],
        page_size: 100 // Get top 100 to find rank
      })
    });
    
    if (!response.ok) {
      return 0;
    }
    
    const data = await response.json();
    
    // Find user's rank
    let rank = 0;
    for (let i = 0; i < data.results.length; i++) {
      const points = data.results[i].properties['Total Points']?.number || 0;
      if (points >= userPoints) {
        rank = i + 1;
        if (points === userPoints) {
          break;
        }
      }
    }
    
    return rank || data.results.length + 1;
    
  } catch (error) {
    console.error('Error calculating rank:', error);
    return 0;
  }
}
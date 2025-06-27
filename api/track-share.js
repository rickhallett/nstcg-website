/**
 * Track Share API Endpoint
 * 
 * Records social media sharing actions and awards points.
 * Awards 3 points per share with daily limits per platform.
 */

import { requireFeatures } from './middleware/feature-flags.js';

// Daily share limits per platform
const DAILY_SHARE_LIMITS = {
  twitter: 5,
  facebook: 5,
  whatsapp: 10,
  linkedin: 5,
  email: 10
};

const POINTS_PER_SHARE = 0; // No points awarded for shares

export default async function handler(req, res) {
  // Check if referral and share tracking features are enabled
  if (await requireFeatures('referralScheme.enabled', 'referralScheme.trackReferrals')(req, res) !== true) {
    return; // Response already sent by middleware
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, user_id, platform, referral_code, first_name, last_name } = req.body;

    // Validate required fields
    if (!platform) {
      return res.status(400).json({ error: 'Platform is required' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    // Validate platform
    const validPlatforms = ['twitter', 'facebook', 'whatsapp', 'linkedin', 'email'];
    if (!validPlatforms.includes(platform.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    // Check if gamification database is configured
    if (!process.env.NOTION_GAMIFICATION_DB_ID) {
      console.log('Gamification database not configured');
      return res.status(200).json({
        success: true,
        points_awarded: 0,
        message: 'Gamification system not active'
      });
    }

    // Find user in gamification database by email
    const filter = { property: 'Email', email: { equals: email } };

    const queryResponse = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_GAMIFICATION_DB_ID}/query`, {
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

    if (!queryResponse.ok) {
      throw new Error('Failed to query gamification database');
    }

    const data = await queryResponse.json();

    if (data.results.length === 0) {
      // User not found - create new gamification profile
      const createResponse = await createGamificationProfile(email, user_id, referral_code, first_name, last_name);
      if (!createResponse.success) {
        throw new Error('Failed to create gamification profile');
      }

      // Record the share for the new profile
      return await recordShareForNewUser(createResponse.pageId, platform);
    }

    // User exists - update their share count
    const userPage = data.results[0];
    const props = userPage.properties;

    // Check daily share limit
    const platformShareField = `${capitalizeFirst(platform)} Shares`;
    const currentShares = props[platformShareField]?.number || 0;
    const lastShareDate = props['Last Share Date']?.date?.start;

    // Reset daily count if it's a new day
    const isNewDay = !lastShareDate || !isSameDay(new Date(lastShareDate), new Date());
    const dailyShareCount = isNewDay ? 0 : (props[`Daily ${capitalizeFirst(platform)} Shares`]?.number || 0);

    if (dailyShareCount >= DAILY_SHARE_LIMITS[platform]) {
      return res.status(200).json({
        success: true,
        points_awarded: 0,
        message: `Daily share limit reached for ${platform}`,
        daily_limit: DAILY_SHARE_LIMITS[platform],
        shares_today: dailyShareCount
      });
    }

    // No points awarded for shares anymore
    const pointsToAward = 0;
    const currentTotalPoints = props['Total Points']?.number || 0;
    const currentSharePoints = props['Share Points']?.number || 0;

    // Update user's gamification profile
    const updates = {
      'Total Points': { number: currentTotalPoints + pointsToAward },
      'Share Points': { number: currentSharePoints + pointsToAward },
      [platformShareField]: { number: currentShares + 1 },
      [`Daily ${capitalizeFirst(platform)} Shares`]: { number: dailyShareCount + 1 },
      'Last Share Date': { date: { start: new Date().toISOString() } },
      'Last Activity': { date: { start: new Date().toISOString() } }
    };

    // Reset all daily counters if it's a new day
    if (isNewDay) {
      validPlatforms.forEach(p => {
        if (p !== platform) {
          updates[`Daily ${capitalizeFirst(p)} Shares`] = { number: 0 };
        }
      });
    }

    const updateResponse = await fetch(`https://api.notion.com/v1/pages/${userPage.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({ properties: updates })
    });

    if (!updateResponse.ok) {
      throw new Error('Failed to update user points');
    }

    res.status(200).json({
      success: true,
      points_awarded: 0,
      message: 'Share tracked successfully. Earn points when friends complete registration!',
      total_points: currentTotalPoints,
      share_count: currentShares + 1,
      platform: platform,
      daily_shares_remaining: DAILY_SHARE_LIMITS[platform] - dailyShareCount - 1
    });

  } catch (error) {
    console.error('Error tracking share:', error);
    res.status(500).json({
      error: 'Failed to track share',
      message: error.message
    });
  }
}

// Helper function to capitalize first letter
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Helper function to check if two dates are the same day
function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
}

// Create new gamification profile
async function createGamificationProfile(email, userId, referralCode, firstName = null, lastName = null) {
  try {
    // If we don't have a name, try to fetch it from the Leads database
    let displayName = firstName || 'User';
    let fullName = firstName && lastName ? `${firstName} ${lastName}` : email.split('@')[0];
    
    if (!firstName && email) {
      try {
        const leadsResponse = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
          },
          body: JSON.stringify({
            filter: { property: 'Email', email: { equals: email } },
            page_size: 1
          })
        });
        
        if (leadsResponse.ok) {
          const leadsData = await leadsResponse.json();
          if (leadsData.results.length > 0) {
            const leadProps = leadsData.results[0].properties;
            firstName = leadProps['First Name']?.rich_text?.[0]?.text?.content || '';
            lastName = leadProps['Last Name']?.rich_text?.[0]?.text?.content || '';
            displayName = firstName || email.split('@')[0];
            fullName = firstName && lastName ? `${firstName} ${lastName}` : leadProps['Name']?.rich_text?.[0]?.text?.content || email.split('@')[0];
          }
        }
      } catch (error) {
        console.error('Error fetching user from Leads DB:', error);
      }
    }
    
    const properties = {
      'Email': email ? { email: email } : undefined,
      'Name': { title: [{ text: { content: fullName } }] }, // Required title property
      'Display Name': { rich_text: [{ text: { content: displayName } }] },
      'Referral Code': referralCode ? { rich_text: [{ text: { content: referralCode } }] } : undefined,
      'Total Points': { number: 0 },
      'Registration Points': { number: 0 },
      'Share Points': { number: 0 },
      'Referral Points': { number: 0 },
      'Direct Referrals Count': { number: 0 },
      'Indirect Referrals Count': { number: 0 },
      'Twitter Shares': { number: 0 },
      'Facebook Shares': { number: 0 },
      'WhatsApp Shares': { number: 0 },
      'Email Shares': { number: 0 },
      'Last Activity Date': { date: { start: new Date().toISOString() } },
      'Opted Into Leaderboard': { checkbox: true } // Default to opted in
    };

    // Remove undefined properties
    Object.keys(properties).forEach(key => {
      if (properties[key] === undefined) {
        delete properties[key];
      }
    });

    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: { database_id: process.env.NOTION_GAMIFICATION_DB_ID },
        properties: properties
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to create gamification profile:', error);
      return { success: false, error };
    }

    const page = await response.json();
    return { success: true, pageId: page.id };

  } catch (error) {
    console.error('Error creating gamification profile:', error);
    return { success: false, error: error.message };
  }
}

// Record share for newly created user
async function recordShareForNewUser(pageId, platform) {
  try {
    const platformShareField = `${capitalizeFirst(platform)} Shares`;

    const updates = {
      'Total Points': { number: 0 }, // No points for shares
      'Share Points': { number: 0 }, // No points for shares
      [platformShareField]: { number: 1 },
      [`Daily ${capitalizeFirst(platform)} Shares`]: { number: 1 },
      'Last Share Date': { date: { start: new Date().toISOString() } },
      'Last Activity': { date: { start: new Date().toISOString() } }
    };

    const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({ properties: updates })
    });

    if (!response.ok) {
      throw new Error('Failed to update new user with share');
    }

    return {
      success: true,
      points_awarded: 0,
      message: 'Share tracked successfully. Earn points when friends complete registration!',
      total_points: 0,
      share_count: 1,
      platform: platform,
      daily_shares_remaining: DAILY_SHARE_LIMITS[platform] - 1,
      new_user: true
    };

  } catch (error) {
    console.error('Error recording share for new user:', error);
    throw error;
  }
}
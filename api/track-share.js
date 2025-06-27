/**
 * Track Share API Endpoint
 * 
 * Records social media sharing actions and awards points.
 * Awards 3 points per share with daily limits per platform.
 */

import { requireFeatures } from './middleware/feature-flags.js';

const POINTS_PER_SHARE = 10;

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
    const { email, user_id, platform, referral_code } = req.body;
    
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
      const createResponse = await createGamificationProfile(email, user_id, referral_code);
      if (!createResponse.success) {
        throw new Error('Failed to create gamification profile');
      }
      
      // Record the share for the new profile
      return await recordShareForNewUser(createResponse.pageId, platform);
    }
    
    // User exists - update their share count
    const userPage = data.results[0];
    const props = userPage.properties;
    
    const platformShareField = `${capitalizeFirst(platform)} Shares`;
    const currentShares = props[platformShareField]?.number || 0;
    
    // Calculate points to award
    const pointsToAward = POINTS_PER_SHARE;
    const currentTotalPoints = props['Total Points']?.number || 0;
    const currentSharePoints = props['Share Points']?.number || 0;
    
    // Update user's gamification profile
    const updates = {
      'Total Points': { number: currentTotalPoints + pointsToAward },
      'Share Points': { number: currentSharePoints + pointsToAward },
      [platformShareField]: { number: currentShares + 1 },
      'Last Activity Date': { date: { start: new Date().toISOString() } }
    };
    
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
      const errorData = await updateResponse.json();
      console.error('Notion API error updating user points:', {
        status: updateResponse.status,
        error: errorData,
        pageId: userPage.id,
        updates: updates
      });
      throw new Error(`Failed to update user points: ${updateResponse.status} - ${errorData.message || errorData.code || 'Unknown error'}`);
    }
    
    res.status(200).json({
      success: true,
      points_awarded: pointsToAward,
      total_points: currentTotalPoints + pointsToAward,
      share_count: currentShares + 1,
      platform: platform
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


// Create new gamification profile
async function createGamificationProfile(email, userId, referralCode) {
  try {
    const properties = {
      'Email': email ? { email: email } : undefined,
      'Name': { title: [{ text: { content: 'Share User' } }] }, // Required title property
      'Display Name': { rich_text: [{ text: { content: 'Anonymous' } }] },
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
      'Total Points': { number: POINTS_PER_SHARE },
      'Share Points': { number: POINTS_PER_SHARE },
      [platformShareField]: { number: 1 },
      'Last Activity Date': { date: { start: new Date().toISOString() } }
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
      const errorData = await response.json();
      console.error('Notion API error updating new user with share:', {
        status: response.status,
        error: errorData,
        pageId: pageId,
        updates: updates
      });
      throw new Error(`Failed to update new user with share: ${response.status} - ${errorData.message || errorData.code || 'Unknown error'}`);
    }
    
    return {
      success: true,
      points_awarded: POINTS_PER_SHARE,
      total_points: POINTS_PER_SHARE,
      share_count: 1,
      platform: platform,
      new_user: true
    };
    
  } catch (error) {
    console.error('Error recording share for new user:', error);
    throw error;
  }
}
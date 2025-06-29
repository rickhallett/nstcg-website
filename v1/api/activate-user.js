/**
 * Activate User API Endpoint
 * 
 * Handles user activation from email campaigns.
 * Updates user records and awards bonus points.
 */

import Logger from './utils/logger.js';

// Initialize logger
const logger = new Logger('activate-user');

// Initialize Google credentials if in Vercel environment
if (process.env.VERCEL && process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  try {
    const fs = require('fs');
    const path = require('path');
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    const credentialsPath = path.join('/tmp', 'google-credentials.json');
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
  } catch (error) {
    console.error('Failed to initialize Google credentials:', error);
  }
}

// Rate limiting for activation attempts
const activationAttempts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_ACTIVATION_ATTEMPTS = 5; // Max 5 attempts per minute per IP

function checkActivationRateLimit(ip) {
  const now = Date.now();
  const attempts = activationAttempts.get(ip) || [];

  // Clean old attempts
  const recentAttempts = attempts.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);

  if (recentAttempts.length >= MAX_ACTIVATION_ATTEMPTS) {
    return false;
  }

  recentAttempts.push(now);
  activationAttempts.set(ip, recentAttempts);

  // Clean up old IPs periodically
  if (activationAttempts.size > 1000) {
    for (const [key, timestamps] of activationAttempts.entries()) {
      if (timestamps.every(t => now - t > RATE_LIMIT_WINDOW)) {
        activationAttempts.delete(key);
      }
    }
  }

  return true;
}

// Helper function to generate user ID
function generateUserId() {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to generate referral code
function generateReferralCode(firstName) {
  const prefix = (firstName || 'USER').slice(0, 3).toUpperCase();
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

export default async function handler(req, res) {
  // Log incoming request
  logger.logRequest(req);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    logger.info('OPTIONS request handled');
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    logger.warn('Invalid method attempted', { method: req.method });
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get client IP for rate limiting
  const clientIp = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
  logger.debug('Client IP identified', { clientIp });

  // Check rate limit
  if (!checkActivationRateLimit(clientIp)) {
    logger.warn('Rate limit exceeded', { clientIp });
    return res.status(429).json({
      error: 'Too many activation attempts. Please wait a minute and try again.'
    });
  }

  try {
    const { email, visitor_type, bonusPoints } = req.body;
    logger.info('Activation attempt started', { email, visitor_type, bonusPoints });

    // Validate required fields
    if (!email) {
      logger.warn('Missing email in request');
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!visitor_type || !['local', 'tourist'].includes(visitor_type)) {
      logger.warn('Invalid visitor type', { visitor_type });
      return res.status(400).json({ error: 'Valid visitor type (local/tourist) is required' });
    }

    // Validate bonus points if provided
    let validatedBonusPoints = null;
    if (bonusPoints !== undefined) {
      const points = parseInt(bonusPoints, 10);
      if (isNaN(points) || points !== 75) {
        logger.warn('Invalid bonus points', { bonusPoints, parsed: points });
        return res.status(400).json({ error: 'Invalid bonus points. Must be 75.' });
      }
      validatedBonusPoints = points;
    }
    logger.debug('Request validation passed', { email, visitor_type, validatedBonusPoints })

    // Fetch user from Leads database
    logger.info('Querying Leads database for user', { email: email.toLowerCase() });
    const leadsResponse = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter: {
          property: 'Email',
          email: { equals: email.toLowerCase() }
        },
        page_size: 1
      })
    });

    if (!leadsResponse.ok) {
      logger.error('Failed to query leads database', { status: leadsResponse.status });
      throw new Error('Failed to query leads database');
    }

    const leadsData = await leadsResponse.json();
    logger.logDatabaseOp('query', 'Leads', { email: email.toLowerCase() }, leadsData.results);

    if (leadsData.results.length === 0) {
      logger.warn('User not found in Leads database', { email });
      return res.status(404).json({ error: 'User not found' });
    }

    const leadPage = leadsData.results[0];
    const leadProps = leadPage.properties;
    logger.debug('Lead record found', { pageId: leadPage.id });

    // Extract user information
    const userInfo = {
      userId: leadProps['User ID']?.rich_text?.[0]?.text?.content || generateUserId(),
      email: email.toLowerCase(),
      firstName: leadProps['First Name']?.rich_text?.[0]?.text?.content || '',
      lastName: leadProps['Last Name']?.rich_text?.[0]?.text?.content || '',
      name: leadProps['Name']?.rich_text?.[0]?.text?.content || '',
      comment: leadProps['Comments']?.rich_text?.[0]?.text?.content || '',
      referralCode: leadProps['Referral Code']?.rich_text?.[0]?.text?.content || null
    };
    logger.debug('User info extracted', userInfo);

    // Ensure we have a proper display name
    if (!userInfo.firstName && userInfo.name) {
      const nameParts = userInfo.name.split(' ');
      userInfo.firstName = nameParts[0];
      userInfo.lastName = nameParts.slice(1).join(' ');
    }

    // Fallback to email prefix if no name available
    if (!userInfo.firstName) {
      userInfo.firstName = email.split('@')[0];
    }

    // Generate referral code if missing
    if (!userInfo.referralCode) {
      userInfo.referralCode = generateReferralCode(userInfo.firstName);
      logger.info('Generated new referral code', { referralCode: userInfo.referralCode });
    }

    // Update visitor type and referral code in Leads database
    const updateData = {
      'Visitor Type': { select: { name: visitor_type === 'local' ? 'Local' : 'Tourist' } }
    };
    
    // Update referral code if it was generated
    if (!leadProps['Referral Code']?.rich_text?.[0]?.text?.content && userInfo.referralCode) {
      updateData['Referral Code'] = { rich_text: [{ text: { content: userInfo.referralCode } }] };
    }
    
    // Update the Leads database
    logger.info('Updating Leads database', { pageId: leadPage.id, updates: Object.keys(updateData) });
    const updateResponse = await fetch(`https://api.notion.com/v1/pages/${leadPage.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        properties: updateData
      })
    });

    if (!updateResponse.ok) {
      logger.error('Failed to update Leads database', { status: updateResponse.status });
    } else {
      logger.info('Leads database updated successfully');
    }

    // Process gamification - check if user already has a profile
    let gamificationProfile = null;
    let totalPoints = 0;
    
    try {
      // Check for existing gamification profile
      logger.info('Checking for existing gamification profile', { email: email.toLowerCase() });
      const gamificationResponse = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_GAMIFICATION_DB_ID}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
          filter: {
            property: 'Email',
            email: { equals: email.toLowerCase() }
          },
          page_size: 1
        })
      });

      if (gamificationResponse.ok) {
        const gamificationData = await gamificationResponse.json();
        
        if (gamificationData.results.length > 0) {
          // User already has gamification profile - update it
          gamificationProfile = gamificationData.results[0];
          const props = gamificationProfile.properties;
          
          // Check if bonus points were already awarded
          const currentBonusPoints = props['Bonus Points']?.number || 0;
          logger.debug('Current bonus points in profile', { currentBonusPoints });
          
          if (currentBonusPoints === 0 && validatedBonusPoints) {
            // Award bonus points
            totalPoints = (props['Total Points']?.number || 0) + validatedBonusPoints;
            logger.info('Awarding bonus points', { currentTotal: props['Total Points']?.number || 0, bonus: validatedBonusPoints, newTotal: totalPoints });
            
            const updateGamificationResponse = await fetch(`https://api.notion.com/v1/pages/${gamificationProfile.id}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28'
              },
              body: JSON.stringify({
                properties: {
                  'Total Points': { number: totalPoints },
                  'Bonus Points': { number: validatedBonusPoints },
                  'Last Activity Date': { date: { start: new Date().toISOString() } }
                }
              })
            });
            
            if (!updateGamificationResponse.ok) {
              logger.error('Failed to update gamification points', { status: updateGamificationResponse.status });
            } else {
              logger.info('Gamification points updated successfully');
            }
          } else {
            // Bonus already awarded
            totalPoints = props['Total Points']?.number || 0;
            logger.info('Bonus points already awarded', { totalPoints });
          }
        } else {
          // Create new gamification profile
          logger.info('No existing gamification profile found, creating new one');
          const displayName = userInfo.firstName || email.split('@')[0];
          
          const createGamificationResponse = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
              'Content-Type': 'application/json',
              'Notion-Version': '2022-06-28'
            },
            body: JSON.stringify({
              parent: { database_id: process.env.NOTION_GAMIFICATION_DB_ID },
              properties: {
                'Email': { email: email.toLowerCase() },
                'Name': { title: [{ text: { content: userInfo.name || `${userInfo.firstName} ${userInfo.lastName}`.trim() || displayName } }] },
                'Display Name': { rich_text: [{ text: { content: displayName } }] },
                'User ID': { rich_text: [{ text: { content: userInfo.userId } }] },
                'Referral Code': { rich_text: [{ text: { content: userInfo.referralCode } }] },
                'Total Points': { number: validatedBonusPoints || 0 },
                'Bonus Points': { number: validatedBonusPoints || 0 },
                'Registration Points': { number: 0 }, // Already registered
                'Share Points': { number: 0 },
                'Referral Points': { number: 0 },
                'Direct Referrals Count': { number: 0 },
                'Twitter Shares': { number: 0 },
                'Facebook Shares': { number: 0 },
                'WhatsApp Shares': { number: 0 },
                'Email Shares': { number: 0 },
                'Streak Days': { number: 1 },
                'Last Activity Date': { date: { start: new Date().toISOString() } },
                'Opted Into Leaderboard': { checkbox: true }
              }
            })
          });
          
          if (createGamificationResponse.ok) {
            totalPoints = validatedBonusPoints || 0;
            logger.info('Gamification profile created successfully', { totalPoints });
          } else {
            logger.error('Failed to create gamification profile', { status: createGamificationResponse.status });
          }
        }
      }
    } catch (gamificationError) {
      logger.error('Gamification processing error', { error: gamificationError.message });
      // Continue with activation even if gamification fails
    }

    // Return success with complete user data
    const responseData = {
      success: true,
      userData: {
        user_id: userInfo.userId,
        email: userInfo.email,
        first_name: userInfo.firstName,
        last_name: userInfo.lastName,
        name: userInfo.name,
        referral_code: userInfo.referralCode,
        comment: userInfo.comment,
        visitor_type: visitor_type,
        bonus_points: validatedBonusPoints || 0,
        total_points: totalPoints,
        registered: true
      }
    };
    
    logger.info('Activation completed successfully', { email, totalPoints, referralCode: userInfo.referralCode });
    logger.logResponse(200, responseData);
    res.status(200).json(responseData);

  } catch (error) {
    logger.error('Error activating user', { error: error.message, stack: error.stack });
    const errorResponse = {
      error: 'Failed to activate user',
      message: error.message
    };
    logger.logResponse(500, errorResponse);
    res.status(500).json(errorResponse);
  }
}
/**
 * Activate User API Endpoint
 * 
 * Handles user activation from email campaigns.
 * Updates user records and awards bonus points.
 */

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

  // Get client IP for rate limiting
  const clientIp = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
  
  // Check rate limit
  if (!checkActivationRateLimit(clientIp)) {
    return res.status(429).json({ 
      error: 'Too many activation attempts. Please wait a minute and try again.' 
    });
  }

  try {
    const { email, visitor_type, bonusPoints } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!visitor_type || !['local', 'tourist'].includes(visitor_type)) {
      return res.status(400).json({ error: 'Valid visitor type (local/tourist) is required' });
    }

    // Validate bonus points if provided
    let validatedBonusPoints = null;
    if (bonusPoints !== undefined) {
      const points = parseInt(bonusPoints, 10);
      if (isNaN(points) || points < 10 || points > 50) {
        return res.status(400).json({ error: 'Invalid bonus points. Must be between 10 and 50.' });
      }
      validatedBonusPoints = points;
    }

    // Fetch user from Leads database
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
      throw new Error('Failed to query leads database');
    }

    const leadsData = await leadsResponse.json();
    
    if (leadsData.results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const leadPage = leadsData.results[0];
    const leadProps = leadPage.properties;
    
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
    }

    // Return success without gamification for now (simplified)
    res.status(200).json({
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
        registered: true
      }
    });

  } catch (error) {
    console.error('Error activating user:', error);
    res.status(500).json({
      error: 'Failed to activate user',
      message: error.message
    });
  }
}
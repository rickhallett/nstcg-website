/**
 * User Activation API Endpoint
 * 
 * Activates users who arrive from email campaign
 * Updates both Leads and Gamification databases
 * Returns full user data for localStorage restoration
 */

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
  
  try {
    const { email, visitorType, bonusPoints } = req.body;
    
    // Validate required fields
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    if (!visitorType || !['local', 'tourist'].includes(visitorType)) {
      return res.status(400).json({ error: 'Valid visitor type is required' });
    }
    
    const validBonusPoints = parseInt(bonusPoints) || 0;
    if (validBonusPoints < 10 || validBonusPoints > 50) {
      return res.status(400).json({ error: 'Invalid bonus points' });
    }
    
    // Find user in Leads database
    const userResponse = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter: {
          property: 'Email',
          email: {
            equals: email.toLowerCase()
          }
        },
        page_size: 1
      })
    });
    
    if (!userResponse.ok) {
      throw new Error('Failed to query Leads database');
    }
    
    const userData = await userResponse.json();
    
    if (userData.results.length === 0) {
      return res.status(404).json({ error: 'User not found. Please register first.' });
    }
    
    const userPage = userData.results[0];
    const props = userPage.properties;
    
    // Extract user data
    const userInfo = {
      email: email,
      firstName: props['First Name']?.rich_text[0]?.text?.content || '',
      lastName: props['Last Name']?.rich_text[0]?.text?.content || '',
      name: props['Name']?.rich_text[0]?.text?.content || '',
      userId: props['User ID']?.rich_text[0]?.text?.content || generateUserId(),
      referralCode: props['Referral Code']?.rich_text[0]?.text?.content || '',
      comment: props['Comments']?.rich_text[0]?.text?.content || '',
      timestamp: props['Timestamp']?.date?.start || new Date().toISOString()
    };
    
    // Generate referral code if not exists
    if (!userInfo.referralCode) {
      userInfo.referralCode = generateReferralCode(userInfo.firstName);
      
      // Update Leads DB with referral code and visitor type
      await fetch(`https://api.notion.com/v1/pages/${userPage.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
          properties: {
            'Referral Code': {
              rich_text: [{
                text: {
                  content: userInfo.referralCode
                }
              }]
            },
            'Visitor Type': {
              select: {
                name: visitorType === 'local' ? 'Local' : 'Tourist'
              }
            }
          }
        })
      });
    }
    
    // Create or update gamification profile
    if (process.env.NOTION_GAMIFICATION_DB_ID) {
      await createOrUpdateGamificationProfile(userInfo, validBonusPoints);
    }
    
    // Log activation
    console.log('User activated:', {
      email: email.substring(0, 3) + '***',
      bonusPoints: validBonusPoints,
      visitorType,
      timestamp: new Date().toISOString()
    });
    
    // Return full user data for localStorage
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
        visitor_type: visitorType,
        bonus_points: validBonusPoints,
        registered: true
      }
    });
    
  } catch (error) {
    console.error('Error activating user:', error);
    res.status(500).json({
      error: 'Failed to activate user. Please try again.'
    });
  }
}

/**
 * Generate unique user ID
 */
function generateUserId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Generate unique referral code
 */
function generateReferralCode(firstName) {
  const prefix = (firstName || 'USER').slice(0, 3).toUpperCase();
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

/**
 * Create or update gamification profile
 */
async function createOrUpdateGamificationProfile(userInfo, bonusPoints) {
  try {
    // Check if profile exists
    const queryResponse = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_GAMIFICATION_DB_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter: {
          property: 'Email',
          email: {
            equals: userInfo.email
          }
        },
        page_size: 1
      })
    });
    
    if (!queryResponse.ok) {
      throw new Error('Failed to query gamification database');
    }
    
    const data = await queryResponse.json();
    
    // Prepare display name (first name + last initial)
    const displayName = userInfo.firstName + 
      (userInfo.lastName ? ' ' + userInfo.lastName.charAt(0).toUpperCase() + '.' : '');
    
    if (data.results.length === 0) {
      // Create new profile
      const createResponse = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
          parent: { database_id: process.env.NOTION_GAMIFICATION_DB_ID },
          properties: {
            'Email': { email: userInfo.email },
            'Name': { 
              title: [{ 
                text: { 
                  content: userInfo.name || `${userInfo.firstName} ${userInfo.lastName}` 
                } 
              }] 
            },
            'Display Name': { 
              rich_text: [{ 
                text: { 
                  content: displayName 
                } 
              }] 
            },
            'User ID': { 
              rich_text: [{ 
                text: { 
                  content: userInfo.userId 
                } 
              }] 
            },
            'Referral Code': { 
              rich_text: [{ 
                text: { 
                  content: userInfo.referralCode 
                } 
              }] 
            },
            'Total Points': { number: bonusPoints },
            'Bonus Points': { number: bonusPoints },
            'Registration Points': { number: 0 }, // Already registered
            'Share Points': { number: 0 },
            'Referral Points': { number: 0 },
            'Direct Referrals Count': { number: 0 },
            'Indirect Referrals Count': { number: 0 },
            'Twitter Shares': { number: 0 },
            'Facebook Shares': { number: 0 },
            'WhatsApp Shares': { number: 0 },
            'LinkedIn Shares': { number: 0 },
            'Email Shares': { number: 0 },
            'Created At': { date: { start: new Date().toISOString() } },
            'Last Activity Date': { date: { start: new Date().toISOString() } },
            'Is Anonymous': { checkbox: false },
            'Opted Into Leaderboard': { checkbox: true },
            'Previous Rank': { number: 0 },
            'Profile Visibility': { select: { name: 'Public' } },
            'Streak Days': { number: 1 }
          }
        })
      });
      
      if (!createResponse.ok) {
        const error = await createResponse.json();
        console.error('Failed to create gamification profile:', error);
      }
    } else {
      // Update existing profile with bonus points
      const existingProfile = data.results[0];
      const currentTotal = existingProfile.properties['Total Points']?.number || 0;
      const currentBonus = existingProfile.properties['Bonus Points']?.number || 0;
      
      const updateResponse = await fetch(`https://api.notion.com/v1/pages/${existingProfile.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
          properties: {
            'Total Points': { number: currentTotal + bonusPoints },
            'Bonus Points': { number: currentBonus + bonusPoints },
            'Last Activity Date': { date: { start: new Date().toISOString() } },
            'User ID': userInfo.userId ? { 
              rich_text: [{ 
                text: { 
                  content: userInfo.userId 
                } 
              }] 
            } : undefined,
            'Display Name': { 
              rich_text: [{ 
                text: { 
                  content: displayName 
                } 
              }] 
            }
          }
        })
      });
      
      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        console.error('Failed to update gamification profile:', error);
      }
    }
  } catch (error) {
    console.error('Error managing gamification profile:', error);
    // Don't throw - allow activation to succeed even if gamification fails
  }
}
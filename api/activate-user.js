/**
 * Activate User API Endpoint
 * 
 * Handles user activation from email campaigns.
 * Updates user records and awards bonus points.
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
    const { email, visitor_type } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!visitor_type || !['local', 'tourist'].includes(visitor_type)) {
      return res.status(400).json({ error: 'Valid visitor type (local/tourist) is required' });
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

    // Update Leads database with visitor type and referral code
    const updateLeadsResponse = await fetch(`https://api.notion.com/v1/pages/${leadPage.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        properties: {
          'Visitor Type': {
            select: { name: visitor_type === 'local' ? 'Local' : 'Tourist' }
          },
          'Referral Code': userInfo.referralCode ? {
            rich_text: [{ text: { content: userInfo.referralCode } }]
          } : undefined
        }
      })
    });

    if (!updateLeadsResponse.ok) {
      console.error('Failed to update leads database');
    }

    // Check if gamification is enabled
    if (!process.env.NOTION_GAMIFICATION_DB_ID) {
      // Return basic success without gamification
      return res.status(200).json({
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
          registered: true
        }
      });
    }

    // Check if user exists in gamification database
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

    if (!gamificationResponse.ok) {
      throw new Error('Failed to query gamification database');
    }

    const gamificationData = await gamificationResponse.json();
    
    // Generate random bonus points (10-50)
    const bonusPoints = Math.floor(Math.random() * 41) + 10;
    
    let gamificationPageId;
    
    if (gamificationData.results.length === 0) {
      // Create new gamification profile
      const displayName = userInfo.firstName || email.split('@')[0];
      const fullName = userInfo.firstName && userInfo.lastName 
        ? `${userInfo.firstName} ${userInfo.lastName}` 
        : userInfo.name || displayName;
      
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
            'Email': { email: email.toLowerCase() },
            'Name': { title: [{ text: { content: fullName } }] },
            'Display Name': { rich_text: [{ text: { content: displayName } }] },
            'User ID': { rich_text: [{ text: { content: userInfo.userId } }] },
            'Referral Code': { rich_text: [{ text: { content: userInfo.referralCode } }] },
            'Total Points': { number: bonusPoints },
            'Bonus Points': { number: bonusPoints },
            'Registration Points': { number: 0 },
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
        const errorData = await createResponse.json();
        console.error('Failed to create gamification profile:', errorData);
        throw new Error('Failed to create gamification profile');
      }

      const newPage = await createResponse.json();
      gamificationPageId = newPage.id;
      
    } else {
      // Update existing gamification profile
      const existingPage = gamificationData.results[0];
      const existingProps = existingPage.properties;
      gamificationPageId = existingPage.id;
      
      // Check if Display Name is missing or set to generic values
      const currentDisplayName = existingProps['Display Name']?.rich_text?.[0]?.text?.content || '';
      const needsDisplayNameUpdate = !currentDisplayName || 
                                     currentDisplayName === 'User' || 
                                     currentDisplayName === 'Share User';
      
      const currentTotalPoints = existingProps['Total Points']?.number || 0;
      const currentBonusPoints = existingProps['Bonus Points']?.number || 0;
      
      const updates = {
        'Total Points': { number: currentTotalPoints + bonusPoints },
        'Bonus Points': { number: currentBonusPoints + bonusPoints },
        'User ID': { rich_text: [{ text: { content: userInfo.userId } }] },
        'Referral Code': { rich_text: [{ text: { content: userInfo.referralCode } }] },
        'Last Activity Date': { date: { start: new Date().toISOString() } },
        'Is Anonymous': { checkbox: false },
        'Opted Into Leaderboard': { checkbox: true }
      };
      
      // Update Display Name if needed
      if (needsDisplayNameUpdate && userInfo.firstName) {
        updates['Display Name'] = { rich_text: [{ text: { content: userInfo.firstName } }] };
      }
      
      // Update Name if it's generic
      const currentName = existingProps['Name']?.title?.[0]?.text?.content || '';
      if (currentName === 'Share User' || !currentName) {
        const fullName = userInfo.firstName && userInfo.lastName 
          ? `${userInfo.firstName} ${userInfo.lastName}` 
          : userInfo.name || userInfo.firstName || email.split('@')[0];
        updates['Name'] = { title: [{ text: { content: fullName } }] };
      }
      
      const updateResponse = await fetch(`https://api.notion.com/v1/pages/${gamificationPageId}`, {
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
        console.error('Failed to update gamification profile:', errorData);
        throw new Error('Failed to update gamification profile');
      }
    }

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
        visitor_type: visitor_type,
        bonus_points: bonusPoints,
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
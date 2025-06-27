/**
 * Track Survey Click API Endpoint
 * 
 * Records when a user clicks through to the official government survey
 * and awards additional points to their referrer.
 * 
 * Awards 25 additional points to the referrer (total 50 with registration)
 */

const SURVEY_COMPLETION_POINTS = 25; // Additional points for survey click

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
    const { email, user_id, referrer } = req.body;
    
    // Validate required fields
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
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
    
    // Find user in gamification database to check if they already clicked
    const userResponse = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_GAMIFICATION_DB_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter: {
          property: 'Email',
          email: { equals: email }
        },
        page_size: 1
      })
    });
    
    if (!userResponse.ok) {
      throw new Error('Failed to query gamification database');
    }
    
    const userData = await userResponse.json();
    
    if (userData.results.length === 0) {
      return res.status(404).json({
        error: 'User not found in gamification system'
      });
    }
    
    const userPage = userData.results[0];
    const userProps = userPage.properties;
    
    // Check if user already clicked through to survey
    const hasClickedSurvey = userProps['Has Clicked Survey']?.checkbox || false;
    
    if (hasClickedSurvey) {
      return res.status(200).json({
        success: true,
        points_awarded: 0,
        message: 'Survey click already recorded'
      });
    }
    
    // Mark user as having clicked the survey
    const updateUserResponse = await fetch(`https://api.notion.com/v1/pages/${userPage.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        properties: {
          'Has Clicked Survey': { checkbox: true },
          'Survey Click Date': { date: { start: new Date().toISOString() } }
        }
      })
    });
    
    if (!updateUserResponse.ok) {
      throw new Error('Failed to update user survey click status');
    }
    
    // If user has a referrer, award points to them
    if (referrer && referrer !== 'None') {
      const referrerResponse = await awardReferrerPoints(referrer, email);
      
      return res.status(200).json({
        success: true,
        referrer_updated: referrerResponse.success,
        points_awarded_to_referrer: referrerResponse.pointsAwarded || 0,
        message: 'Survey click tracked successfully'
      });
    }
    
    return res.status(200).json({
      success: true,
      referrer_updated: false,
      points_awarded_to_referrer: 0,
      message: 'Survey click tracked successfully (no referrer)'
    });
    
  } catch (error) {
    console.error('Error tracking survey click:', error);
    res.status(500).json({
      error: 'Failed to track survey click',
      message: error.message
    });
  }
}

/**
 * Award additional points to the referrer for survey completion
 */
async function awardReferrerPoints(referralCode, referredEmail) {
  try {
    // Find referrer by referral code
    const response = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_GAMIFICATION_DB_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter: {
          property: 'Referral Code',
          rich_text: { equals: referralCode }
        },
        page_size: 1
      })
    });
    
    if (!response.ok) {
      console.log('Failed to find referrer');
      return { success: false, error: 'Failed to find referrer' };
    }
    
    const data = await response.json();
    if (data.results.length === 0) {
      console.log('Referrer not found:', referralCode);
      return { success: false, error: 'Referrer not found' };
    }
    
    const referrerPage = data.results[0];
    const props = referrerPage.properties;
    
    // Get current points
    const currentTotalPoints = props['Total Points']?.number || 0;
    const currentReferralPoints = props['Referral Points']?.number || 0;
    const surveyCompletions = props['Survey Completions']?.number || 0;
    
    // Update referrer with additional points
    const updateResponse = await fetch(`https://api.notion.com/v1/pages/${referrerPage.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        properties: {
          'Total Points': { number: currentTotalPoints + SURVEY_COMPLETION_POINTS },
          'Referral Points': { number: currentReferralPoints + SURVEY_COMPLETION_POINTS },
          'Survey Completions': { number: surveyCompletions + 1 },
          'Last Activity': { date: { start: new Date().toISOString() } }
        }
      })
    });
    
    if (updateResponse.ok) {
      console.log(`Awarded ${SURVEY_COMPLETION_POINTS} additional points to referrer ${referralCode} for survey completion`);
      return { 
        success: true, 
        pointsAwarded: SURVEY_COMPLETION_POINTS,
        totalReferralPoints: currentReferralPoints + SURVEY_COMPLETION_POINTS + 25 // 25 from initial referral
      };
    } else {
      return { success: false, error: 'Failed to update referrer points' };
    }
    
  } catch (error) {
    console.error('Error awarding referrer points:', error);
    return { success: false, error: error.message };
  }
}
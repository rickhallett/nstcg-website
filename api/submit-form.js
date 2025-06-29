// Simple in-memory rate limiting (consider Redis for production)
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 10;

// In-memory duplicate detection
const recentSubmissions = new Map();
const DUPLICATE_WINDOW = 30000; // 30 seconds

function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = rateLimits.get(ip) || [];

  // Clean old requests
  const recentRequests = userRequests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);

  if (recentRequests.length >= MAX_REQUESTS) {
    return false;
  }

  recentRequests.push(now);
  rateLimits.set(ip, recentRequests);
  return true;
}

function checkDuplicate(email) {
  const now = Date.now();
  const lastSubmission = recentSubmissions.get(email);

  // Clean up old entries periodically
  if (recentSubmissions.size > 1000) {
    for (const [key, timestamp] of recentSubmissions.entries()) {
      if (now - timestamp > DUPLICATE_WINDOW) {
        recentSubmissions.delete(key);
      }
    }
  }

  if (lastSubmission && (now - lastSubmission) < DUPLICATE_WINDOW) {
    return true; // Duplicate found
  }

  recentSubmissions.set(email, now);
  return false;
}

async function checkEmailInDatabase(email) {
  try {
    const response = await fetch('https://api.notion.com/v1/databases/' + process.env.NOTION_DATABASE_ID + '/query', {
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
            equals: email
          }
        }
      })
    });

    if (!response.ok) {
      console.error('Failed to query Notion database:', response.status);
      return false; // Assume no duplicate if query fails
    }

    const data = await response.json();
    return data.results && data.results.length > 0;
  } catch (error) {
    console.error('Error checking email in database:', error);
    return false; // Assume no duplicate if error occurs
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const { name, firstName, lastName, email, timestamp, source, website, comment, user_id, submission_id, referrer, visitorType } = req.body;

  // Honeypot check
  if (website) {
    console.log('Honeypot triggered:', { ip: clientIp, timestamp: new Date().toISOString() });
    return res.status(400).json({ error: 'Invalid submission' });
  }

  // Validation
  if (!name || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Enhanced email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Name validation (basic)
  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({ error: 'Name must be between 2 and 100 characters' });
  }

  // Comment validation (optional)
  if (comment && comment.length > 150) {
    return res.status(400).json({ error: 'Comment must be 150 characters or less' });
  }

  // Visitor type validation
  const validVisitorTypes = ['local', 'tourist'];
  if (visitorType && !validVisitorTypes.includes(visitorType)) {
    return res.status(400).json({ error: 'Invalid visitor type' });
  }

  // Check for duplicate submission in memory (recent submissions)
  if (checkDuplicate(email.toLowerCase())) {
    console.log('Duplicate submission prevented (memory):', {
      email: email.substring(0, 3) + '***',
      timestamp: new Date().toISOString()
    });
    // Return success to avoid confusing the user
    return res.status(200).json({
      success: true,
      id: 'duplicate-prevented',
      message: 'Already registered'
    });
  }

  // Check for existing email in database
  const emailExists = await checkEmailInDatabase(email.toLowerCase());
  if (emailExists) {
    console.log('Email already exists in database:', {
      email: email.substring(0, 3) + '***',
      timestamp: new Date().toISOString()
    });
    return res.status(409).json({
      error: 'email_exists',
      message: 'Email already registered'
    });
  }

  try {
    // Log submission (partial email for privacy)
    console.log('Form submission:', {
      timestamp: new Date().toISOString(),
      name: name,
      email: email.substring(0, 3) + '***',
      source,
      ip: clientIp
    });

    // Notion API call
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: {
          database_id: process.env.NOTION_DATABASE_ID
        },
        properties: {
          'Request Name': {
            title: [{
              text: {
                content: 'nstcg.org - Lead Generation'
              }
            }]
          },
          'Name': {
            rich_text: [{
              text: {
                content: name
              }
            }]
          },
          'First Name': {
            rich_text: [{
              text: {
                content: firstName
              }
            }]
          },
          'Last Name': {
            rich_text: [{
              text: {
                content: lastName
              }
            }]
          },
          'Email': {
            email: email
          },
          'Source': {
            rich_text: [{
              text: {
                content: source || 'website'
              }
            }]
          },
          'Timestamp': {
            date: {
              start: timestamp || new Date().toISOString()
            }
          },
          'Comments': comment ? {
            rich_text: [{
              text: {
                content: comment
              }
            }]
          } : undefined,
          'User ID': user_id ? {
            rich_text: [{
              text: {
                content: user_id
              }
            }]
          } : undefined,
          'Referrer': referrer ? {
            rich_text: [{
              text: {
                content: referrer || 'None'
              }
            }]
          } : undefined,
          'Submission ID': submission_id ? {
            rich_text: [{
              text: {
                content: submission_id
              }
            }]
          } : undefined,
          'Visitor Type': visitorType ? {
            select: {
              name: visitorType === 'local' ? 'Local' : 'Tourist'
            }
          } : undefined,
          'Referral Code': {
            rich_text: [{
              text: {
                content: generateUniqueReferralCode(firstName || email.split('@')[0])
              }
            }]
          }
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Notion API error:', {
        status: response.status,
        error: errorData
      });
      throw new Error('Notion API error');
    }

    const data = await response.json();

    // Gamification system removed - referral tracking now handled in leads database

    // Success response
    res.status(200).json({
      success: true,
      id: data.id,
      message: 'Successfully saved to database'
    });

  } catch (error) {
    console.error('Submission error:', {
      error: error.message,
      timestamp: new Date().toISOString()
    });

    // Generic error response (don't expose internal errors)
    res.status(500).json({
      error: 'Failed to save submission. Please try again or contact support.'
    });
  }
}


async function checkExistingGamificationUser(email, userId) {
  try {
    if (!email) return false;

    const response = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_GAMIFICATION_DB_ID}/query`, {
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

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.results.length > 0;

  } catch (error) {
    console.error('Error checking existing user:', error);
    return false;
  }
}

/**
 * Create gamification profile for existing user who doesn't have one yet
 */
async function createReferrerGamificationProfile(email, referralCode, initialReferralPoints = 25) {
  try {
    // First, look up the user in the main database to get their details
    const mainDbResponse = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`, {
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

    if (!mainDbResponse.ok) {
      console.error('Failed to find user in main database:', email);
      return null;
    }

    const mainData = await mainDbResponse.json();
    if (mainData.results.length === 0) {
      console.error('User not found in main database:', email);
      return null;
    }

    const userPage = mainData.results[0];
    const props = userPage.properties;
    const firstName = props['First Name']?.rich_text?.[0]?.text?.content || '';
    const lastName = props['Last Name']?.rich_text?.[0]?.text?.content || '';
    const name = props['Name']?.rich_text?.[0]?.text?.content || `${firstName} ${lastName}`.trim() || email.split('@')[0];
    const userId = props['User ID']?.rich_text?.[0]?.text?.content || '';

    // Create gamification profile with initial referral points
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
          'Email': { email: email },
          'Name': { title: [{ text: { content: name } }] },
          'Display Name': { rich_text: [{ text: { content: firstName || email.split('@')[0] } }] },
          'User ID': { rich_text: [{ text: { content: userId } }] },
          'Referral Code': { rich_text: [{ text: { content: referralCode || generateUniqueReferralCode(firstName || email.split('@')[0]) } }] },
          'Total Points': { number: initialReferralPoints },
          'Registration Points': { number: 0 }, // They didn't register through a referral
          'Share Points': { number: 0 },
          'Referral Points': { number: initialReferralPoints },
          'Direct Referrals Count': { number: 1 }, // They just got their first referral
          'Indirect Referrals Count': { number: 0 },
          'Twitter Shares': { number: 0 },
          'Facebook Shares': { number: 0 },
          'WhatsApp Shares': { number: 0 },
          'Email Shares': { number: 0 },
          'Last Activity Date': { date: { start: new Date().toISOString() } },
          'Opted Into Leaderboard': { checkbox: true }
        }
      })
    });

    if (!createResponse.ok) {
      console.error('Failed to create gamification profile for referrer:', email);
      return null;
    }

    const newProfile = await createResponse.json();
    console.log('Created gamification profile for referrer:', email);
    return newProfile;

  } catch (error) {
    console.error('Error creating referrer gamification profile:', error);
    return null;
  }
}

/**
 * Process referral reward for the referrer
 */
async function processReferralReward(referralCode, referredEmail) {
  const REFERRAL_POINTS = 25;

  console.log(`Starting referral reward process: ${referredEmail} used referral code ${referralCode}`);

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

    if (!response.ok || !response.json) {
      console.log('Referrer not found:', referralCode);
      return;
    }

    const data = await response.json();
    if (data.results.length === 0) {
      console.log('Referrer not found in gamification DB for referral code:', referralCode);
      console.log('Note: Referrer must have a gamification profile to receive points.');
      console.log('They can create one by visiting the website and clicking their share link.');
      return;
    }

    const referrerPage = data.results[0];
    const props = referrerPage.properties;

    // Calculate points to award
    const currentTotalPoints = props['Total Points']?.number || 0;
    const currentReferralPoints = props['Referral Points']?.number || 0;
    const currentDirectReferrals = props['Direct Referrals Count']?.number || 0;

    const pointsToAward = REFERRAL_POINTS;

    // Update referrer's points
    const updateResponse = await fetch(`https://api.notion.com/v1/pages/${referrerPage.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        properties: {
          'Total Points': { number: currentTotalPoints + pointsToAward },
          'Referral Points': { number: currentReferralPoints + pointsToAward },
          'Direct Referrals Count': { number: currentDirectReferrals + 1 },
          'Last Activity Date': { date: { start: new Date().toISOString() } }
        }
      })
    });

    if (updateResponse.ok) {
      console.log(`Successfully awarded ${pointsToAward} referral points to ${referralCode}`);
      console.log(`Referrer now has ${currentTotalPoints + pointsToAward} total points`);
      console.log(`Referrer now has ${currentDirectReferrals + 1} direct referrals`);
    } else {
      console.error(`Failed to update referrer points for ${referralCode}`);
      const errorData = await updateResponse.json();
      console.error('Update error:', errorData);
    }

  } catch (error) {
    console.error('Error processing referral reward:', error);
  }
}


/**
 * Generate unique referral code
 */
function generateUniqueReferralCode(firstName) {
  const prefix = firstName.slice(0, 3).toUpperCase();
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}
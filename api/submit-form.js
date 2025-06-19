import { title } from "process";

// Simple in-memory rate limiting (consider Redis for production)
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 10;

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

  const { name, email, timestamp, source, website, comment } = req.body;

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
          } : undefined
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
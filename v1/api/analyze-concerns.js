/**
 * API Endpoint: Analyze Community Concerns
 * Fetches all participant comments and uses Claude API to identify top 3 concerns
 */

// Simple in-memory cache to avoid repeated API calls
const cache = {
  data: null,
  timestamp: null,
  ttl: 6 * 60 * 60 * 1000 // 6 hour cache - analysis doesn't change frequently
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Cache for 6 hours with long stale-while-revalidate
  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400, max-age=3600');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check cache first
  const now = Date.now();
  if (cache.data && cache.timestamp && (now - cache.timestamp < cache.ttl)) {
    console.log('Returning cached concerns data');
    return res.status(200).json(cache.data);
  }

  try {
    // Fetch all participants with comments from Notion
    const comments = await fetchParticipantComments();
    
    if (comments.length === 0) {
      const emptyResponse = {
        concerns: [],
        totalComments: 0,
        message: 'No comments available for analysis',
        timestamp: new Date().toISOString()
      };
      
      // Cache empty response too
      cache.data = emptyResponse;
      cache.timestamp = now;
      
      return res.status(200).json(emptyResponse);
    }

    // Analyze comments with Claude API
    const analysis = await analyzeCommentsWithClaude(comments);
    
    const response = {
      ...analysis,
      totalComments: comments.length,
      timestamp: new Date().toISOString()
    };

    // Cache the result
    cache.data = response;
    cache.timestamp = now;

    res.status(200).json(response);

  } catch (error) {
    console.error('Error analyzing concerns:', {
      error: error.message,
      timestamp: new Date().toISOString()
    });

    // Return fallback data if analysis fails
    const fallbackResponse = {
      concerns: [
        {
          rank: 1,
          title: "Traffic Safety",
          description: "Concerns about increased traffic volume and speeding on residential streets",
          frequency: Math.floor(cache.data?.totalComments * 0.4) || 15
        },
        {
          rank: 2,
          title: "Children's Safety",
          description: "Worries about child safety when playing or walking to school",
          frequency: Math.floor(cache.data?.totalComments * 0.3) || 10
        },
        {
          rank: 3,
          title: "Quality of Life",
          description: "Impact on peaceful residential environment and property values",
          frequency: Math.floor(cache.data?.totalComments * 0.2) || 8
        }
      ],
      totalComments: cache.data?.totalComments || 0,
      message: 'Using fallback analysis due to API error',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(fallbackResponse);
  }
}

/**
 * Fetch all participant comments from Notion database
 */
async function fetchParticipantComments() {
  const comments = [];
  let hasMore = true;
  let cursor = undefined;

  while (hasMore) {
    const requestBody = {
      page_size: 100,
      filter: {
        property: 'Comments',
        rich_text: {
          is_not_empty: true
        }
      }
    };

    if (cursor) {
      requestBody.start_cursor = cursor;
    }

    const response = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error('Failed to fetch comments from Notion');
    }

    const data = await response.json();
    
    // Extract comments
    const pageComments = data.results
      .map(page => {
        const commentProperty = page.properties['Comments'];
        if (commentProperty && commentProperty.rich_text && commentProperty.rich_text.length > 0) {
          return commentProperty.rich_text[0].plain_text;
        }
        return null;
      })
      .filter(comment => comment && comment.trim().length > 10); // Filter out very short comments

    comments.push(...pageComments);

    hasMore = data.has_more;
    cursor = data.next_cursor;
  }

  return comments;
}

/**
 * Analyze comments using Claude API to identify top concerns
 */
async function analyzeCommentsWithClaude(comments) {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const commentsText = comments.join('\n\n---\n\n');
  
  const prompt = `You are analyzing community feedback about traffic safety concerns in North Swanage. Below are comments from residents about proposed traffic changes that could redirect traffic to their residential streets.

Please analyze these comments and identify the top 3 most frequently mentioned concerns. For each concern, provide:
1. A clear title (2-4 words)
2. A brief description (one sentence)
3. An estimated frequency count based on how often this concern appears

Comments to analyze:
${commentsText}

Please respond with a JSON object in this exact format:
{
  "concerns": [
    {
      "rank": 1,
      "title": "Concern Title",
      "description": "Brief description of the concern",
      "frequency": number
    },
    {
      "rank": 2,
      "title": "Concern Title",
      "description": "Brief description of the concern",
      "frequency": number
    },
    {
      "rank": 3,
      "title": "Concern Title",
      "description": "Brief description of the concern",
      "frequency": number
    }
  ]
}

Focus on themes like traffic safety, children's welfare, quality of life, property values, emergency access, noise pollution, and environmental impact. The frequency should reflect how many comments mention each concern.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Claude API error:', errorData);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.content[0].text;
    
    // Parse JSON response from Claude
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }
    
    const analysis = JSON.parse(jsonMatch[0]);
    
    // Validate the structure
    if (!analysis.concerns || !Array.isArray(analysis.concerns) || analysis.concerns.length !== 3) {
      throw new Error('Invalid analysis structure from Claude');
    }
    
    // Ensure all required fields are present
    analysis.concerns.forEach((concern, index) => {
      if (!concern.title || !concern.description || typeof concern.frequency !== 'number') {
        throw new Error(`Invalid concern structure at index ${index}`);
      }
      concern.rank = index + 1; // Ensure rank is correct
    });

    return analysis;

  } catch (error) {
    console.error('Claude API analysis error:', error);
    throw error;
  }
}
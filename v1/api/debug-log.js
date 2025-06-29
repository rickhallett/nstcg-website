/**
 * Debug Log API Endpoint
 * Receives logs from frontend and writes them to file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_LOGS_PER_MINUTE = 100;

function checkRateLimit(ip) {
  const now = Date.now();
  const userLogs = rateLimitMap.get(ip) || [];
  
  // Clean old entries
  const recentLogs = userLogs.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  if (recentLogs.length >= MAX_LOGS_PER_MINUTE) {
    return false;
  }
  
  recentLogs.push(now);
  rateLimitMap.set(ip, recentLogs);
  
  // Cleanup old IPs
  if (rateLimitMap.size > 1000) {
    for (const [key, timestamps] of rateLimitMap.entries()) {
      if (timestamps.every(t => now - t > RATE_LIMIT_WINDOW)) {
        rateLimitMap.delete(key);
      }
    }
  }
  
  return true;
}

function getLogFilePath() {
  const date = new Date().toISOString().split('T')[0];
  // Use /tmp directory in Vercel serverless environment
  const logsDir = process.env.VERCEL ? '/tmp/logs/frontend' : path.join(__dirname, '../logs/frontend');
  
  // Ensure directory exists
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  } catch (error) {
    console.error('Failed to create log directory:', error);
    // If we can't create the directory, just use /tmp directly
    return `/tmp/activation-flow-${date}.log`;
  }
  
  return path.join(logsDir, `activation-flow-${date}.log`);
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

  // Get client IP
  const clientIp = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';

  // Check rate limit
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      error: 'Too many log requests. Please wait a minute.'
    });
  }

  try {
    const { logs } = req.body;
    
    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({ error: 'Invalid logs format' });
    }
    
    // Limit number of logs per request
    if (logs.length > 100) {
      return res.status(400).json({ error: 'Too many logs in one request. Max 100.' });
    }
    
    // Write logs to file
    const logPath = getLogFilePath();
    const logEntries = logs.map(log => {
      // Add server timestamp and IP
      return JSON.stringify({
        ...log,
        serverTimestamp: new Date().toISOString(),
        clientIp
      }) + '\n';
    }).join('');
    
    try {
      fs.appendFileSync(logPath, logEntries, 'utf8');
    } catch (writeError) {
      console.error('Failed to write logs to file:', writeError);
      // Log to console instead if file write fails
      console.log('Debug logs:', logEntries);
    }
    
    res.status(200).json({
      success: true,
      message: `Received ${logs.length} logs`
    });
    
  } catch (error) {
    console.error('Error processing debug logs:', error);
    res.status(500).json({
      error: 'Failed to process logs'
    });
  }
}
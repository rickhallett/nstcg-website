/**
 * API endpoint to log page visits with URL parameters
 * Appends to page-visits.log file in repository root
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rate limiting - in-memory store
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // 30 requests per minute per IP

// Clean up old entries periodically - only in non-serverless environments
// In serverless, cleanup happens on each request
if (!process.env.VERCEL) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requestCounts.entries()) {
      if (now - data.windowStart > RATE_LIMIT_WINDOW) {
        requestCounts.delete(key);
      }
    }
  }, RATE_LIMIT_WINDOW);
}

function checkRateLimit(ip) {
  const now = Date.now();
  const key = `visit-${ip}`;
  
  // Clean up old entries in serverless environment
  if (process.env.VERCEL && requestCounts.size > 100) {
    for (const [k, data] of requestCounts.entries()) {
      if (now - data.windowStart > RATE_LIMIT_WINDOW) {
        requestCounts.delete(k);
      }
    }
  }
  
  if (!requestCounts.has(key)) {
    requestCounts.set(key, { count: 1, windowStart: now });
    return true;
  }
  
  const data = requestCounts.get(key);
  
  if (now - data.windowStart > RATE_LIMIT_WINDOW) {
    // Reset window
    data.count = 1;
    data.windowStart = now;
    return true;
  }
  
  if (data.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  data.count++;
  return true;
}

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;
    
    // Validate URL is provided
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Extract IP for rate limiting
    const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    
    // Check rate limit
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    // Parse URL to check if it has parameters
    const urlObj = new URL(url);
    if (!urlObj.search) {
      // No parameters, don't log
      return res.status(200).json({ logged: false, reason: 'No URL parameters' });
    }

    // Create log entry
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} | ${url}\n`;

    // Path to log file - use /tmp in Vercel environment
    const logPath = process.env.VERCEL 
      ? '/tmp/page-visits.log'
      : path.join(__dirname, '..', 'page-visits.log');

    // Append to log file with error handling
    try {
      fs.appendFileSync(logPath, logEntry, 'utf8');
    } catch (writeError) {
      console.error('Failed to write log:', writeError);
      // Log to console instead if file write fails
      console.log('Page visit:', logEntry);
      // Still return success to not break the frontend
    }

    return res.status(200).json({ 
      logged: true, 
      timestamp,
      message: 'Visit logged successfully' 
    });

  } catch (error) {
    console.error('Error logging visit:', error);
    return res.status(500).json({ 
      error: 'Failed to log visit',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
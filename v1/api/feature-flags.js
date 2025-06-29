/**
 * Feature Flags API Endpoint
 * 
 * Returns the current feature flag configuration for the frontend.
 * This endpoint now supports Notion-based feature flags with proper precedence:
 * 1. Notion (if true/false) takes precedence
 * 2. Environment variables as fallback
 * 3. Default values as final fallback
 */

import { loadFeatures } from '../config/features.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Cache for 5 minutes to reduce API calls
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Load features with Notion precedence
    const features = await loadFeatures();
    
    // Return feature flags
    res.status(200).json(features);
    
  } catch (error) {
    console.error('Error loading feature flags:', error);
    
    // Return cached/default features on error
    // This ensures the frontend always gets a response
    const { current } = await import('../config/features.js');
    res.status(200).json(current);
  }
}
/**
 * Feature Flag Precedence Logic
 * 
 * Implements the precedence rules for feature flags:
 * 1. Notion value takes top precedence (if 'true' or 'false')
 * 2. If Notion value is 'unset' or not found, use environment variable
 * 3. If no environment variable, use default value
 */

import { fetchNotionFeatureFlags } from '../api/notion-feature-flags.js';

// Cache for merged feature flags
let mergedFeaturesCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Apply precedence rules to determine final feature value
 * @param {string} notionValue - Value from Notion ('true', 'false', 'unset', or null)
 * @param {string} envVar - Environment variable name
 * @param {boolean} defaultValue - Default value if nothing else is set
 * @returns {boolean} Final feature flag value
 */
function applyPrecedence(notionValue, envVar, defaultValue) {
  // Notion takes precedence if explicitly set
  if (notionValue === 'true') return true;
  if (notionValue === 'false') return false;
  
  // If Notion is 'unset' or not found, check environment variable
  if (process.env[envVar] !== undefined) {
    return process.env[envVar] === 'true';
  }
  
  // Fall back to default
  return defaultValue;
}

/**
 * Get feature flags with precedence applied
 * @param {Object} defaultFeatures - Default feature configuration
 * @returns {Promise<Object>} Merged feature flags with precedence applied
 */
export async function getFeaturesWithPrecedence(defaultFeatures) {
  // Check cache
  if (mergedFeaturesCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return mergedFeaturesCache;
  }

  try {
    // Fetch Notion flags
    const notionFlags = await fetchNotionFeatureFlags();
    
    // Deep clone default features to avoid mutation
    const mergedFeatures = JSON.parse(JSON.stringify(defaultFeatures));
    
    // Apply precedence for each feature
    const applyToCategory = (category, envPrefix) => {
      for (const [key, defaultValue] of Object.entries(defaultFeatures[category])) {
        const featurePath = `${category}.${key}`;
        const envVar = `${envPrefix}_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
        const notionValue = notionFlags[featurePath];
        
        mergedFeatures[category][key] = applyPrecedence(
          notionValue,
          envVar,
          defaultValue
        );
      }
    };
    
    // Apply to each category
    applyToCategory('donations', 'FEATURE');
    applyToCategory('campaignCosts', 'FEATURE');
    applyToCategory('leaderboard', 'FEATURE');
    applyToCategory('referralScheme', 'FEATURE');
    applyToCategory('ui', 'FEATURE');
    
    // Update cache
    mergedFeaturesCache = mergedFeatures;
    cacheTimestamp = Date.now();
    
    return mergedFeatures;
    
  } catch (error) {
    console.error('Error applying feature precedence:', error);
    // Return defaults on error
    return defaultFeatures;
  }
}

/**
 * Check a single feature with precedence
 * @param {string} featurePath - Dot notation path (e.g., 'donations.enabled')
 * @param {string} envVar - Environment variable name
 * @param {boolean} defaultValue - Default value
 * @returns {Promise<boolean>} Feature flag value with precedence applied
 */
export async function checkFeatureWithPrecedence(featurePath, envVar, defaultValue) {
  try {
    const notionFlags = await fetchNotionFeatureFlags();
    const notionValue = notionFlags[featurePath];
    
    return applyPrecedence(notionValue, envVar, defaultValue);
  } catch (error) {
    console.error('Error checking feature with precedence:', error);
    // Fall back to env var or default on error
    return process.env[envVar] === 'true' || defaultValue;
  }
}

/**
 * Clear precedence cache
 */
export function clearPrecedenceCache() {
  mergedFeaturesCache = null;
  cacheTimestamp = 0;
}

export default {
  getFeaturesWithPrecedence,
  checkFeatureWithPrecedence,
  clearPrecedenceCache
};
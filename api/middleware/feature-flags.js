/**
 * Feature Flag Middleware
 * 
 * This middleware checks if features are enabled before allowing API access.
 * Returns 404 if the feature is disabled to make it appear as if the endpoint doesn't exist.
 * Now supports async feature loading with Notion precedence.
 */

import { loadFeatures } from '../../config/features.js';

/**
 * Create middleware to check if a feature is enabled
 * @param {string} featurePath - Dot notation path to feature flag (e.g., 'donations.enabled')
 * @returns {Function} Async middleware function
 */
function requireFeature(featurePath) {
  return async (req, res) => {
    try {
      // Load features with Notion precedence
      const features = await loadFeatures();
      
      // Parse the feature path
      const parts = featurePath.split('.');
      let flag = features;
      
      // Navigate to the specific flag
      for (const part of parts) {
        if (flag && typeof flag === 'object' && part in flag) {
          flag = flag[part];
        } else {
          flag = false;
          break;
        }
      }
      
      // If feature is disabled, return 404
      if (!flag) {
        return res.status(404).json({
          error: 'Not found',
          message: 'This feature is not available'
        });
      }
      
      // Feature is enabled, return true to indicate middleware passed
      return true;
      
    } catch (error) {
      console.error('Error checking feature flag:', error);
      // On error, fail closed (deny access)
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Unable to verify feature availability'
      });
    }
  };
}

/**
 * Check multiple features with AND logic
 * @param {...string} featurePaths - Feature paths to check
 * @returns {Function} Async middleware function
 */
function requireFeatures(...featurePaths) {
  return async (req, res) => {
    for (const path of featurePaths) {
      const middleware = requireFeature(path);
      const result = await middleware(req, res);
      if (result !== true) {
        return; // Response already sent
      }
    }
    return true;
  };
}

export {
  requireFeature,
  requireFeatures,
  loadFeatures // Export loadFeatures for direct access
};
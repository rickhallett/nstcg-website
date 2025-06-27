/**
 * Notion Feature Flags API
 * 
 * Queries the Notion database for feature flag values.
 * Returns a map of feature paths to their Notion-configured values.
 * This is used internally by the feature flag system.
 */

// Cache for Notion feature flags
let notionFlagsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch feature flags from Notion database
 * @returns {Promise<Object>} Map of feature path to value ('true', 'false', or 'unset')
 */
export async function fetchNotionFeatureFlags() {
  // Check cache
  if (notionFlagsCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return notionFlagsCache;
  }

  // Check if Notion feature flags database is configured
  if (!process.env.NOTION_FEATURE_FLAGS_DB_ID) {
    console.log('Notion feature flags database not configured');
    return {};
  }

  // Validate database ID format (should be 32 hex characters)
  const dbId = process.env.NOTION_FEATURE_FLAGS_DB_ID;
  if (!/^[0-9a-f]{32}$/i.test(dbId)) {
    console.error(`Invalid Notion database ID format: ${dbId}. Expected 32 hex characters without hyphens.`);
    return {};
  }

  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_FEATURE_FLAGS_DB_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        page_size: 100, // Get all feature flags
        sorts: [
          {
            property: 'Category',
            direction: 'ascending'
          },
          {
            property: 'Feature Path',
            direction: 'ascending'
          }
        ]
      })
    });

    if (!response.ok) {
      console.error('Failed to query Notion feature flags:', response.status);
      return {};
    }

    const data = await response.json();
    const flags = {};

    // Transform Notion results into a simple map
    for (const page of data.results) {
      const props = page.properties;
      
      // Extract feature path (title property)
      const featurePath = props['Feature Path']?.title?.[0]?.text?.content;
      if (!featurePath) continue;

      // Extract value (select property)
      const value = props['Value']?.select?.name;
      if (!value) continue;

      // Store in map
      flags[featurePath] = value;
    }

    // Update cache
    notionFlagsCache = flags;
    cacheTimestamp = Date.now();

    console.log(`Loaded ${Object.keys(flags).length} feature flags from Notion`);
    return flags;

  } catch (error) {
    console.error('Error fetching Notion feature flags:', error);
    return {};
  }
}

/**
 * Get a specific feature flag value from Notion
 * @param {string} featurePath - Dot notation path (e.g., 'donations.enabled')
 * @returns {Promise<string|null>} 'true', 'false', 'unset', or null if not found
 */
export async function getNotionFeatureFlag(featurePath) {
  const flags = await fetchNotionFeatureFlags();
  return flags[featurePath] || null;
}

/**
 * Clear the cache (useful for testing or manual refresh)
 */
export function clearNotionFlagsCache() {
  notionFlagsCache = null;
  cacheTimestamp = 0;
}

// Export for use in other modules
export default {
  fetchNotionFeatureFlags,
  getNotionFeatureFlag,
  clearNotionFlagsCache
};
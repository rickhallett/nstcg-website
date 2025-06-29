/**
 * Debug Environment Variables
 * 
 * This endpoint helps debug which environment variables are configured.
 * REMOVE THIS IN PRODUCTION!
 */

export default async function handler(req, res) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  res.status(200).json({
    environment: process.env.NODE_ENV || 'development',
    hasNotionToken: !!process.env.NOTION_TOKEN,
    hasNotionApiKey: !!process.env.NOTION_API_KEY,
    hasMainDatabaseId: !!process.env.NOTION_DATABASE_ID,
    hasGamificationDatabaseId: !!process.env.NOTION_GAMIFICATION_DB_ID,
    hasDonationsDatabaseId: !!process.env.NOTION_DONATIONS_DB_ID,
    hasStripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
    hasStripeWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    // Show partial IDs for verification (last 4 chars only)
    mainDbIdSuffix: process.env.NOTION_DATABASE_ID?.slice(-4) || 'not set',
    gamificationDbIdSuffix: process.env.NOTION_GAMIFICATION_DB_ID?.slice(-4) || 'not set',
    donationsDbIdSuffix: process.env.NOTION_DONATIONS_DB_ID?.slice(-4) || 'not set'
  });
}
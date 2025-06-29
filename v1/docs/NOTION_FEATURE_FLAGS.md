# Notion-Based Feature Flags

This document explains how to use the Notion-based feature flag system for the NSTCG website.

## Overview

Feature flags can now be controlled through a Notion database, providing a user-friendly interface for toggling features without code deployments. The system implements a three-tier precedence model:

1. **Notion** (highest precedence) - if set to "true" or "false"
2. **Environment Variables** - if Notion is "unset" or not configured
3. **Default Values** - hardcoded fallbacks

## Setup

### 1. Create the Feature Flags Database

```bash
cd scripts
npm install @notionhq/client dotenv
node create-feature-flags-database.js
```

This will:
- Create a new database in your Notion workspace
- Output the database ID to add to your `.env` file
- Optionally populate with all available feature flags

### 2. Configure Environment

Add the database ID to your `.env` file:
```
NOTION_FEATURE_FLAGS_DB_ID=your-database-id-here
```

### 3. Grant Integration Access

Ensure your Notion integration has access to the feature flags database:
1. Open the database in Notion
2. Click "Share" in the top right
3. Invite your integration

## Using Feature Flags in Notion

### Database Structure

Each feature flag has the following properties:

- **Feature Path** (Title) - The dot notation path (e.g., `donations.enabled`)
- **Value** (Select) - Options: `true`, `false`, or `unset`
- **Description** - What the feature controls
- **Category** - Feature grouping (donations, ui, etc.)
- **Default Value** - What to use when "unset" and no env var exists
- **Environment Variable** - The corresponding env var name
- **Notes** - Additional context or warnings

### Toggling Features

1. Open the Feature Flags database in Notion
2. Find the feature you want to toggle
3. Change the **Value** field:
   - `true` - Force enable the feature
   - `false` - Force disable the feature
   - `unset` - Use environment variable or default

Changes take effect within 5 minutes (cache TTL).

## Available Feature Flags

### Donations
- `donations.enabled` - Enable donation functionality
- `donations.showFinancialStatus` - Show financial status card
- `donations.showRecentDonations` - Show recent donations list
- `donations.showTotalDonations` - Show total donations amount

### Campaign Costs
- `campaignCosts.enabled` - Show campaign running costs
- `campaignCosts.showLiveCounter` - Show live updating counter
- `campaignCosts.showBreakdown` - Show detailed cost breakdown

### Leaderboard
- `leaderboard.enabled` - Enable leaderboard functionality
- `leaderboard.showPrizePool` - Show prize pool information
- `leaderboard.showTopThree` - Show top three on homepage
- `leaderboard.showFullLeaderboard` - Show full leaderboard page

### Referral Scheme
- `referralScheme.enabled` - Enable referral system
- `referralScheme.showShareButtons` - Show social share buttons
- `referralScheme.trackReferrals` - Track and attribute referrals
- `referralScheme.showReferralBanner` - Show referral banner
- `referralScheme.awardReferralPoints` - Award points for referrals

### UI Features
- `ui.communityActionRequired` - Show alert header
- `ui.coloredTimer` - Color code countdown timer
- `ui.timerBlink` - Make timer blink when urgent

## Precedence Examples

### Example 1: Force Enable
- Notion: `true`
- Environment: `FEATURE_DONATIONS=false`
- Default: `false`
- **Result**: Feature is ENABLED (Notion wins)

### Example 2: Environment Fallback
- Notion: `unset`
- Environment: `FEATURE_DONATIONS=true`
- Default: `false`
- **Result**: Feature is ENABLED (Environment used)

### Example 3: Default Fallback
- Notion: `unset`
- Environment: (not set)
- Default: `true`
- **Result**: Feature is ENABLED (Default used)

## Caching

Feature flags are cached for 5 minutes to reduce API calls. This means:
- Changes may take up to 5 minutes to take effect
- The system continues working if Notion is temporarily unavailable

## Troubleshooting

### Features Not Updating
1. Wait 5 minutes for cache to expire
2. Check server logs for errors
3. Verify Notion integration has database access
4. Ensure `NOTION_FEATURE_FLAGS_DB_ID` is set correctly

### Notion API Errors
- The system falls back to environment variables if Notion is unavailable
- Check your `NOTION_TOKEN` is valid
- Verify rate limits haven't been exceeded

### Performance
- Initial page loads may be slightly slower while features load
- Subsequent requests use cached values
- Consider pre-warming the cache on server start

## Best Practices

1. **Use "unset" by default** - Allows environment-specific configuration
2. **Document changes** - Use the Notes field to explain why features are toggled
3. **Test locally** - Create a test database for development
4. **Monitor logs** - Watch for Notion API errors
5. **Plan rollbacks** - Know how to quickly disable features if needed
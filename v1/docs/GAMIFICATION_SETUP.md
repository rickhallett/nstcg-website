# Gamification System Setup Guide

## Overview

The NSTCG website includes a gamification system with leaderboards, referral tracking, and points. This guide explains how to set it up.

## Required Environment Variables

Add these to your `.env.local` file for local development or Vercel environment variables for production:

```bash
# Gamification Database ID (required for leaderboard/referrals)
NOTION_GAMIFICATION_DB_ID=your_gamification_database_id_here
```

## Database Setup

1. **Create Gamification Database in Notion**
   
   Run the setup script:
   ```bash
   node scripts/create-gamification-database.js
   ```

2. **Required Database Properties**
   - Email (Email)
   - First Name (Text)
   - Last Name (Text)
   - User ID (Text)
   - Referral Code (Text)
   - Total Points (Number)
   - Registration Points (Number)
   - Share Points (Number)
   - Referral Points (Number)
   - Donation Points (Number)
   - Direct Referrals (Number)
   - Indirect Referrals (Number)
   - Twitter Shares (Number)
   - Facebook Shares (Number)
   - WhatsApp Shares (Number)
   - LinkedIn Shares (Number)
   - Email Shares (Number)
   - Registration Date (Date)
   - Last Activity (Date)
   - Leaderboard Opt-in (Checkbox)
   - Badges (Multi-select)

## Feature Flags

The gamification features are controlled by feature flags. To enable:

### Local Development
Edit `/config/features.js` or set environment variables:

```bash
FEATURE_LEADERBOARD=true
FEATURE_REFERRAL=true
```

### Production (Vercel)
Set these environment variables in Vercel dashboard:

```bash
FEATURE_LEADERBOARD=true
FEATURE_REFERRAL=true
FEATURE_REFERRAL_POINTS=true
FEATURE_SHARE_BUTTONS=true
```

## Points System

- **Registration**: 10 points for signing up
- **Referral**: 25 points when someone signs up with your link
- **First Referral Bonus**: +10 extra points
- **Sharing**: 3 points per share (with daily limits)
  - Twitter: 5/day
  - Facebook: 5/day
  - WhatsApp: 10/day
  - LinkedIn: 5/day
  - Email: 10/day
- **Donations**: 5x donation amount in pounds

## Testing

1. **Check Environment**
   ```bash
   vercel dev
   # Visit http://localhost:3000/api/debug-env (development only)
   ```

2. **Test Registration Flow**
   - Submit form on homepage
   - Check if gamification profile is created in Notion

3. **Test Referral Flow**
   - Get referral link from `/share.html`
   - Share link and have someone register
   - Check if points are awarded

4. **Test Leaderboard**
   - Visit `/leaderboard.html`
   - Should show top participants

## Troubleshooting

### "Leaderboard not available"
- Check if `NOTION_GAMIFICATION_DB_ID` is set
- Verify the database exists in Notion
- Check if `NOTION_TOKEN` has access to the database

### "Failed to query leaderboard"
- Check API logs for detailed error
- Verify database schema matches expected properties
- Ensure feature flags are enabled

### Points not updating
- Check if gamification profile exists for user
- Verify API endpoints are working
- Check browser console for errors

## API Endpoints

- `/api/get-user-stats` - Get user's points and stats
- `/api/track-share` - Track social media shares
- `/api/get-leaderboard` - Get leaderboard data
- `/api/feature-flags` - Get current feature configuration

## Security Notes

- Referral codes are validated server-side
- Self-referrals are prevented
- Share points have daily limits to prevent abuse
- All database operations require valid Notion token
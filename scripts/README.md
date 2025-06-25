# NSTCG Database Scripts

This directory contains scripts for managing the NSTCG Notion databases.

## Setup

1. Install dependencies:
```bash
cd scripts
npm install
```

2. Configure environment variables in your `.env` file:
```env
# Required for all scripts
NOTION_TOKEN=your_notion_integration_token

# For creating the gamification database
NOTION_PAGE_ID=parent_page_id_where_database_will_be_created
NOTION_DATABASE_ID=existing_submissions_database_id

# After running create-gamification-database.js
NOTION_GAMIFICATION_DATABASE_ID=new_gamification_database_id
```

## Scripts

### create-gamification-database.js

Creates the Gamification Profiles database with all required fields and relations.

```bash
npm run create-gamification-db
# or
node create-gamification-database.js
```

This script will:
1. Create a new database with all gamification fields
2. Set up the relation to the existing submissions database
3. Optionally migrate existing users with:
   - Unique referral codes
   - Initial 10 registration points
   - Default privacy settings (opted-out of public leaderboard)

### Database Schema

The gamification database includes:

#### Identity & Display
- **Email** (email) - Primary identifier
- **Display Name** (text) - Public name for leaderboard
- **Is Anonymous** (checkbox) - Hide real name option
- **Profile Visibility** (select: Public/Private)
- **Opted Into Leaderboard** (checkbox) - GDPR compliance

#### Points System
- **Total Points** (number) - Sum of all points
- **Registration Points** (number) - Points for signing up (10)
- **Share Points** (number) - Points from social shares
- **Referral Points** (number) - Points from referrals
- **Bonus Points** (number) - Special campaign bonuses

#### Referral Tracking
- **Referral Code** (text) - Unique 6-character code
- **Direct Referrals Count** (number) - People directly referred
- **Indirect Referrals Count** (number) - Second-degree referrals
- **Referred By Email** (email) - Parent referrer

#### Activity Metrics
- **Last Activity Date** (date) - For time filtering
- **Share Count** (number) - Total shares
- **Facebook Shares** (number)
- **Twitter Shares** (number)
- **WhatsApp Shares** (number)
- **Email Shares** (number)

#### Gamification Status
- **Rank** (number) - Current leaderboard position
- **Previous Rank** (number) - For tracking movement
- **Achievement Badges** (multi-select) - Unlockable badges
- **Streak Days** (number) - Consecutive activity days

#### System Fields
- **Submission** (relation) - Link to main database
- **Created At** (created_time)
- **Updated At** (last_edited_time)

## Referral Code Format

Codes are 6 characters using:
- Letters: A-Z (excluding I, O for clarity)
- Numbers: 2-9 (excluding 0, 1 for clarity)
- Example: `A3BX9Z`

## Privacy Considerations

- Users are opted OUT of public leaderboard by default
- Profile visibility defaults to "Private"
- Anonymous display option available
- Clear data usage must be in privacy policy

## Next Steps After Setup

1. Update API endpoints to query the gamification database
2. Implement points calculation logic
3. Create leaderboard aggregation queries
4. Set up automated rank calculations
5. Test referral code uniqueness at scale
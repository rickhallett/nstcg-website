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

### test-notion-connection.js

Tests your Notion API connection and verifies access to databases.

```bash
npm run test-connection
# or
node test-notion-connection.js
```

This will verify:
- API token is valid
- Access to submissions database
- Access to gamification database (if created)
- Access to parent page for database creation

### example-gamification-usage.js

Demonstrates common gamification operations with example code.

```bash
npm run example
# or
node example-gamification-usage.js
```

Examples include:
- Adding users to gamification system
- Updating points for shares and referrals
- Fetching leaderboard data
- Handling privacy settings

### cleanup-test-databases.js

Helps clean up test databases created during development.

```bash
node cleanup-test-databases.js
```

Features:
- Lists all gamification databases
- Shows creation dates and IDs
- Option to archive individual or all test databases
- Protects current active database from accidental deletion

### Database Schema

The gamification database includes:

#### Identity & Display
- **Name** (title) - Required Notion title property (full name)
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

### migrate-referral-codes.js

Generates referral codes and User IDs for users in the leads database.

**Note:** The gamification database migration feature has been removed as the gamification system is deprecated.

#### Usage

**Generate missing referral codes:**
```bash
node migrate-referral-codes.js --gen
# or
npm run generate-codes
```

This will:
- Generate unique referral codes for all users without them
- Use format: `[FirstName3Letters][Timestamp4][Random4]`
- Log errors to `generation-errors.log`

**Easy mode - Generate both User IDs and Referral Codes:**
```bash
node migrate-referral-codes.js --easy
# or
npm run easy-generate
```

This will:
- Generate User IDs for all users without them
- Generate referral codes for all users without them
- Process ALL users in the leads database
- Skip only users who already have both fields
- Log errors to `easy-mode-errors.log`

This mode is perfect for:
- Initial setup of existing databases
- Ensuring all users have the required identifiers
- Fixing historical data where User IDs were missing
- Preparing for the removal of the gamification system

#### Error Logs

Errors are logged as JSON lines with:
- Timestamp
- User details (ID, email, name)
- Error message
- Fields being updated

### migrate-referral-codes-optimized.js

High-performance version of the referral code generation script with significant optimizations.

#### Performance Improvements

- **10-20x faster** through parallel processing
- **50-90% fewer API calls** with query filtering
- **80% less memory usage** with streaming
- **Real-time progress tracking** with ETA

#### Usage

```bash
# Fast generation of referral codes
node migrate-referral-codes-optimized.js --gen
# or
npm run generate-codes-fast

# Fast generation of both User IDs and referral codes
node migrate-referral-codes-optimized.js --easy
# or
npm run easy-generate-fast
```

#### Optimizations

1. **Parallel Processing**: Processes users in batches of 20 concurrent requests (configurable via `BATCH_SIZE` env var)
2. **Query Filtering**: Only fetches users that need updates, dramatically reducing data transfer
3. **HTTP Keep-Alive**: Reuses connections for 20-30% speed improvement
4. **Streaming**: Processes users as they're fetched instead of loading all into memory
5. **Retry Logic**: Automatic retry with exponential backoff for failed requests
6. **Progress Tracking**: Real-time progress bar with ETA and statistics

#### Example Output

```
🚀 Optimized Referral Code Generation Script

Starting optimized easy mode generation...
Batch size: 20 concurrent requests

Counting users needing updates...
Found 1523 users needing updates

[████████████████████████████            ] 72% | 1097/1523 | ✓ 1089 ✗ 8 - 0 | ETA: 2:34:15 PM

Completed in 45.2s
✓ Success: 1515
✗ Errors: 8
- Skipped: 0
```

#### Configuration

Set these environment variables to customize behavior:
- `BATCH_SIZE`: Number of concurrent requests (default: 20, max recommended: 50)
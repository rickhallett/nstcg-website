# Gmail OAuth2 Setup for Email Campaign

This guide explains how to set up OAuth2 authentication for sending emails through Gmail API.

## Prerequisites

1. **Google Cloud Console Setup**:
   - Create a new project or use existing `nstcg-org`
   - Enable Gmail API
   - Create OAuth2 credentials (Application type: "Desktop application")
   - Download the credentials JSON

2. **Environment Variables**:
   Add these to your `.env` file:
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   NOTION_TOKEN=your-notion-token
   NOTION_DATABASE_ID=your-database-id
   ```

## Setup Process

### Step 1: One-Time OAuth2 Authorization

Run the setup script to get a refresh token:

```bash
node scripts/oauth-setup.js
```

This will:
1. Open a browser window
2. Ask you to sign in as `noreply@nstcg.org`
3. Request permissions for Gmail sending
4. Save a `gmail-tokens.json` file with your refresh token

**Important**: You must sign in as the `noreply@nstcg.org` account that you want to send emails from.

### Step 2: Run Email Campaign

Once you have the `gmail-tokens.json` file, you can run the email campaign:

```bash
# Dry run (test without sending)
node scripts/email-campaign.js --dry-run

# Send to first 10 users (small test)
node scripts/email-campaign.js --batch-size=10

# Full campaign
node scripts/email-campaign.js
```

## How It Works

1. **One-Time Setup**: The OAuth2 setup creates a refresh token that doesn't expire
2. **Campaign Execution**: The email campaign loads the refresh token and creates a single Gmail client
3. **Token Refresh**: If the access token expires during sending, it's automatically refreshed
4. **Efficient Sending**: No re-authentication between emails - the same client sends all 300 emails

## Files Created

- `gmail-tokens.json` - Contains your refresh token (keep secure!)
- `sent-emails.json` - Tracks which emails were sent (for resume functionality)
- `failed-emails.json` - Logs any failed email attempts

## Troubleshooting

### "Missing gmail-tokens.json"
Run `node scripts/oauth-setup.js` first.

### "Insufficient Permission"
Make sure you signed in as `noreply@nstcg.org` during setup.

### "Invalid Grant"
The authorization code expired. Run the setup script again.

### "Redirect URI Mismatch"
Ensure your OAuth2 client is configured as "Desktop application" in Google Cloud Console.

## Security Notes

- The `gmail-tokens.json` file contains sensitive credentials
- Add it to `.gitignore` to avoid committing it
- The refresh token allows sending emails as the authorized user
- Store it securely in production environments 
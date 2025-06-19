# Vercel Deployment Guide

## Environment Variables Required

Before deploying, you need to set up the following environment variables in Vercel:

1. `NOTION_TOKEN` - Your Notion integration token
2. `NOTION_DATABASE_ID` - The ID of your Notion database

## Setup Instructions

### 1. Create Notion Integration
1. Go to https://www.notion.so/my-integrations
2. Click "New integration"
3. Give it a name (e.g., "Traffic Safety Form")
4. Select the workspace
5. Copy the Internal Integration Token

### 2. Create Notion Database
1. Create a new database in Notion with these properties:
   - Name (Title property)
   - Email (Email property)
   - Source (Text property)
   - Timestamp (Date property)
   - Status (Select property with options: New, Contacted, Completed)

2. Share the database with your integration:
   - Click "..." menu on the database
   - Click "Add connections"
   - Search for your integration name
   - Click to add

3. Get the database ID:
   - Open the database as a full page
   - Copy the ID from the URL: `https://www.notion.so/[workspace]/[database-id]?v=...`

### 3. Deploy to Vercel

#### Option A: Using Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd deployment
vercel

# Set environment variables
vercel env add NOTION_TOKEN
vercel env add NOTION_DATABASE_ID
```

#### Option B: Using GitHub
1. Push this repository to GitHub
2. Connect your GitHub repo to Vercel
3. Set the root directory to `deployment`
4. Add environment variables in Vercel dashboard

### 4. Add Honeypot Field (Optional)
To prevent bot submissions, add this hidden field to both forms in index.html:
```html
<input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off">
```

## API Endpoint

Once deployed, your form submission endpoint will be:
```
https://your-domain.vercel.app/api/submit-form
```

## Testing

Test the form submission with:
```bash
curl -X POST https://your-domain.vercel.app/api/submit-form \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "source": "test",
    "timestamp": "2025-01-01T00:00:00Z"
  }'
```

## Rate Limiting

The API includes basic in-memory rate limiting:
- 5 requests per minute per IP address
- For production, consider using Redis or Vercel KV

## Security Features

- Input validation
- Email format verification
- Rate limiting
- Honeypot field support
- CORS headers
- Security headers in vercel.json
- Partial email logging for privacy
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a community action website for the North Swanage Traffic Consultation Group (NSTCG). It's a static site with Vercel serverless functions that integrates with Notion API for data collection.

## Development Commands

- Run local development server: `vercel dev`
- Deploy to production: `vercel --prod`

## Architecture

### Frontend
- Static HTML served from `index.html`
- Vanilla JavaScript in `/js/main.js` handles:
  - Form submissions to `/api/submit-form`
  - Participant count fetching from `/api/get-count`
  - Countdown timer and UI interactions
  - Modal management with MicroModal library

### Backend (Vercel Functions)
- `/api/submit-form.js`: Processes form submissions
  - Rate limiting: 10 requests/minute per IP
  - Validates required fields
  - Stores data in Notion database
  - Returns success/error responses
  
- `/api/get-count.js`: Returns participant count
  - Caches results for 1 minute
  - Base count of 847 + database entries
  - Handles Notion API pagination

### Notion Integration
Both API functions require environment variables:
- `NOTION_API_KEY`: Integration token from Notion
- `NOTION_DATABASE_ID`: Target database ID

## Key Implementation Details

1. **Rate Limiting**: The `submit-form` function uses an in-memory store to track request counts by IP. Consider this limitation for scaling.

2. **Form Validation**: Both client and server-side validation exist. Server validates: name, email as required fields.

3. **Error Handling**: Functions return specific error messages and status codes. Client displays user-friendly messages with support contact.

4. **Security Headers**: Configured in `vercel.json` including CSP, X-Frame-Options, etc.

5. **Modal Forms**: Two forms exist - main form and survey modal. Both submit to the same endpoint; these should be refactored to use the same form as it has the same purpose, endpoint and validation.

## Testing Locally

1. Create `.env.local` file with Notion credentials
2. Run `vercel dev` 
3. Test form submissions and count endpoint
4. Verify rate limiting works (11th request within a minute should fail)
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a community action website for the North Swanage Traffic Consultation Group (NSTCG). It's a modern web application that combines static site performance with dynamic serverless functionality to drive community engagement for traffic safety initiatives.

**Key Features:**
- Participant registration and tracking
- Real-time countdown timers and live feeds
- Gamification with points, leaderboards, and referrals
- Donation processing via Stripe
- Dynamic feature flags via Notion
- Email campaign activation

For comprehensive documentation, see `architecture.md`.

## MCP Servers

- Code according to .cursor/rules/taskmaster.mdc
- `filesystem`: Filesystem (for local development)

## Development Commands

```bash
# Install dependencies
npm install

# Run both frontend and API development servers
npm run both

# Run individual servers
npm run dev:vite    # Frontend only
npm run dev:vercel  # API only

# Build for production
npm run build

# Deploy to production
vercel --prod
```

## Architecture Overview

### Frontend
- **Build Tool**: Vite with multi-page configuration
- **Pages**: index, share, donate, leaderboard, feeds, legal pages
- **JavaScript**: Modular ES6+ architecture with:
  - Core modules (StateManager, CacheManager, eventBus)
  - Feature modules (forms, modal, countdown, social, etc.)
  - Page-specific entry points (*-entry.js)
- **CSS**: Modular architecture with @import
- **Libraries**: MicroModal, Animate.css, Font Awesome

### Backend (Vercel Functions)
- **Form Processing**: `/api/submit-form`
  - Rate limiting (10/min per IP)
  - Duplicate detection
  - Gamification integration
- **Data APIs**: get-count, get-leaderboard, get-user-stats
- **Payments**: Stripe checkout and webhooks
- **Security**: reCAPTCHA verification
- **Configuration**: Dynamic feature flags

### Data Storage
- **Notion Databases**:
  - Main participant database
  - Gamification/leaderboard database
  - Feature flags database
- **Caching**: In-memory with TTL

### External Integrations
- **Notion API**: Primary data storage
- **Stripe**: Payment processing
- **Google reCAPTCHA**: Bot protection
- **Email**: Campaign activation

## Key Implementation Details

1. **State Management**: Centralized StateManager with pub/sub pattern for cross-module communication

2. **Feature Flags**: Three-tier precedence system (Notion → Environment → Defaults) with 5-minute cache

3. **Rate Limiting**: In-memory request tracking (10/min per IP for form submissions)

4. **Security**: 
   - Comprehensive CSP headers in `vercel.json`
   - Server-side validation for all inputs
   - reCAPTCHA v3 integration
   - Honeypot fields for bot detection

5. **Performance Optimizations**:
   - API response caching with TTL
   - Vite code splitting and lazy loading
   - Preload system for critical API data
   - WebP images with fallbacks

6. **Gamification**:
   - Points: Registration (10+100 if referred), Referrals (25), Shares (3 with daily limits), Donations (5x amount)
   - Leaderboard with opt-in privacy
   - Unique referral codes with attribution tracking

## Environment Variables

Required for development (`.env.local`):
```bash
# Notion Integration
NOTION_TOKEN=your_integration_token
NOTION_DATABASE_ID=main_database_id
NOTION_GAMIFICATION_DB_ID=gamification_database_id
NOTION_FEATURE_FLAGS_DB_ID=feature_flags_database_id

# Stripe (for donations)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Google reCAPTCHA
RECAPTCHA_SECRET_KEY=your_recaptcha_secret

# Feature Flags (optional, can use Notion instead)
FEATURE_DONATIONS=true
FEATURE_LEADERBOARD=true
FEATURE_REFERRAL=true
```

## Testing Locally

1. Clone repository and install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

3. Run development servers:
   ```bash
   npm run both  # Runs Vite and Vercel dev concurrently
   ```

4. Test key functionality:
   - Form submission at http://localhost:5173
   - API endpoints at http://localhost:3000/api/*
   - Rate limiting (11th request within a minute should fail)
   - Feature flag toggles via Notion database

## Common Tasks

- **Add new API endpoint**: Create file in `/api/`, add to `vercel.json` functions
- **Add new page**: Create HTML file, add entry to `vite.config.js` input
- **Toggle features**: Update Notion feature flags database or environment variables
- **Update participant count base**: Modify base count in `/api/get-count.js`

## Project Structure Notes

- Modal forms (main form and survey modal) currently duplicate code - consider refactoring to share components
- Rate limiting uses in-memory storage - consider Redis for production scaling
- Email activation flow requires MJML compilation: `npm run compile-email`

For detailed architecture information, refer to `architecture.md`.
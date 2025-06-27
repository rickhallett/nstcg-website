# NSTCG Website Architecture Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Directory Structure](#directory-structure)
5. [Frontend Architecture](#frontend-architecture)
6. [Backend Architecture](#backend-architecture)
7. [State Management](#state-management)
8. [Feature Management](#feature-management)
9. [Data Flow](#data-flow)
10. [External Integrations](#external-integrations)
11. [Gamification System](#gamification-system)
12. [Build and Deployment](#build-and-deployment)
13. [Security Considerations](#security-considerations)
14. [Development Workflow](#development-workflow)

## Project Overview

The North Swanage Traffic Consultation Group (NSTCG) website is a community action platform designed to gather support and feedback regarding traffic safety initiatives in North Swanage, Dorset. The website serves as a central hub for:

- **Community Engagement**: Collecting participant information and feedback
- **Campaign Management**: Tracking progress with countdown timers and participant counters
- **Social Mobilization**: Encouraging community members to share and recruit others
- **Financial Transparency**: Managing donations and displaying campaign costs
- **Gamification**: Incentivizing participation through points, leaderboards, and rewards

The platform is built as a modern, responsive web application that combines static site generation with serverless backend functions for dynamic functionality.

## Technology Stack

### Frontend
- **HTML5**: Semantic markup for all pages
- **CSS3**: Modular CSS architecture with native CSS imports
- **JavaScript (ES6+)**: Vanilla JavaScript with module system
- **Vite**: Build tool and development server
- **Libraries**:
  - MicroModal: Accessible modal dialogs
  - Animate.css: CSS animations
  - Font Awesome: Icon library

### Backend
- **Vercel Functions**: Serverless Node.js functions for API endpoints
- **Node.js**: Runtime environment (v22.x)
- **Environment**: Edge/serverless deployment

### Data Storage
- **Notion API**: Primary database for participant data and content management
- **In-Memory Caching**: Request-level caching for performance

### External Services
- **Stripe**: Payment processing for donations
- **Google reCAPTCHA**: Bot protection for forms
- **Email Services**: Campaign activation emails

### Development Tools
- **Git**: Version control
- **npm**: Package management
- **Task Master AI**: Task management and workflow automation
- **MCP Servers**: Development tooling integration

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Client Browser                          │
├─────────────────────────────────────────────────────────────────┤
│  Static Assets (HTML/CSS/JS)  │      Dynamic Requests           │
│  - Served via Vite/Vercel CDN │  - API calls to /api/*          │
└────────────────┬──────────────┴─────────────┬───────────────────┘
                 │                            │
                 ▼                            ▼
┌─────────────────────────────┐  ┌────────────────────────────────┐
│     Vite Dev Server /       │  │    Vercel Edge Functions       │
│     Vercel CDN (Prod)       │  │   (/api/* endpoints)           │
├─────────────────────────────┤  ├────────────────────────────────┤
│ - Static file serving       │  │ - submit-form.js               │
│ - Module bundling          │  │ - get-count.js                 │
│ - HMR in development       │  │ - get-leaderboard.js           │
│ - Asset optimization       │  │ - create-checkout-session.js   │
└─────────────────────────────┘  │ - verify-recaptcha.js          │
                                 │ - feature-flags.js             │
                                 └──────────┬─────────────────────┘
                                           │
                ┌──────────────────────────┴─────────────────────┐
                │              External Services                  │
                ├─────────────────┬──────────────┬──────────────┤
                │   Notion API    │    Stripe    │  reCAPTCHA   │
                │  (Database)     │  (Payments)  │ (Security)   │
                └─────────────────┴──────────────┴──────────────┘
```

## Directory Structure

```
nstcg-website/
├── api/                    # Vercel serverless functions
│   ├── middleware/         # Shared middleware functions
│   ├── webhook/           # Webhook handlers (Stripe)
│   └── *.js              # API endpoint handlers
├── components/            # Reusable HTML components
│   └── navigation.html   # Shared navigation component
├── config/                # Configuration files
│   ├── features.js       # Feature flag defaults
│   └── feature-precedence.js  # Feature flag precedence logic
├── css/                   # Modular CSS architecture
│   ├── base/             # Foundation styles
│   ├── components/       # Component-specific styles
│   ├── layout/           # Layout and structure
│   ├── pages/            # Page-specific styles
│   ├── utilities/        # Helper classes
│   └── main.css         # Main entry point
├── data/                  # Static JSON data files
├── dist/                  # Build output (gitignored)
├── docs/                  # Documentation
├── email/                 # Email templates (MJML)
├── images/                # Static images
├── js/                    # JavaScript modules
│   ├── components/       # UI components
│   ├── config/           # Configuration modules
│   ├── core/             # Core system modules
│   ├── modules/          # Feature modules
│   ├── utils/            # Utility functions
│   └── *-entry.js       # Page entry points
├── public/                # Public assets (copied to dist)
├── scripts/               # Build and utility scripts
├── specs/                 # Feature specifications
├── tests/                 # Test files
├── *.html                # HTML pages
├── package.json          # Node.js dependencies
├── vercel.json           # Vercel configuration
└── vite.config.js        # Vite build configuration
```

## Frontend Architecture

### HTML Pages
The application consists of multiple HTML pages, each serving a specific purpose:

- **index.html**: Main landing page with registration form and campaign information
- **share.html**: Referral sharing page with social media integration
- **donate.html**: Donation page with Stripe integration
- **leaderboard.html**: Gamification leaderboard display
- **feeds.html**: Live activity feed showing recent actions
- **privacy-policy.html**: Privacy policy page
- **terms-and-conditions.html**: Terms of service page
- **404.html**: Custom error page

### JavaScript Module System
The JavaScript architecture follows a modular pattern with clear separation of concerns:

#### Core Modules
- **StateManager.js**: Centralized state management with pub/sub pattern
- **CacheManager.js**: Request-level caching for API responses
- **eventBus.js**: Global event system for cross-module communication

#### Entry Points
Each page has a corresponding entry point that initializes page-specific functionality:
- **main-entry.js**: Homepage initialization
- **donate-entry.js**: Donation page setup
- **share-entry.js**: Share page functionality
- **leaderboard-entry.js**: Leaderboard page setup
- **feeds-entry.js**: Live feed initialization

#### Feature Modules
- **forms.js**: Form handling and validation
- **modal.js**: Modal dialog management
- **countdown.js**: Countdown timer functionality
- **social.js**: Social sharing integration
- **navigation.js**: Dynamic navigation features
- **api-integration.js**: Centralized API communication
- **referral-utils.js**: Referral tracking utilities

### CSS Architecture
The CSS follows a modular, component-based architecture:

#### Base Styles
- **variables.css**: CSS custom properties for theming
- **reset.css**: Browser normalization
- **typography.css**: Font and text styles
- **animations.css**: Reusable animations

#### Component Styles
Each UI component has its own CSS file:
- **forms.css**: Form styling
- **modal.css**: Modal dialogs
- **counter.css**: Participant counter
- **toast.css**: Toast notifications
- **share-buttons.css**: Social share buttons

#### Layout Styles
- **container.css**: Content containers
- **header.css**: Page headers
- **footer.css**: Page footers

#### Utility Styles
- **helpers.css**: Utility classes
- **mobile.css**: Mobile-specific overrides
- **registration-state.css**: User state-based styling

## Backend Architecture

### API Endpoints
The backend consists of serverless functions deployed on Vercel:

#### Form Submission
- **POST /api/submit-form**: Handles participant registration
  - Rate limiting: 10 requests/minute per IP
  - Duplicate detection
  - Notion database integration
  - Gamification profile creation

#### Data Retrieval
- **GET /api/get-count**: Returns participant count
  - 1-minute cache
  - Base count + database entries
  - Pagination support

- **GET /api/get-recent-signups**: Recent participants list
  - Privacy protection (name masking)
  - Time-based filtering

- **GET /api/get-all-participants**: Full participant list (admin)

#### Gamification
- **GET /api/get-leaderboard**: Leaderboard data
  - Points calculation
  - Opt-in filtering
  - Caching for performance

- **POST /api/track-share**: Social share tracking
  - Platform-specific limits
  - Points awarding
  - Duplicate prevention

- **GET /api/get-user-stats**: Individual user statistics

#### Donations
- **POST /api/create-checkout-session**: Stripe checkout
  - Session creation
  - Metadata handling
  - Redirect URLs

- **POST /api/webhook/stripe**: Stripe webhook handler
  - Payment verification
  - Database updates
  - Points awarding

#### Configuration
- **GET /api/feature-flags**: Dynamic feature configuration
  - Notion-based flags
  - Environment fallbacks
  - 5-minute cache

#### Security
- **POST /api/verify-recaptcha**: reCAPTCHA verification
  - Token validation
  - Score threshold checking

### Middleware
- **feature-flags.js**: Feature flag resolution logic
  - Precedence handling
  - Cache management
  - Fallback chains

## State Management

### StateManager
The application uses a centralized state management system:

```javascript
// State structure
{
  user: {
    id: string,
    email: string,
    referralCode: string,
    isRegistered: boolean
  },
  api: {
    participantCount: { data: number, timestamp: number },
    leaderboard: { data: array, timestamp: number }
  },
  ui: {
    modalOpen: boolean,
    toastMessage: string
  },
  features: {
    donations: { enabled: boolean },
    leaderboard: { enabled: boolean }
  }
}
```

### CacheManager
Request-level caching for API responses:
- TTL-based expiration
- Memory-efficient storage
- Automatic cleanup
- Cache invalidation support

### Event System
Global event bus for cross-module communication:
- Registration events
- Share tracking events
- UI state changes
- API response events

## Feature Management

### Three-Tier Precedence System
1. **Notion Database** (highest priority)
   - Real-time toggles without deployment
   - UI-friendly management
   - Audit trail

2. **Environment Variables**
   - Deployment-specific configuration
   - Sensitive settings
   - Fallback values

3. **Default Configuration**
   - Hardcoded fallbacks
   - Safe defaults
   - Documentation

### Feature Categories
- **Donations**: Payment functionality
- **Campaign Costs**: Financial transparency
- **Leaderboard**: Gamification features
- **Referral Scheme**: Social sharing
- **UI Features**: Visual elements

## Data Flow

### Registration Flow
1. User fills form on homepage
2. Client-side validation
3. Submit to `/api/submit-form`
4. Server-side validation
5. Rate limit check
6. Duplicate detection
7. Save to Notion database
8. Create gamification profile
9. Process referral rewards
10. Return success response
11. Update UI state
12. Show confirmation

### Donation Flow
1. User clicks donate button
2. Create Stripe checkout session
3. Redirect to Stripe
4. Process payment
5. Webhook notification
6. Update donation records
7. Award donation points
8. Update leaderboard

### Share Flow
1. User clicks share button
2. Generate referral link
3. Track share action
4. Check daily limits
5. Award share points
6. Open social platform
7. Update statistics

## External Integrations

### Notion API Integration
- **Database Operations**: CRUD operations on participant data
- **Feature Flags**: Dynamic configuration storage
- **Content Management**: Dynamic content updates
- **Authentication**: Bearer token authentication
- **Rate Limiting**: Respects API limits with caching

### Stripe Integration
- **Checkout Sessions**: One-time donation processing
- **Webhooks**: Payment confirmation handling
- **Security**: Signature verification
- **Metadata**: Donation attribution

### Google reCAPTCHA
- **v3 Integration**: Invisible verification
- **Score Threshold**: 0.5 minimum score
- **Fallback**: Graceful degradation
- **Privacy**: No user data storage

## Gamification System

### Points System
- **Registration**: 10 base points + 100 if referred
- **Referrals**: 25 points per successful referral
- **Sharing**: 3 points per share (daily limits)
- **Donations**: 5x donation amount in pounds
- **First-time Bonuses**: Additional rewards for first actions

### Leaderboard Features
- **Opt-in System**: Privacy-first approach
- **Real-time Updates**: Live position tracking
- **Prize Pool**: Configurable rewards
- **Badges**: Achievement system

### Referral Tracking
- **Unique Codes**: Auto-generated per user
- **Attribution**: Server-side validation
- **Self-referral Prevention**: Security checks
- **Chain Tracking**: Multi-level referrals

## Build and Deployment

### Vite Configuration
```javascript
// Key build settings
{
  build: {
    rollupOptions: {
      input: { /* Multi-page entries */ },
      output: { /* Optimized chunks */ }
    },
    minify: true,
    sourcemap: true,
    cssMinify: true
  },
  server: {
    proxy: { /* API proxying */ }
  }
}
```

### Vercel Deployment
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Functions**: Serverless with 10s timeout
- **Headers**: Security headers configured
- **Environment**: Edge network deployment

### Asset Optimization
- **Code Splitting**: Automatic chunking
- **Legacy Support**: IE11 polyfills
- **Image Optimization**: WebP with fallbacks
- **CSS Optimization**: Minification and purging

## Security Considerations

### Input Validation
- **Client-side**: Basic validation for UX
- **Server-side**: Comprehensive validation
- **Sanitization**: XSS prevention
- **Type Checking**: Runtime type validation

### Rate Limiting
- **Form Submission**: 10/minute per IP
- **API Endpoints**: Configurable limits
- **Memory Storage**: In-memory tracking
- **Cleanup**: Automatic expiration

### Security Headers
```
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Content-Security-Policy: [comprehensive policy]
```

### Data Privacy
- **Email Masking**: Partial display only
- **Opt-in Features**: User consent required
- **Data Minimization**: Collect only necessary data
- **GDPR Compliance**: Privacy policy and controls

## Development Workflow

### Local Setup
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run both  # Runs both Vite and Vercel dev
```

### Environment Variables
Required variables:
- `NOTION_TOKEN`: Notion integration token
- `NOTION_DATABASE_ID`: Main database ID
- `NOTION_GAMIFICATION_DB_ID`: Gamification database ID
- `NOTION_FEATURE_FLAGS_DB_ID`: Feature flags database ID
- `STRIPE_SECRET_KEY`: Stripe API key
- `STRIPE_WEBHOOK_SECRET`: Webhook signing secret
- `RECAPTCHA_SECRET_KEY`: reCAPTCHA secret

### Development Commands
- `npm run dev:vite`: Frontend development server
- `npm run dev:vercel`: API development server
- `npm run both`: Run both concurrently
- `npm run build`: Production build
- `vercel --prod`: Deploy to production

### Task Management
The project uses Task Master AI for workflow management:
- PRD parsing for task generation
- Complexity analysis
- Subtask breakdown
- Progress tracking
- Rule generation

### Code Standards
- **ES6+ JavaScript**: Modern syntax
- **Modular Architecture**: Clear separation
- **Documentation**: JSDoc comments
- **Error Handling**: Comprehensive logging
- **Testing**: Feature-specific test strategies

## Conclusion

The NSTCG website represents a modern, community-driven web application that combines static site performance with dynamic serverless functionality. The architecture prioritizes user experience, security, and maintainability while providing powerful features for community engagement and campaign management.
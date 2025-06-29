# NSTCG Website

> North Swanage Traffic Consultation Group - Community Action Platform

A modern web application designed to mobilize community engagement for traffic safety initiatives in North Swanage, Dorset. Built with performance, security, and user experience in mind.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/nstcg-website.git
cd nstcg-website

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Run development servers (frontend + API)
npm run both

# Open http://localhost:5173 in your browser
```

## 📋 Features

- **Community Registration**: Secure participant sign-up with duplicate detection
- **Real-time Updates**: Live countdown timers and activity feeds
- **Gamification System**: Points, leaderboards, and referral tracking
- **Donation Processing**: Stripe integration for campaign funding
- **Dynamic Configuration**: Notion-based feature flags
- **Email Campaigns**: Automated activation and engagement emails
- **Social Sharing**: Integrated sharing with referral attribution
- **Mobile Responsive**: Optimized for all device sizes

## 🛠️ Technology Stack

- **Frontend**: Vite, Vanilla JavaScript (ES6+), Modular CSS
- **Backend**: Vercel Serverless Functions (Node.js)
- **Database**: Notion API
- **Payments**: Stripe
- **Security**: Google reCAPTCHA v3
- **Build Tools**: Vite, Vercel

## 📁 Project Structure

<details>
<summary><strong>📊 Complete Project Tree (Click to expand)</strong></summary>

```
.
├── 404.html
├── ai_docs
│   └── claude_code_fresh_tutorials.md
├── api                     # Vercel serverless functions
│   ├── _init-google-credentials.js
│   ├── activate-user.js
│   ├── analyze-concerns.js
│   ├── create-checkout-session.js
│   ├── debug-env.js
│   ├── debug-log.js
│   ├── feature-flags.js
│   ├── get-all-participants.js
│   ├── get-count.js
│   ├── get-donations.js
│   ├── get-leaderboard.js
│   ├── get-recent-signups.js
│   ├── get-total-donations.js
│   ├── get-user-stats.js
│   ├── log-visit.js
│   ├── middleware
│   │   └── feature-flags.js
│   ├── notion-feature-flags.js
│   ├── submit-form.js
│   ├── track-share.js
│   ├── utils
│   │   └── logger.js
│   ├── verify-recaptcha.js
│   └── webhook
│       └── stripe.js
├── architecture.md
├── CLAUDE.md
├── components              # Reusable HTML components
│   └── navigation.html
├── config                  # Application configuration
│   ├── feature-precedence.js
│   └── features.js
├── css                     # Modular CSS architecture
│   ├── base
│   │   ├── animations.css
│   │   ├── reset.css
│   │   ├── typography.css
│   │   └── variables.css
│   ├── components
│   │   ├── confirmation.css
│   │   ├── counter.css
│   │   ├── financial-card.css
│   │   ├── forms.css
│   │   ├── gamification.css
│   │   ├── hero.css
│   │   ├── impact-map.css
│   │   ├── live-feed.css
│   │   ├── messages.css
│   │   ├── modal.css
│   │   ├── navigation.css
│   │   ├── share-buttons.css
│   │   ├── social-proof.css
│   │   ├── survey.css
│   │   ├── thought-bubbles.css
│   │   └── toast.css
│   ├── layout
│   │   ├── container.css
│   │   ├── footer.css
│   │   └── header.css
│   ├── main.css
│   ├── pages
│   │   ├── donate.css
│   │   └── feeds.css
│   └── utilities
│       ├── helpers.css
│       ├── mobile.css
│       └── registration-state.css
├── data                    # Static JSON data
│   ├── feed-actions.json
│   ├── social-referral-codes.json
│   └── thought-bubbles.json
├── docs                    # Technical documentation
│   ├── activation-testing-procedure.md
│   ├── GAMIFICATION_SETUP.md
│   ├── leaderboard-debugging.md
│   ├── NOTION_FEATURE_FLAGS.md
│   ├── RECAPTCHA_SERVICE_ACCOUNT_SPEC.md
│   └── RECAPTCHA_SETUP.md
├── donate.html
├── email                   # Email campaigns and templates
│   ├── activate-compiled.html
│   ├── activate.html
│   ├── activate.mjml
│   ├── auto_smtp.py      # Python email automation
│   ├── auto-mailto.py
│   ├── pytest.ini
│   ├── README.md
│   ├── requirements-test.txt
│   └── tests             # Email system tests
│       ├── __init__.py
│       ├── conftest.py
│       ├── fixtures
│       ├── mock_smtp_server.py
│       ├── test_auto_smtp.py
│       ├── test_integration.py
│       └── test_performance.py
├── favicon.ico
├── feeds.html
├── images                  # Static images and assets
│   ├── impact_non_sat_height_compressed.png
│   ├── impact_non_sat_height.png
│   ├── impact_non_sat_height.webp
│   └── social-share-preview-placeholder.txt
├── index.html
├── js                      # JavaScript modules
│   ├── components         # Reusable UI components
│   │   ├── counter.js
│   │   ├── share-buttons.js
│   │   └── toast.js
│   ├── config            # JS configuration files
│   │   ├── api.config.js
│   │   ├── app.config.js
│   │   └── ui.config.js
│   ├── core              # Core system modules
│   │   ├── CacheManager.js
│   │   ├── eventBus.js
│   │   ├── state-example.js
│   │   └── StateManager.js
│   ├── donate-entry.js   # Page entry points
│   ├── donate.js
│   ├── feeds-entry.js
│   ├── leaderboard-entry.js
│   ├── main-entry.js
│   ├── main.js
│   ├── modules           # Feature modules
│   │   ├── api-integration.js
│   │   ├── api-preloader.js
│   │   ├── api.js
│   │   ├── countdown.js
│   │   ├── donate-features.js
│   │   ├── feed.js
│   │   ├── feeds-page.js
│   │   ├── forms.js
│   │   ├── homepage-features.js
│   │   ├── leaderboard-features.js
│   │   ├── leaderboard.js
│   │   ├── modal.js
│   │   ├── nav-timer.js
│   │   ├── navigation-features.js
│   │   ├── navigation.js
│   │   ├── recaptcha.js
│   │   ├── referral-utils.js
│   │   ├── share-features.js
│   │   ├── share-functionality.js
│   │   └── social.js
│   ├── share-entry.js
│   └── utils             # Utility functions
│       ├── alpine-check.js
│       ├── cache.js
│       ├── debug-logger.js
│       ├── dom.js
│       ├── feature-flags.js
│       ├── include-nav.js
│       ├── templates.js
│       └── validation.js
├── leaderboard.html
├── logs                    # Application logs
│   ├── api
│   │   ├── activate-user-2025-06-28.log
│   │   └── get-leaderboard-2025-06-28.log
│   └── frontend
│       └── activation-flow-2025-06-28.log
├── maintenance.html
├── package.json
├── PRD                     # Product Requirements Documents
│   ├── community-engagement-features.md
│   ├── donations-page.md
│   ├── email-campaign-activation.md
│   ├── footer-legal-pages.md
│   ├── live-feeds-page.md
│   ├── navigation-system.md
│   ├── nstcg-modularization.md
│   ├── recaptcha.md
│   ├── referral-gamification.md
│   ├── state-management-improvements.md
│   └── vercel-local-development-setup.md
├── privacy-policy.html
├── public                  # Public assets (duplicated for deployment)
│   ├── components
│   ├── css
│   ├── data
│   └── images
├── README.md
├── screenshots             # Test failure screenshots
│   └── [Various test failure screenshots]
├── scripts                 # Build and utility scripts
│   ├── apply-org-policy.sh
│   ├── cleanup-test-databases.js
│   ├── compile-email-wrapper.js
│   ├── compile-email.js
│   ├── create-feature-flags-database.js
│   ├── create-gamification-database.js
│   ├── email-campaign.js
│   ├── launch-campaign.js
│   ├── monitor-campaign.js
│   ├── oauth-setup.js
│   ├── setup-gmail-auth.js
│   ├── test-activation-flow.js
│   ├── test-email-campaign.js
│   ├── vercel-deploy-config.js
│   └── [Additional utility scripts]
├── share.html
├── specs                   # Feature specifications
│   ├── donation-page-implementation.md
│   ├── email-campaign-implementation.md
│   ├── referral-e2e-testing-spec.md
│   └── referral-gamification-spec.md
├── terms-and-conditions.html
├── tests                   # End-to-end testing suite
│   ├── config
│   │   ├── puppeteer-config.js
│   │   └── test-constants.js
│   ├── e2e
│   │   ├── activation.test.js
│   │   ├── leaderboard.test.js
│   │   ├── referral-enhanced.test.js
│   │   ├── referral.test.js
│   │   ├── registration.test.js
│   │   └── sharing.test.js
│   ├── fixtures
│   │   └── test-users.json
│   ├── setup
│   │   ├── global-setup-enhanced.js
│   │   ├── global-setup.js
│   │   └── global-teardown.js
│   └── utils
│       ├── custom-matchers.js
│       ├── notion-helpers.js
│       ├── performance-monitor.js
│       └── test-helpers.js
├── vercel.json
└── vite.config.js

49 directories, 263 files
```

</details>

### 🏗️ Architecture Overview

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| **`api/`** | Vercel serverless functions | `submit-form.js`, `get-leaderboard.js`, `create-checkout-session.js` |
| **`css/`** | Modular CSS architecture | `base/`, `components/`, `layout/`, `utilities/` |
| **`js/`** | JavaScript modules | `core/`, `modules/`, `components/`, `utils/` |
| **`email/`** | Email campaign system | `auto_smtp.py`, `activate.mjml`, Python tests |
| **`scripts/`** | Development & deployment | Database setup, email campaigns, OAuth setup |
| **`tests/`** | E2E testing suite | Playwright tests, fixtures, custom matchers |
| **`docs/`** | Technical documentation | Setup guides, debugging procedures |
| **`PRD/`** | Product requirements | Feature specifications and requirements |
| **`specs/`** | Implementation specs | Detailed implementation guides |

### 🎯 Key Features by Directory

- **Frontend Modules** (`js/modules/`): API integration, gamification, referral system, social sharing
- **Styling System** (`css/`): Component-based CSS with base styles, utilities, and responsive design
- **Backend APIs** (`api/`): Registration, leaderboards, payments, feature flags, user analytics
- **Email System** (`email/`): MJML templates, Python automation, comprehensive testing
- **Testing Suite** (`tests/`): End-to-end tests with Playwright, performance monitoring
- **Documentation** (`docs/`, `specs/`, `PRD/`): Complete technical and product documentation

## 🔧 Development

### Prerequisites

- Node.js v22.x or higher
- npm or yarn
- Notion account with API access
- Stripe account (for payment features)
- Google reCAPTCHA account

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Notion Integration
NOTION_TOKEN=your_notion_integration_token
NOTION_DATABASE_ID=main_participant_database_id
NOTION_GAMIFICATION_DB_ID=gamification_database_id
NOTION_FEATURE_FLAGS_DB_ID=feature_flags_database_id
NOTION_DONATIONS_DB_ID=donations_database_id

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

# Google reCAPTCHA
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key

# Site Configuration
SITE_URL=http://localhost:5173  # https://nstcg.org in production

# Feature Flags (optional, can use Notion instead)
FEATURE_DONATIONS=true
FEATURE_LEADERBOARD=true
FEATURE_REFERRAL=true
```

### Running Development Servers

```bash
# Run both Vite and Vercel dev servers concurrently
npm run both

# Or run them separately:
npm run dev:vite    # Frontend on http://localhost:5173
npm run dev:vercel  # API on http://localhost:3000
```

### Building for Production

```bash
# Build the frontend assets
npm run build

# Preview production build locally
npm run preview
```

## 🚀 Deployment

### Deploy to Vercel

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   
   # For production deployment
   vercel --prod
   ```

3. **Set Environment Variables**:
   - Go to your Vercel dashboard
   - Navigate to Project Settings → Environment Variables
   - Add all required environment variables

### GitHub Integration

1. Push repository to GitHub
2. Import project in Vercel dashboard
3. Configure environment variables
4. Deploy automatically on push to main branch

## 📊 Database Setup

### 1. Create Notion Integration

1. Visit [Notion Integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Configure with these capabilities:
   - Read content
   - Update content
   - Insert content
4. Copy the integration token

### 2. Create Required Databases

Run the setup scripts:

```bash
# Create main participant database
node scripts/create-database.js

# Create gamification database
node scripts/create-gamification-database.js

# Create feature flags database
node scripts/create-feature-flags-database.js
```

Or create manually with these properties:

**Main Database**:
- Name (Title)
- Email (Email)
- First Name (Text)
- Last Name (Text)
- Source (Text)
- Timestamp (Date)
- User ID (Text)
- Referrer (Text)
- Comments (Text)
- Visitor Type (Select: Local/Tourist)

**Gamification Database**:
- Email (Email)
- Name (Title)
- Display Name (Text)
- User ID (Text)
- Referral Code (Text)
- Total Points (Number)
- [Additional point tracking fields...]

### 3. Share Databases with Integration

For each database:
1. Click "..." menu → "Add connections"
2. Search for your integration name
3. Add the connection

## 🔐 Security Features

- **Rate Limiting**: 10 requests/minute per IP for form submissions
- **Input Validation**: Client and server-side validation
- **CSRF Protection**: Token-based protection
- **Content Security Policy**: Strict CSP headers
- **Bot Protection**: Google reCAPTCHA v3 + honeypot fields
- **Data Privacy**: Email masking, opt-in features

## 📝 API Documentation

### Core Endpoints

**POST /api/submit-form**
- Handles participant registration
- Rate limited
- Returns: `{ success: true, id: "..." }`

**GET /api/get-count**
- Returns participant count
- Cached for 1 minute
- Returns: `{ count: 250 }`

**GET /api/get-leaderboard**
- Returns gamification leaderboard
- Returns: `{ leaderboard: [...], stats: {...} }`

**POST /api/create-checkout-session**
- Creates Stripe checkout session
- Returns: `{ url: "https://checkout.stripe.com/..." }`

For complete API documentation, see `architecture.md`.

## 🧪 Testing

### Local Testing

```bash
# Test form submission
curl -X POST http://localhost:3000/api/submit-form \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "firstName": "John",
    "lastName": "Doe",
    "email": "test@example.com",
    "visitorType": "local"
  }'

# Test participant count
curl http://localhost:3000/api/get-count

# Test rate limiting (run 11 times quickly)
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/submit-form \
    -H "Content-Type: application/json" \
    -d '{"name": "Test", "email": "test@example.com"}'
done
```

### Production Testing

Replace `localhost:3000` with your production domain.

## 🎮 Feature Flags

Features can be toggled via Notion database or environment variables:

1. **Via Notion** (recommended):
   - Open Feature Flags database
   - Change value to `true`, `false`, or `unset`
   - Changes take effect within 5 minutes

2. **Via Environment Variables**:
   - Set `FEATURE_*` variables
   - Redeploy to apply changes

## 📧 Email Campaigns

### Compile Email Templates

```bash
# Compile MJML to HTML
npm run compile-email

# Send test email
node scripts/test-send-email.js
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: See `architecture.md` for detailed technical documentation
- **Issues**: [GitHub Issues](https://github.com/your-username/nstcg-website/issues)
- **Contact**: support@nstcg.org

## 🙏 Acknowledgments

- North Swanage community members
- Swanage Town Council
- All contributors and supporters

---

Built with ❤️ for the North Swanage community
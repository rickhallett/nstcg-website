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

```
nstcg-website/
├── api/                    # Vercel serverless functions
├── components/            # Reusable HTML components
├── config/                # Configuration files
├── css/                   # Modular CSS architecture
├── data/                  # Static JSON data
├── docs/                  # Documentation
├── email/                 # Email templates (MJML)
├── js/                    # JavaScript modules
│   ├── components/       # UI components
│   ├── core/             # Core system modules
│   ├── modules/          # Feature modules
│   └── utils/            # Utility functions
├── scripts/               # Build and utility scripts
├── specs/                 # Feature specifications
└── *.html                # HTML pages
```

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
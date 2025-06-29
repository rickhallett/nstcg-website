# Donation Page Implementation Specification

## Overview
This document provides a comprehensive implementation guide for the NSTCG donation page with Stripe integration, live campaign cost tracking, and gamification points.

**Version:** 1.0  
**Date:** January 2025  
**Complexity:** 34 story points  
**Development Time:** 5-6 days

---

## Architecture

### Page Structure
- **Standalone Page:** `/donate.html`
- **Dedicated JavaScript:** `/js/donate.js`
- **Page-specific CSS:** `/css/pages/donate.css`
- **Vercel Functions:** API endpoints for Stripe integration

### Technology Stack
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Backend:** Vercel Serverless Functions
- **Payment:** Stripe Checkout
- **Database:** Notion API
- **Hosting:** Vercel

---

## Frontend Implementation

### 1. HTML Structure (`/donate.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Support the Campaign - NSTCG Donations</title>
  
  <!-- Shared styles -->
  <link rel="stylesheet" href="css/main.css">
  <!-- Page-specific styles -->
  <link rel="stylesheet" href="css/pages/donate.css">
  
  <!-- Font Awesome for icons -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
</head>
<body>
  <!-- Simplified Navigation -->
  <div id="navigation-placeholder"></div>
  
  <main class="donate-page">
    <!-- Hero Section -->
    <section class="donate-hero">
      <div class="container">
        <h1>Support the Campaign</h1>
        <p>Your donation helps us fight for safer streets in Swanage</p>
        
        <!-- Live Cost Counter -->
        <div class="cost-counter">
          <h2>Campaign Running Costs</h2>
          <div class="counter-display">
            <span class="currency">£</span>
            <span class="amount" id="cost-amount">0</span>
            <span class="label">and counting...</span>
          </div>
          <div class="cost-breakdown">
            <details>
              <summary>Where your money goes</summary>
              <ul>
                <li>Engineering & Development: £5,000/mo</li>
                <li>Software & Hosting: £200/mo</li>
                <li>Canvassing Materials: £500/mo</li>
              </ul>
            </details>
          </div>
        </div>
      </div>
    </section>
    
    <!-- Donation Form Section -->
    <section class="donation-form-section">
      <div class="container">
        <div class="donation-card">
          <h2>Make a Donation</h2>
          
          <!-- Amount Selection -->
          <div class="amount-selector">
            <button class="amount-btn" data-amount="10">£10</button>
            <button class="amount-btn" data-amount="25">£25</button>
            <button class="amount-btn" data-amount="50">£50</button>
            <button class="amount-btn" data-amount="100">£100</button>
            <button class="amount-btn other" data-amount="other">Other</button>
          </div>
          
          <!-- Custom Amount Input -->
          <div class="custom-amount" style="display:none;">
            <label>Enter amount (£)</label>
            <input type="number" id="custom-amount" min="1" max="1000">
          </div>
          
          <!-- Donor Info -->
          <form id="donation-form">
            <div class="form-group">
              <label>Name</label>
              <input type="text" name="name" required>
            </div>
            
            <div class="form-group">
              <label>Email</label>
              <input type="email" name="email" required>
            </div>
            
            <div class="form-group">
              <label>Message (optional)</label>
              <textarea name="message" rows="3"></textarea>
            </div>
            
            <!-- Points Preview -->
            <div class="points-preview">
              <p>You'll earn <strong id="points-preview">0</strong> leaderboard points!</p>
            </div>
            
            <button type="submit" class="donate-btn" disabled>
              Donate £<span id="selected-amount">0</span>
            </button>
          </form>
        </div>
        
        <!-- Recent Donations -->
        <div class="recent-donations">
          <h3>Recent Supporters</h3>
          <div id="donations-feed">
            <!-- Dynamic content -->
          </div>
        </div>
      </div>
    </section>
  </main>
  
  <footer class="footer">
    <p>North Swanage Community Group | Protecting Our Neighborhoods Since 2020</p>
  </footer>
  
  <!-- Stripe JS -->
  <script src="https://js.stripe.com/v3/"></script>
  <!-- Page JavaScript -->
  <script type="module" src="js/utils/include-nav.js"></script>
  <script src="js/donate.js"></script>
</body>
</html>
```

### 2. JavaScript Implementation (`/js/donate.js`)

```javascript
// Configuration
const STRIPE_PUBLISHABLE_KEY = 'pk_live_...'; // Will be set from environment
const CAMPAIGN_START_DATE = new Date('2025-01-14');
const MONTHLY_COST = 5700; // £5,700 per month

// State
let selectedAmount = 0;
let isProcessing = false;

// Initialize Stripe
const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);

// Cost Counter
function calculateCampaignCost() {
  const now = new Date();
  const monthsElapsed = (now - CAMPAIGN_START_DATE) / (1000 * 60 * 60 * 24 * 30);
  return Math.floor(monthsElapsed * MONTHLY_COST);
}

function updateCostCounter() {
  const cost = calculateCampaignCost();
  document.getElementById('cost-amount').textContent = 
    cost.toLocaleString('en-GB');
}

// Update counter every 10 seconds
setInterval(updateCostCounter, 10000);
updateCostCounter();

// Amount Selection
document.querySelectorAll('.amount-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    // Remove active class from all buttons
    document.querySelectorAll('.amount-btn').forEach(b => 
      b.classList.remove('active'));
    
    // Add active class to clicked button
    this.classList.add('active');
    
    const amount = this.dataset.amount;
    
    if (amount === 'other') {
      document.querySelector('.custom-amount').style.display = 'block';
      document.getElementById('custom-amount').focus();
    } else {
      document.querySelector('.custom-amount').style.display = 'none';
      selectedAmount = parseInt(amount);
      updateDonateButton();
      updatePointsPreview();
    }
  });
});

// Custom amount input
document.getElementById('custom-amount').addEventListener('input', function() {
  const amount = parseInt(this.value) || 0;
  if (amount >= 1 && amount <= 1000) {
    selectedAmount = amount;
    updateDonateButton();
    updatePointsPreview();
  }
});

// Update donate button
function updateDonateButton() {
  const btn = document.querySelector('.donate-btn');
  const amountSpan = document.getElementById('selected-amount');
  
  if (selectedAmount > 0) {
    btn.disabled = false;
    amountSpan.textContent = selectedAmount;
  } else {
    btn.disabled = true;
    amountSpan.textContent = '0';
  }
}

// Calculate points
function calculatePoints(amount) {
  if (amount <= 10) return 10;
  if (amount <= 25) return 30;
  if (amount <= 50) return 75;
  if (amount <= 100) return 200;
  return 500;
}

// Update points preview
function updatePointsPreview() {
  const points = calculatePoints(selectedAmount);
  document.getElementById('points-preview').textContent = points;
}

// Form submission
document.getElementById('donation-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (isProcessing || selectedAmount === 0) return;
  
  isProcessing = true;
  const submitBtn = document.querySelector('.donate-btn');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = 'Processing...';
  submitBtn.disabled = true;
  
  try {
    // Get form data
    const formData = new FormData(e.target);
    const data = {
      amount: selectedAmount * 100, // Convert to pence
      name: formData.get('name'),
      email: formData.get('email'),
      message: formData.get('message'),
      user_id: localStorage.getItem('nstcg_user_id') || null
    };
    
    // Create checkout session
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create checkout session');
    }
    
    const { sessionId } = await response.json();
    
    // Redirect to Stripe Checkout
    const { error } = await stripe.redirectToCheckout({ sessionId });
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Something went wrong. Please try again.');
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  } finally {
    isProcessing = false;
  }
});

// Load recent donations
async function loadRecentDonations() {
  try {
    const response = await fetch('/api/get-donations?limit=10');
    const data = await response.json();
    
    const feed = document.getElementById('donations-feed');
    
    if (data.donations && data.donations.length > 0) {
      feed.innerHTML = data.donations.map(donation => `
        <div class="donation-item">
          <div class="donation-amount">£${donation.amount}</div>
          <div class="donation-info">
            <div class="donation-name">${donation.name}</div>
            ${donation.message ? 
              `<div class="donation-message">"${donation.message}"</div>` : ''}
            <div class="donation-time">${getRelativeTime(donation.timestamp)}</div>
          </div>
        </div>
      `).join('');
    } else {
      feed.innerHTML = '<p class="no-donations">Be the first to donate!</p>';
    }
  } catch (error) {
    console.error('Error loading donations:', error);
  }
}

// Helper function for relative time
function getRelativeTime(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${diffDays} days ago`;
}

// Check for success/cancel return from Stripe
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('success') === 'true') {
  // Show success message
  showSuccessMessage();
} else if (urlParams.get('canceled') === 'true') {
  // Show cancellation message
  showCancelMessage();
}

// Initialize
loadRecentDonations();
// Refresh donations every 30 seconds
setInterval(loadRecentDonations, 30000);
```

### 3. CSS Implementation (`/css/pages/donate.css`)

```css
/* Donation Page Specific Styles */
.donate-page {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* Hero Section */
.donate-hero {
  padding: 60px 0;
  text-align: center;
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
}

.donate-hero h1 {
  font-size: 48px;
  font-weight: 900;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #00ff00 0%, #00cc00 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Cost Counter */
.cost-counter {
  margin-top: 40px;
  padding: 30px;
  background: rgba(0, 255, 0, 0.1);
  border: 2px solid #00ff00;
  border-radius: 10px;
  display: inline-block;
}

.counter-display {
  font-size: 36px;
  font-weight: bold;
  margin: 20px 0;
}

.counter-display .currency {
  color: #00ff00;
}

.counter-display .amount {
  color: #fff;
  font-variant-numeric: tabular-nums;
}

.cost-breakdown {
  margin-top: 20px;
  font-size: 14px;
}

.cost-breakdown summary {
  cursor: pointer;
  color: #00ff00;
  text-decoration: underline;
}

.cost-breakdown ul {
  list-style: none;
  margin-top: 10px;
  text-align: left;
}

.cost-breakdown li {
  padding: 5px 0;
  color: #ccc;
}

/* Donation Form Section */
.donation-form-section {
  padding: 60px 0;
}

.donation-card {
  max-width: 600px;
  margin: 0 auto;
  background: #2a2a2a;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

/* Amount Selector */
.amount-selector {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
}

.amount-btn {
  padding: 20px;
  background: #333;
  border: 2px solid #666;
  color: #fff;
  font-size: 20px;
  font-weight: bold;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.amount-btn:hover {
  background: #444;
  border-color: #00ff00;
}

.amount-btn.active {
  background: #00ff00;
  color: #1a1a1a;
  border-color: #00ff00;
}

/* Custom Amount */
.custom-amount {
  margin-bottom: 30px;
}

.custom-amount input {
  width: 100%;
  padding: 15px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid #666;
  border-radius: 5px;
  color: #fff;
  font-size: 18px;
}

/* Form Groups */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #ccc;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 15px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid #666;
  border-radius: 5px;
  color: #fff;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #00ff00;
}

/* Points Preview */
.points-preview {
  background: rgba(0, 255, 0, 0.1);
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
  text-align: center;
}

.points-preview strong {
  color: #00ff00;
  font-size: 24px;
}

/* Donate Button */
.donate-btn {
  width: 100%;
  padding: 20px;
  background: #00ff00;
  color: #1a1a1a;
  border: none;
  border-radius: 5px;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.donate-btn:hover:not(:disabled) {
  background: #00cc00;
  transform: translateY(-2px);
}

.donate-btn:disabled {
  background: #666;
  color: #999;
  cursor: not-allowed;
}

/* Recent Donations */
.recent-donations {
  max-width: 600px;
  margin: 60px auto 0;
}

.recent-donations h3 {
  font-size: 24px;
  margin-bottom: 20px;
  text-align: center;
}

.donation-item {
  display: flex;
  align-items: center;
  padding: 20px;
  background: #2a2a2a;
  border-radius: 10px;
  margin-bottom: 15px;
  transition: transform 0.3s ease;
}

.donation-item:hover {
  transform: translateX(5px);
}

.donation-amount {
  font-size: 24px;
  font-weight: bold;
  color: #00ff00;
  margin-right: 20px;
}

.donation-name {
  font-weight: bold;
  margin-bottom: 5px;
}

.donation-message {
  font-style: italic;
  color: #ccc;
  margin-bottom: 5px;
}

.donation-time {
  font-size: 14px;
  color: #666;
}

.no-donations {
  text-align: center;
  color: #666;
  padding: 40px;
}

/* Success/Error States */
.success-message,
.error-message {
  padding: 40px;
  text-align: center;
  border-radius: 10px;
  margin: 20px 0;
}

.success-message {
  background: rgba(0, 255, 0, 0.1);
  border: 2px solid #00ff00;
}

.error-message {
  background: rgba(255, 0, 0, 0.1);
  border: 2px solid #ff0000;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .donate-hero h1 {
    font-size: 36px;
  }
  
  .counter-display {
    font-size: 28px;
  }
  
  .donation-card {
    padding: 20px;
  }
  
  .amount-selector {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

---

## Backend Implementation

### 1. Create Checkout Session (`/api/create-checkout-session.js`)

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { amount, name, email, message, user_id } = req.body;
    
    // Validation
    if (!amount || amount < 100 || amount > 100000) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'gbp',
          product_data: {
            name: 'NSTCG Campaign Donation',
            description: 'Supporting safer streets in North Swanage',
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.SITE_URL}/donate.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_URL}/donate.html?canceled=true`,
      metadata: {
        donor_name: name,
        donor_email: email,
        message: message || '',
        user_id: user_id || '',
      },
    });
    
    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};
```

### 2. Stripe Webhook Handler (`/api/webhook/stripe.js`)

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      
      try {
        // Calculate points
        const amount = session.amount_total / 100; // Convert from pence
        let points = 0;
        if (amount <= 10) points = 10;
        else if (amount <= 25) points = 30;
        else if (amount <= 50) points = 75;
        else if (amount <= 100) points = 200;
        else points = 500;
        
        // Check if first donation
        const isFirstDonation = await checkFirstDonation(session.metadata.donor_email);
        if (isFirstDonation) points += 25;
        
        // Store donation in Notion
        await notion.pages.create({
          parent: { database_id: process.env.NOTION_DONATIONS_DB_ID },
          properties: {
            'Donation ID': { title: [{ text: { content: session.id } }] },
            'Amount': { number: amount },
            'Donor Name': { rich_text: [{ text: { content: session.metadata.donor_name } }] },
            'Donor Email': { email: session.metadata.donor_email },
            'Message': { rich_text: [{ text: { content: session.metadata.message || '' } }] },
            'Points Awarded': { number: points },
            'User ID': { rich_text: [{ text: { content: session.metadata.user_id || '' } }] },
            'Status': { select: { name: 'Completed' } },
            'Timestamp': { date: { start: new Date().toISOString() } }
          }
        });
        
        // Update user points if user_id exists
        if (session.metadata.user_id) {
          await updateUserPoints(session.metadata.user_id, points);
        }
        
      } catch (error) {
        console.error('Error processing donation:', error);
        // Don't return error - Stripe will retry
      }
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  
  res.status(200).json({ received: true });
};

async function checkFirstDonation(email) {
  // Query Notion to check if this email has donated before
  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DONATIONS_DB_ID,
      filter: {
        property: 'Donor Email',
        email: { equals: email }
      }
    });
    
    return response.results.length === 0;
  } catch (error) {
    console.error('Error checking first donation:', error);
    return false;
  }
}

async function updateUserPoints(userId, points) {
  // Update user record with new points
  // Implementation depends on your user database structure
  console.log(`Awarding ${points} points to user ${userId}`);
}
```

### 3. Get Recent Donations (`/api/get-donations.js`)

```javascript
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Cache recent donations for 1 minute
let cache = null;
let cacheTime = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Check cache
    if (cache && Date.now() - cacheTime < CACHE_DURATION) {
      return res.status(200).json(cache);
    }
    
    // Query recent donations
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DONATIONS_DB_ID,
      filter: {
        property: 'Status',
        select: { equals: 'Completed' }
      },
      sorts: [{
        property: 'Timestamp',
        direction: 'descending'
      }],
      page_size: 10
    });
    
    // Format donations for frontend
    const donations = response.results.map(page => {
      const props = page.properties;
      return {
        amount: props['Amount'].number,
        name: anonymizeName(props['Donor Name'].rich_text[0]?.text.content || 'Anonymous'),
        message: props['Message'].rich_text[0]?.text.content || '',
        timestamp: props['Timestamp'].date.start
      };
    });
    
    // Update cache
    cache = { donations };
    cacheTime = Date.now();
    
    res.status(200).json({ donations });
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({ error: 'Failed to fetch donations' });
  }
};

function anonymizeName(fullName) {
  const parts = fullName.split(' ');
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  }
  return parts[0];
}
```

---

## Environment Configuration

### Required Environment Variables

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Notion Configuration
NOTION_API_KEY=secret_...
NOTION_DATABASE_ID=...
NOTION_DONATIONS_DB_ID=...

# Site Configuration
SITE_URL=https://nstcg.org
```

### Vercel Configuration (`vercel.json` updates)

```json
{
  "functions": {
    "api/submit-form.js": {
      "maxDuration": 10
    },
    "api/get-count.js": {
      "maxDuration": 10
    },
    "api/create-checkout-session.js": {
      "maxDuration": 10
    },
    "api/webhook/stripe.js": {
      "maxDuration": 10
    },
    "api/get-donations.js": {
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; frame-src https://checkout.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com"
        }
      ]
    }
  ]
}
```

---

## Database Schema

### Notion Donations Database

| Field | Type | Description |
|-------|------|-------------|
| Donation ID | Title | Unique Stripe session ID |
| Amount | Number | Donation amount in GBP |
| Donor Name | Text | Full name of donor |
| Donor Email | Email | Email address |
| Message | Text | Optional donation message |
| Points Awarded | Number | Gamification points earned |
| User ID | Text | Link to existing user if registered |
| Status | Select | pending/completed/failed |
| Timestamp | Date | When donation was completed |

---

## Testing Strategy

### 1. Stripe Test Mode
- Use test API keys during development
- Test cards:
  - Success: 4242 4242 4242 4242
  - Decline: 4000 0000 0000 0002
  - Authentication: 4000 0025 0000 3155

### 2. Test Scenarios
- [ ] Successful donation flow
- [ ] Failed payment handling
- [ ] Webhook processing
- [ ] Points calculation
- [ ] First-time donor bonus
- [ ] Amount validation (£1-£1000)
- [ ] Custom amount entry
- [ ] Mobile responsiveness
- [ ] Network error handling

### 3. Load Testing
- Concurrent donation attempts
- Webhook processing under load
- Cost counter performance
- Recent donations caching

---

## Security Checklist

- [ ] HTTPS only enforcement
- [ ] Stripe webhook signature verification
- [ ] Input validation on all fields
- [ ] Rate limiting implementation
- [ ] CSRF protection
- [ ] XSS prevention
- [ ] SQL injection prevention (N/A - using Notion)
- [ ] Environment variables secured
- [ ] Error messages don't leak sensitive info

---

## Launch Checklist

### Pre-launch
- [ ] Test all payment flows with test cards
- [ ] Verify webhook endpoint with Stripe CLI
- [ ] Test points attribution
- [ ] Mobile device testing
- [ ] Cross-browser testing
- [ ] Performance optimization
- [ ] Security audit

### Go-live
- [ ] Switch to live Stripe keys
- [ ] Update webhook endpoint in Stripe dashboard
- [ ] Update privacy policy
- [ ] Add terms of service
- [ ] Monitor first transactions
- [ ] Check error logs

### Post-launch
- [ ] Monitor conversion rates
- [ ] Track failed payments
- [ ] Review user feedback
- [ ] Optimize based on analytics

---

## Future Enhancements

1. **Recurring Donations**
   - Monthly subscription options
   - Donor management portal
   - Automated receipts

2. **Payment Methods**
   - Apple Pay integration
   - Google Pay support
   - PayPal option

3. **Campaign Features**
   - Donation goals/thermometer
   - Matching donations
   - Corporate sponsorships

4. **Recognition System**
   - Donor tiers/badges
   - Public leaderboard
   - Thank you page personalization

5. **Analytics**
   - Conversion tracking
   - A/B testing framework
   - Donor insights dashboard

---

## Support & Maintenance

### Monitoring
- Stripe webhook failures
- Payment success rates
- API response times
- Error rates

### Common Issues
1. **Webhook failures**: Check signature, verify endpoint
2. **Payment declines**: Review Stripe logs
3. **Points not awarded**: Check Notion connection
4. **Slow loading**: Review caching strategy

### Contact
- Technical issues: kai@oceanheart.ai
- Payment issues: Check Stripe dashboard
- Database issues: Review Notion API logs
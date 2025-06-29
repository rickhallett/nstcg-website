# Product Requirements Document: Donations Page with Stripe Integration

## Feature Overview
A donation system featuring Stripe payment integration, live campaign cost tracking, and gamification points for contributors.

### Version: 1.0
### Date: January 2025
### Priority: HIGH

---

## Executive Summary

The Donations Page enables supporters to contribute financially to the NSTCG campaign while visualizing real-time campaign costs. It features a live cost counter that creates urgency, Stripe integration for secure payments, and awards leaderboard points based on donation amounts.

### Key Metrics
- **Complexity**: Large (34 story points)
- **Development Time**: 5-6 days
- **Dependencies**: Navigation System, Gamification System, Stripe Account
- **Testing Time**: 2 days

---

## User Stories

### Campaign Supporters
```
As a campaign supporter
I want to donate money easily
So that I can financially support the cause
```

### Transparency Seekers
```
As a potential donor
I want to see how funds are being used
So that I feel confident about donating
```

### Competitive Donors
```
As a competitive supporter
I want to earn points for donations
So that I can climb the leaderboard
```

---

## Technical Requirements

### Core Components

#### 1. Live Campaign Cost Counter
- **Start Date**: January 14, 2025
- **Base Costs**:
  - Engineer: £5,000/month
  - Software subscriptions: £200/month
  - Canvassing materials: £500/month
- **Counter Logic**: Increment every whole pound (~£0.21/minute)
- **Display Format**: "£X,XXX campaign costs and counting..."

#### 2. Donation Form
- **Preset Amounts**: £10, £25, £50, £100, Other
- **Minimum**: £1
- **Maximum**: £1,000
- **Payment Methods**: Card only (initially)
- **Fields**: Amount, Name, Email, Message (optional)

#### 3. Stripe Integration
- **Products**: Stripe Checkout / Payment Elements
- **Mode**: One-time payments
- **Currency**: GBP
- **Test Mode**: Required for development

#### 4. Points System
- **Points Formula**:
  - £1-10: 10 points
  - £11-25: 30 points
  - £26-50: 75 points
  - £51-100: 200 points
  - £100+: 500 points
- **Special**: First donation bonus +25 points

### Implementation Details

#### Frontend (`/donate.html`)
```html
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
                    
                    <button type="submit" class="donate-btn">
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
```

#### Backend API Endpoints

**POST /api/create-checkout-session**
```javascript
// Create Stripe checkout session
{
  amount: number, // in pence
  name: string,
  email: string,
  message?: string,
  user_id?: string // for points attribution
}
// Returns: { sessionId: string, url: string }
```

**POST /api/webhook/stripe**
```javascript
// Stripe webhook handler
// Verifies payment completion
// Awards points to user
// Stores donation record
```

**GET /api/get-donations**
```javascript
// Get recent donations (anonymized)
?limit=10
// Returns: [{
//   amount: 25,
//   name: "John D.",
//   message: "Keep fighting!",
//   timestamp: "2025-01-20T10:30:00Z"
// }]
```

#### Cost Counter Logic
```javascript
function calculateCampaignCost() {
  const startDate = new Date('2025-01-14');
  const now = new Date();
  const monthsElapsed = (now - startDate) / (1000 * 60 * 60 * 24 * 30);
  
  const monthlyCost = 5000 + 200 + 500; // £5,700
  const totalCost = Math.floor(monthsElapsed * monthlyCost);
  
  return totalCost;
}

// Update counter every 10 seconds
setInterval(() => {
  const cost = calculateCampaignCost();
  document.getElementById('cost-amount').textContent = 
    cost.toLocaleString('en-GB');
}, 10000);
```

---

## Development Breakdown

### Frontend (13 points)
- Donation form UI (4)
- Cost counter animation (3)
- Amount selection logic (2)
- Recent donations feed (2)
- Success/error states (2)

### Backend (15 points)
- Stripe integration setup (5)
- Webhook handling (4)
- Payment processing (3)
- Database updates (3)

### Infrastructure (6 points)
- Environment configuration (2)
- Security setup (2)
- Testing environment (2)

---

## BDD Scenarios

```gherkin
Feature: Campaign Donations
  As a supporter
  I want to donate to the campaign
  So that I can provide financial support

  Scenario: View donation page
    Given I navigate to /donate.html
    Then I should see the live cost counter
    And the counter should be incrementing
    And I should see donation options

  Scenario: Select preset amount
    Given I am on the donation page
    When I click the "£25" button
    Then the form should show "Donate £25"
    And I should see "30 leaderboard points" preview

  Scenario: Complete donation
    Given I have selected £50
    When I fill in my details and submit
    Then I should be redirected to Stripe checkout
    And after payment I should see success page
    And I should receive 75 points

  Scenario: View recent donations
    Given others have donated recently
    When I view the donation page
    Then I should see recent supporters
    But I should not see full names

  Scenario: Cost counter accuracy
    Given the campaign started on Jan 14
    When I view the counter on Jan 21
    Then it should show approximately £1,425
```

---

## Security Requirements

- PCI compliance via Stripe
- No card data stored locally
- HTTPS required
- CSRF protection
- Webhook signature verification
- Rate limiting on donations
- Input validation
- XSS prevention

---

## Stripe Configuration

### Products Setup
```
1. Create Stripe account
2. Generate API keys (test & live)
3. Configure webhook endpoint
4. Set up product: "NSTCG Campaign Donation"
5. Enable GBP currency
```

### Environment Variables
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=https://site.com/success
STRIPE_CANCEL_URL=https://site.com/donate
```

---

## Testing Strategy

### Test Payments
- Use Stripe test cards
- Test success/failure flows
- Verify webhook handling
- Check points attribution
- Test edge cases (£0, £1000+)

### Load Testing
- Simultaneous donations
- Webhook processing
- Counter performance
- Database writes

---

## Analytics & Reporting

- Track donation amounts
- Monitor conversion rates
- Average donation size
- Points awarded
- Failed payments
- Geographic distribution

---

## Legal Considerations

- Privacy policy update
- Terms of service update
- Donation disclaimer
- Tax implications notice
- Refund policy
- Data protection (GDPR)

---

## Future Enhancements

1. Recurring donations
2. Apple Pay / Google Pay
3. Donation goals/thermometer
4. Sponsor recognition levels
5. Tax-deductible receipts
6. Corporate sponsorships

---

## Success Criteria

- [ ] Secure payment processing works
- [ ] Cost counter displays correctly
- [ ] Points award properly
- [ ] Webhook handling is reliable
- [ ] Mobile-friendly interface
- [ ] Clear donation flow
- [ ] Legal compliance met
- [ ] Analytics tracking working
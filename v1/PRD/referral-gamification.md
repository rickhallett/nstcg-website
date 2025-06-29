# Product Requirements Document: Referral Gamification System

## Feature Overview
A comprehensive gamification system that rewards users for social media sharing and successful referrals, featuring a public leaderboard and integration with the survey flow.

### Version: 1.0
### Date: January 2025
### Priority: HIGH

---

## Executive Summary

The Referral Gamification System incentivizes community engagement by rewarding users with points for sharing the campaign and bringing new participants. It features a leaderboard, unique referral tracking, and seamless integration with the existing survey flow.

### Key Metrics
- **Complexity**: Medium (21 story points)
- **Development Time**: 4-5 days
- **Dependencies**: Navigation System, Notion Database
- **Testing Time**: 1 day

---

## User Stories

### Active Supporters
```
As an active supporter
I want to earn points for sharing the campaign
So that I can see my impact and compete with others
```

### Social Media Users
```
As a social media user
I want unique sharing links
So that I get credit when my friends join
```

### Competitive Users
```
As a competitive person
I want to see a leaderboard
So that I can strive to be a top supporter
```

---

## Technical Requirements

### System Components

#### 1. User Identification
- Generate unique user ID on registration
- Store in Notion with participant data
- Use for referral tracking

#### 2. Referral Tracking
- Unique referral codes per user
- Query parameter: `?ref=USER_ID`
- Cookie-based attribution (30 days)
- Track successful conversions

#### 3. Points System
- **Actions and Points**:
  - Social media share: 5 points
  - Successful referral: 25 points
  - First referral bonus: 10 points
  - Streak bonus: 5 points/day
- Store points in Notion database

#### 4. Leaderboard Page
- URL: `/leaderboard.html`
- Display top 100 users
- Show user's rank if not in top 100
- Weekly/monthly/all-time views

### User Flow

```
1. User completes survey → Receives unique ID
2. Shown leaderboard → Motivated to climb ranks
3. Redirected to survey with message:
   "Complete the survey first, then return to share!"
4. After survey → Access share page with unique links
5. Share on social → Earn points immediately
6. Friend clicks link → Cookie set with referrer
7. Friend completes survey → Referrer gets points
```

### Implementation Details

#### Database Schema (Notion)
```
Users Table:
- user_id (unique)
- name
- email
- total_points
- referral_count
- share_count
- created_at
- last_active

Actions Table:
- action_id
- user_id
- action_type (share/referral)
- points_earned
- timestamp
- metadata (platform/referred_user)
```

#### Share Page (`/share.html`)
```html
<main class="share-page">
    <section class="share-hero">
        <h1>Spread the Word!</h1>
        <p>Share your unique link and earn points when friends join</p>
        
        <div class="user-stats">
            <div class="stat">
                <span class="number" id="user-points">0</span>
                <span class="label">Your Points</span>
            </div>
            <div class="stat">
                <span class="number" id="user-referrals">0</span>
                <span class="label">Referrals</span>
            </div>
            <div class="stat">
                <span class="number" id="user-rank">#-</span>
                <span class="label">Rank</span>
            </div>
        </div>
    </section>
    
    <section class="share-links">
        <div class="container">
            <div class="link-box">
                <label>Your unique link:</label>
                <div class="link-input">
                    <input type="text" id="referral-link" readonly>
                    <button onclick="copyLink()">Copy</button>
                </div>
            </div>
            
            <div class="social-buttons">
                <button class="share-btn twitter" onclick="shareTwitter()">
                    Share on Twitter
                </button>
                <button class="share-btn facebook" onclick="shareFacebook()">
                    Share on Facebook
                </button>
                <button class="share-btn whatsapp" onclick="shareWhatsApp()">
                    Share on WhatsApp
                </button>
                <button class="share-btn email" onclick="shareEmail()">
                    Share via Email
                </button>
            </div>
        </div>
    </section>
</main>
```

#### API Endpoints

**POST /api/track-share**
```javascript
// Track when user clicks share button
{
  user_id: string,
  platform: 'twitter' | 'facebook' | 'whatsapp' | 'email',
  timestamp: string
}
// Returns: { points_earned: 5, total_points: 125 }
```

**GET /api/get-leaderboard**
```javascript
// Get leaderboard data
?period=all|week|month&limit=100
// Returns: [{
//   rank: 1,
//   name: "John D.",
//   points: 250,
//   referrals: 8
// }, ...]
```

**GET /api/get-user-stats**
```javascript
// Get specific user's stats
?user_id=abc123
// Returns: {
//   points: 125,
//   referrals: 4,
//   rank: 23,
//   shares: 15
// }
```

---

## Development Breakdown

### Frontend (8 points)
- Leaderboard page UI (3)
- Share page UI (2)
- Points animation (1)
- Social share integration (2)

### Backend (10 points)
- Referral tracking system (4)
- Points calculation engine (3)
- API endpoints (3)

### Database (3 points)
- Schema updates (1)
- Migration scripts (1)
- Indexes for performance (1)

---

## BDD Scenarios

```gherkin
Feature: Referral Gamification
  As a campaign supporter
  I want to earn points for spreading awareness
  So that I can help grow the movement

  Scenario: Complete survey and get referral link
    Given I complete the survey form
    When I am redirected to the share page
    Then I should see my unique referral link
    And I should see my current points (0)

  Scenario: Share on social media
    Given I am on the share page
    When I click "Share on Twitter"
    Then a pre-filled tweet should open
    And I should earn 5 points immediately
    And my point total should update

  Scenario: Successful referral
    Given I shared my link with a friend
    When they click my link and complete the survey
    Then I should earn 25 points
    And my referral count should increase

  Scenario: View leaderboard
    Given I navigate to the leaderboard
    Then I should see the top 100 users
    And I should see my own rank highlighted
    And I should be able to switch time periods

  Scenario: First-time bonus
    Given I have never made a referral
    When someone signs up using my link
    Then I should earn 25 + 10 bonus points
```

---

## TDD Test Requirements

```javascript
// Unit Tests
describe('Referral System', () => {
  test('should generate unique user IDs', () => {});
  test('should create valid referral links', () => {});
  test('should track referral cookies', () => {});
  test('should attribute conversions correctly', () => {});
});

describe('Points Calculator', () => {
  test('should award share points', () => {});
  test('should award referral points', () => {});
  test('should apply first-time bonus', () => {});
  test('should prevent duplicate points', () => {});
});

describe('Leaderboard Logic', () => {
  test('should rank users correctly', () => {});
  test('should handle ties properly', () => {});
  test('should filter by time period', () => {});
});

// Integration Tests
describe('Gamification Flow', () => {
  test('complete end-to-end referral', () => {});
  test('points sync with database', () => {});
  test('leaderboard updates in real-time', () => {});
});
```

---

## Security Considerations

- Validate all user IDs server-side
- Rate limit share tracking (max 50/day)
- Prevent self-referrals
- Sanitize leaderboard names
- CSRF protection on API endpoints

---

## Performance Requirements

- Leaderboard loads < 1 second
- Points update immediately (optimistic UI)
- Cache leaderboard (1-minute TTL)
- Index database by points, user_id
- Batch process referral attribution

---

## Analytics Tracking

- Track share button clicks
- Monitor conversion rates by source
- Measure viral coefficient
- Track daily active sharers
- Monitor points distribution

---

## Future Enhancements

1. Badges and achievements
2. Team competitions
3. Bonus point events
4. Share templates/images
5. Points redemption
6. Social proof notifications

---

## Success Criteria

- [ ] Referral tracking works accurately
- [ ] Points calculate correctly
- [ ] Leaderboard updates properly
- [ ] Social sharing works on all platforms
- [ ] No gaming/exploitation possible
- [ ] Mobile-friendly interface
- [ ] Clear user journey from survey → share
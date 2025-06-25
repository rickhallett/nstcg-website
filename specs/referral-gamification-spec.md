# Referral Gamification System Specification

## Overview
This document specifies the implementation details for the referral gamification system, including what has been built, what remains to be implemented, and how the mocked functions should be replaced with real implementations.

## System Architecture

### Frontend Components

#### 1. HTML Pages
- **share.html** - User's referral sharing dashboard
- **leaderboard.html** - Community leaderboard display

#### 2. JavaScript Modules
- **referral-tracking.js** - Core referral system logic
- **share-functionality.js** - Social sharing and UI interactions
- **leaderboard.js** - Leaderboard display and filtering

#### 3. CSS Components
- **gamification.css** - Styles for all gamification UI elements

### Backend Components (To Be Implemented)
- **api/track-share.js** - Records social sharing actions
- **api/get-leaderboard.js** - Returns leaderboard data
- **api/get-user-stats.js** - Returns individual user statistics

## Implementation Status

### ✅ Completed Components

#### share.html
- Full UI layout with user stats display
- Referral link input with copy functionality
- Social sharing buttons (Twitter/X, Facebook, WhatsApp, Email)
- Points information display
- Success tips section

#### leaderboard.html
- Podium display for top 3 users
- Filterable leaderboard table (All Time, Month, Week)
- Current user stats highlight
- Loading and empty states
- Join CTA for non-participants

### 🚧 In Progress Components

#### CSS (gamification.css)
Needs to include styles for:
- Share page components
- Leaderboard UI elements
- Animations for points updates
- Responsive design breakpoints

#### JavaScript Modules

##### referral-tracking.js
Core functionality to implement:
```javascript
// User identification
- generateUniqueUserId()
- getUserIdFromStorage()
- setUserIdInStorage()

// Referral tracking
- getReferralCodeFromURL()
- setReferralCookie(code)
- getReferralFromCookie()
- clearReferralCookie()

// API communication (mocked)
- trackReferralConversion(referredBy, newUserId)
```

##### share-functionality.js
Features to implement:
```javascript
// Initialization
- initializeSharePage()
- loadUserStats()
- generateReferralLink()

// Sharing functions
- copyLink()
- shareTwitter()
- shareFacebook()
- shareWhatsApp()
- shareEmail()

// Points tracking (mocked)
- trackShareAction(platform)
- updatePointsDisplay(points)
- animatePointsIncrease(oldPoints, newPoints)
```

##### leaderboard.js
Components to implement:
```javascript
// Data loading
- loadLeaderboardData(period)
- loadCurrentUserStats()

// Display functions
- renderPodium(topThree)
- renderLeaderboardTable(users)
- highlightCurrentUser(userId)

// Filtering
- filterByPeriod(period)
- updateTimeFilter(selectedButton)
```

### 🔄 Mock Functions

#### API Endpoints
All API endpoints will be mocked initially using localStorage and can be replaced with real Vercel functions later.

##### Mock: /api/track-share
```javascript
// Request
{
  user_id: string,
  platform: 'twitter' | 'facebook' | 'whatsapp' | 'email',
  timestamp: string
}

// Response
{
  success: boolean,
  points_earned: number,
  total_points: number,
  message?: string
}
```

##### Mock: /api/get-leaderboard
```javascript
// Request
?period=all|week|month&limit=100

// Response
{
  leaderboard: [{
    rank: number,
    user_id: string,
    name: string,
    points: number,
    referrals: number
  }],
  total_users: number,
  last_updated: string
}
```

##### Mock: /api/get-user-stats
```javascript
// Request
?user_id=abc123

// Response
{
  user_id: string,
  name: string,
  points: number,
  referrals: number,
  shares: number,
  rank: number,
  first_referral_complete: boolean,
  created_at: string
}
```

## Data Storage

### localStorage Schema
```javascript
// User data
nstcg_user_id: string
nstcg_user_name: string
nstcg_user_email: string
nstcg_user_points: number
nstcg_user_referrals: number
nstcg_share_history: Array<{platform, timestamp}>

// Mock database (for demo)
nstcg_mock_users: Array<UserObject>
nstcg_mock_actions: Array<ActionObject>
```

### Cookie Schema
```javascript
// Referral tracking (30 days)
nstcg_ref: referrer_user_id
```

## Integration Points

### With Existing Survey System
1. After survey completion, generate unique user ID
2. Store user data in Notion (currently mocked)
3. Redirect to share.html with success message
4. Check for referral cookie and attribute points

### With Navigation System
1. Include navigation using existing include-nav.js
2. Add "Leaderboard" link to main navigation
3. Show "Share" link for authenticated users

## Security Considerations

### Frontend
- Validate all user inputs
- Sanitize displayed names
- Use HTTPS for all API calls
- Implement CSRF tokens for API requests

### Backend (Future)
- Rate limiting on share tracking (50/day per user)
- Prevent self-referrals
- Validate referral codes server-side
- IP-based fraud detection

## Performance Optimizations

### Caching Strategy
- Cache leaderboard data for 1 minute
- Store user stats locally, sync periodically
- Lazy load leaderboard beyond top 20

### Loading Strategy
- Show skeleton UI while loading
- Optimistic UI updates for points
- Batch API requests where possible

## Testing Approach

### Unit Tests
```javascript
// referral-tracking.test.js
- Test unique ID generation
- Test cookie management
- Test URL parameter parsing

// share-functionality.test.js
- Test social share URL generation
- Test copy functionality
- Test points animation

// leaderboard.test.js
- Test ranking algorithm
- Test period filtering
- Test data rendering
```

### Integration Tests
- End-to-end referral flow
- Points calculation accuracy
- Leaderboard real-time updates

## Migration Path

### From Mock to Production

1. **Replace Mock API Service**
   ```javascript
   // Change from:
   import { MockAPIService } from './mock-api.js';
   
   // To:
   import { APIService } from './api-service.js';
   ```

2. **Update API Endpoints**
   - Deploy Vercel serverless functions
   - Update endpoint URLs in JavaScript
   - Add authentication headers

3. **Connect Notion Database**
   - Add Notion API credentials
   - Update database schema
   - Implement data sync

4. **Remove Mock Data**
   - Clear localStorage mock database
   - Remove mock data generation
   - Update error handling

## Future Enhancements

### Phase 2 Features
- Achievement badges system
- Team competitions
- Streak bonuses
- Custom share templates

### Phase 3 Features
- Points redemption
- Email notifications
- Social proof widgets
- Analytics dashboard

## Success Metrics

### Technical KPIs
- Page load time < 2s
- API response time < 500ms
- 99.9% uptime
- Zero data loss

### Business KPIs
- User engagement rate
- Viral coefficient > 1.0
- Average referrals per user
- Conversion rate improvement
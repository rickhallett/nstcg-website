# Enhanced Referral Banner PRD

## Executive Summary

This document outlines requirements for enhancing the referral banner system to provide personalized, engaging welcome experiences for referred users. The enhancement will display referrer information, social proof, and customized messaging to increase conversion rates and strengthen community connections.

## Problem Statement

The current referral banner system has limitations:
- Generic messaging that doesn't leverage referrer relationships
- No social proof elements to build trust
- Limited personalization based on referral source
- Missing referrer attribution visibility
- No A/B testing capabilities

These limitations result in:
- Lost opportunity to leverage social connections
- Lower conversion rates from referred traffic
- Reduced sense of community connection
- Inability to optimize messaging

## Goals & Objectives

### Primary Goals
1. Create personalized welcome experiences for referred users
2. Display social proof to increase trust and conversions
3. Show referrer attribution to strengthen connections
4. Enable dynamic messaging based on context

### Success Metrics
- 25% increase in referred user conversion rate
- 40% increase in banner engagement rate
- 15% improvement in time-to-signup for referred users
- 90% positive feedback on personalization

## User Stories

### As a Referred Visitor
- I want to see who referred me so I understand the connection
- I want to feel welcomed as part of a community
- I want to see others who joined through the same referrer
- I want relevant information based on how I arrived

### As a Referrer
- I want my referrals to see my name/info when they visit
- I want my impact to be visible to those I refer
- I want my referrals to have a great first experience

### As a Site Administrator
- I want to A/B test different banner messages
- I want to track banner performance metrics
- I want to customize messages by referral source
- I want to prevent abuse of the system

## Functional Requirements

### 1. Referrer Information Display

#### Basic Attribution
```javascript
// Display format
"Welcome! You were invited by [Referrer Name]"
"[Referrer Name] thought you'd want to join this movement"
"Join [Referrer Name] and [X] others in making a difference"
```

#### Enhanced Attribution with Avatar
- Display referrer's initials or avatar
- Show referrer's signup date
- Include referrer's comment/reason (if public)
- Display referrer's impact metrics

### 2. Social Proof Integration

#### Community Metrics
```javascript
{
  referrerName: "John Smith",
  referrerJoinDate: "2 weeks ago",
  referrerImpact: {
    directReferrals: 12,
    totalNetwork: 47,
    rank: "Top 10%"
  },
  communitySize: 1250,
  recentJoiners: ["Sarah", "Mike", "Emma"] // last 24h
}
```

#### Dynamic Social Proof Messages
- "[X] people joined through [Referrer]'s network"
- "[Y] of your neighbors have already joined"
- "Join [Count] others who signed up today"
- "[Referrer] is in the top [X]% of community advocates"

### 3. Personalized Messaging

#### Source-Based Customization
```javascript
const messageTemplates = {
  facebook: {
    headline: "Your Facebook friend {referrer} is taking action",
    subtext: "Join the movement spreading through your social network"
  },
  whatsapp: {
    headline: "{referrer} personally invited you",
    subtext: "They thought you'd want to be part of this"
  },
  email: {
    headline: "{referrer} sent you this important message",
    subtext: "Take 2 minutes to make a difference"
  },
  twitter: {
    headline: "Via {referrer} on Twitter",
    subtext: "This movement is trending in your community"
  }
};
```

#### Time-Based Variations
- First visit: Welcome-focused
- Return visit: Progress update
- Near deadline: Urgency messaging
- Post-signup: Thank you message

### 4. Visual Design System

#### Banner Layouts
```css
/* Compact Banner */
.referral-banner-compact {
  height: 60px;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #00ff00, #00cc00);
}

/* Expanded Banner */
.referral-banner-expanded {
  min-height: 120px;
  display: grid;
  grid-template-areas: 
    "avatar message"
    "avatar social-proof"
    "avatar cta";
}

/* Mobile Optimized */
@media (max-width: 768px) {
  .referral-banner {
    position: sticky;
    top: 0;
    z-index: 100;
  }
}
```

#### Animation States
- Slide in from top
- Gentle pulse for attention
- Smooth expand/collapse
- Fade out after interaction

### 5. Smart Display Logic

#### Display Conditions
```javascript
class ReferralBannerController {
  shouldShowBanner() {
    return (
      this.hasValidReferral() &&
      !this.userDismissedBanner() &&
      !this.userAlreadySignedUp() &&
      this.withinDisplayWindow() &&
      !this.exceededViewLimit()
    );
  }

  getDisplayPriority() {
    if (this.isFirstVisit()) return 'high';
    if (this.nearDeadline()) return 'urgent';
    if (this.highValueReferrer()) return 'featured';
    return 'standard';
  }
}
```

#### Dismissal Behavior
- Temporary dismiss (session)
- Permanent dismiss (localStorage)
- Auto-dismiss after signup
- Snooze option (show again later)

## Technical Requirements

### 1. Frontend Implementation

#### Banner Component Architecture
```javascript
// React/Vue/Vanilla JS Component
class EnhancedReferralBanner {
  constructor(config) {
    this.referralData = config.referralData;
    this.userPreferences = config.preferences;
    this.analyticsTracker = config.analytics;
  }

  async loadReferrerData() {
    const response = await fetch(`/api/referrer/${this.referralData.code}`);
    return response.json();
  }

  renderBanner() {
    const template = this.selectTemplate();
    const data = this.prepareDisplayData();
    return this.applyTemplate(template, data);
  }

  trackInteraction(action) {
    this.analyticsTracker.track('referral_banner_interaction', {
      action,
      referrer: this.referralData.code,
      variant: this.currentVariant
    });
  }
}
```

#### State Management
```javascript
// Banner state in localStorage/sessionStorage
const bannerState = {
  referralCode: 'JOH1A2B3C4D',
  referrerData: {
    name: 'John Smith',
    joinDate: '2024-12-15',
    impact: { /* metrics */ }
  },
  displayCount: 3,
  lastShown: '2025-01-27T10:00:00Z',
  dismissed: false,
  dismissType: null, // 'temporary', 'permanent', 'converted'
  variant: 'social-proof-v2'
};
```

### 2. Backend Implementation

#### API Endpoints
```javascript
// Get referrer information
GET /api/referrer/:code
Response: {
  "success": true,
  "referrer": {
    "displayName": "John S.",
    "joinDate": "2024-12-15",
    "avatar": "JS",
    "impact": {
      "directReferrals": 12,
      "totalNetwork": 47,
      "rank": 8,
      "percentile": 95
    },
    "publicComment": "Let's protect our neighborhood!",
    "verified": true
  },
  "communityStats": {
    "totalMembers": 1250,
    "recentJoiners": 23,
    "fromThisReferrer": 12
  }
}

// Track banner impression
POST /api/referral-banner/impression
Body: {
  "referralCode": "JOH1A2B3C4D",
  "variant": "social-proof-v2",
  "timestamp": "2025-01-27T10:00:00Z"
}

// Track banner interaction
POST /api/referral-banner/interaction
Body: {
  "referralCode": "JOH1A2B3C4D",
  "action": "click_cta",
  "variant": "social-proof-v2"
}
```

#### Privacy Controls
```javascript
// Referrer privacy settings
const privacySettings = {
  showFullName: false, // Use "John S." instead of "John Smith"
  showAvatar: true,
  showImpactMetrics: true,
  showPublicComment: true,
  allowInNetworkDisplay: true // Show in "X others in John's network"
};
```

### 3. A/B Testing Framework

#### Variant Configuration
```javascript
const bannerVariants = {
  'control': {
    template: 'basic',
    showSocialProof: false,
    showAvatar: false
  },
  'social-proof-v1': {
    template: 'enhanced',
    showSocialProof: true,
    showAvatar: false,
    socialProofType: 'network-size'
  },
  'social-proof-v2': {
    template: 'enhanced',
    showSocialProof: true,
    showAvatar: true,
    socialProofType: 'recent-joiners'
  },
  'personalized-v1': {
    template: 'personalized',
    useSourceMessaging: true,
    showAvatar: true,
    animationType: 'slide-expand'
  }
};
```

#### Testing Logic
```javascript
class ABTestManager {
  selectVariant(userId, referralCode) {
    // Consistent variant selection
    const hash = this.hashCode(userId + referralCode);
    const variants = Object.keys(this.activeTests);
    return variants[hash % variants.length];
  }

  trackConversion(variant, referralCode) {
    // Record conversion for analysis
    this.analytics.track('ab_test_conversion', {
      test: 'referral_banner',
      variant,
      referralCode,
      conversionType: 'signup'
    });
  }
}
```

## Success Metrics

### Engagement Metrics
- Banner impression rate
- Click-through rate by variant
- Dismissal rate and type
- Time to interaction

### Conversion Metrics
- Referred visitor → signup rate
- Conversion rate by variant
- Conversion rate by referrer type
- Time to conversion

### Quality Metrics
- User feedback scores
- Referrer satisfaction
- Banner relevance rating
- Technical performance (load time)

## Timeline & Milestones

### Phase 1: Basic Enhancement (Week 1-2)
- Implement referrer data fetching
- Create basic personalized messages
- Add dismissal functionality
- Deploy to 10% of traffic

### Phase 2: Social Proof (Week 3-4)
- Add community statistics
- Implement impact metrics
- Create dynamic messaging
- Expand to 50% of traffic

### Phase 3: Visual Enhancement (Week 5-6)
- Design avatar system
- Implement animations
- Create responsive layouts
- A/B test variants

### Phase 4: Full Launch (Week 7-8)
- Analyze test results
- Select winning variants
- Full deployment
- Monitor and optimize

## Risks & Mitigations

### Risk: Privacy Concerns
**Mitigation**:
- Implement granular privacy controls
- Use progressive disclosure
- Default to privacy-friendly options
- Clear opt-out mechanisms

### Risk: Banner Blindness
**Mitigation**:
- Limit display frequency
- Use subtle animations
- Relevant, personalized content
- Smart timing logic

### Risk: Performance Impact
**Mitigation**:
- Lazy load referrer data
- Cache API responses
- Optimize asset delivery
- Progressive enhancement

## Dependencies

### Technical Dependencies
- Referrer data API
- Analytics tracking system
- A/B testing framework
- CDN for assets

### Data Dependencies
- Referrer profiles
- Impact metrics
- Community statistics
- Privacy preferences

### Design Dependencies
- Brand guidelines
- Avatar system
- Animation library
- Responsive framework

## Appendix

### A. Message Template Library
```javascript
const templates = {
  welcome: [
    "Welcome! {referrer} thought you'd want to join",
    "{referrer} invited you to make a difference",
    "You're here thanks to {referrer}"
  ],
  socialProof: [
    "Join {count} others in {referrer}'s network",
    "{recent} people joined today through {referrer}",
    "{referrer} has helped bring {total} people together"
  ],
  urgency: [
    "Only {time} left to join {referrer}",
    "{referrer} and {count} others are counting on you",
    "Don't let {referrer} down - time is running out"
  ]
};
```

### B. Analytics Events
| Event | Properties | Purpose |
|-------|------------|---------|
| banner_impression | variant, referrer, source | Track views |
| banner_interaction | action, variant, referrer | Track engagement |
| banner_dismiss | type, variant, timing | Understand UX |
| banner_conversion | variant, referrer, time_to_convert | Measure success |

### C. Mobile Considerations
- Sticky positioning on scroll
- Swipe to dismiss
- Reduced content for small screens
- Touch-friendly CTAs
- Optimized load performance
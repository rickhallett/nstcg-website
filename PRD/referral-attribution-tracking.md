# Referral Attribution Tracking PRD

## Executive Summary

This document outlines the requirements for implementing comprehensive referral attribution tracking for the NSTCG platform. The enhancement will provide detailed insights into referral sources, conversion paths, and campaign effectiveness through UTM parameter support and multi-touch attribution models.

## Problem Statement

The current referral system tracks basic referral codes but lacks:
- Detailed source attribution beyond platform identification
- Campaign tracking capabilities
- Multi-touch attribution understanding
- Conversion path visibility
- Marketing ROI measurement

Without these features, the organization cannot:
- Measure campaign effectiveness
- Optimize marketing spend
- Understand user journey complexity
- Identify high-performing referral sources

## Goals & Objectives

### Primary Goals
1. Implement comprehensive UTM parameter tracking
2. Enable multi-touch attribution modeling
3. Provide conversion path visualization
4. Integrate with analytics platforms

### Success Metrics
- 100% capture rate of UTM parameters
- <50ms additional latency for tracking
- 95% attribution accuracy
- Complete conversion funnel visibility

## User Stories

### As a Marketing Manager
- I want to track campaign performance so I can optimize marketing spend
- I want to see which campaigns drive the most signups
- I want to understand the user journey from first touch to conversion

### As a Data Analyst
- I want to access raw attribution data for analysis
- I want to compare different attribution models
- I want to export data for reporting

### As a User
- I want my referral source properly credited
- I want a seamless experience regardless of tracking
- I want my privacy respected

## Functional Requirements

### 1. UTM Parameter Support
- **Capture Parameters**:
  - utm_source (required)
  - utm_medium (required)
  - utm_campaign (optional)
  - utm_term (optional)
  - utm_content (optional)
  - utm_id (optional)

- **Storage**:
  - Store in sessionStorage initially
  - Persist to localStorage for cross-session tracking
  - Include in form submission data
  - Save to database with user record

### 2. Attribution Models

#### First-Touch Attribution
- Credit 100% to first referral source
- Track initial landing parameters
- Maintain throughout user journey

#### Last-Touch Attribution
- Credit 100% to final referral source
- Update on each new referral visit
- Track conversion trigger

#### Multi-Touch Attribution
- Linear: Equal credit to all touchpoints
- Time-decay: More credit to recent touches
- Position-based: 40% first, 40% last, 20% middle
- Custom: Configurable weights

### 3. Conversion Path Tracking
- **Touchpoint Recording**:
  ```javascript
  {
    timestamp: "2025-01-27T10:30:00Z",
    source: "facebook",
    medium: "social",
    campaign: "winter-2025",
    action: "page_view",
    url: "/",
    referralCode: "JOH1A2B3C4D"
  }
  ```

- **Path Visualization**:
  - Timeline view of all interactions
  - Source breakdown by touchpoint
  - Time between touches
  - Drop-off analysis

### 4. Enhanced URL Parameter Handling
- **Parameter Parsing**:
  ```javascript
  // Support both ref and UTM parameters
  ?ref=JOH1A2B3C4D&utm_source=facebook&utm_medium=social&utm_campaign=winter-2025
  ```

- **Backward Compatibility**:
  - Continue supporting existing ref parameter
  - Map legacy src parameter to utm_source
  - Preserve all existing functionality

## Technical Requirements

### 1. Frontend Implementation

#### URL Parameter Parser
```javascript
class AttributionTracker {
  constructor() {
    this.touchpoints = [];
    this.attributionModel = 'last-touch';
  }

  parseUrlParameters() {
    const params = new URLSearchParams(window.location.search);
    const attribution = {
      // Referral parameters
      referralCode: params.get('ref'),
      source: params.get('src'),
      
      // UTM parameters
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_term: params.get('utm_term'),
      utm_content: params.get('utm_content'),
      utm_id: params.get('utm_id'),
      
      // Meta data
      timestamp: new Date().toISOString(),
      url: window.location.pathname,
      referrer: document.referrer
    };
    
    return this.cleanAttribution(attribution);
  }

  recordTouchpoint(attribution) {
    this.touchpoints.push(attribution);
    this.persistTouchpoints();
  }

  getAttribution(model = this.attributionModel) {
    switch(model) {
      case 'first-touch':
        return this.touchpoints[0];
      case 'last-touch':
        return this.touchpoints[this.touchpoints.length - 1];
      case 'linear':
        return this.calculateLinearAttribution();
      // ... other models
    }
  }
}
```

#### Storage Strategy
```javascript
// Session Storage (current session)
sessionStorage.setItem('nstcg_current_attribution', JSON.stringify(attribution));

// Local Storage (persistent)
const touchpointHistory = JSON.parse(localStorage.getItem('nstcg_touchpoints') || '[]');
touchpointHistory.push(attribution);
localStorage.setItem('nstcg_touchpoints', JSON.stringify(touchpointHistory));

// Cookie fallback (cross-domain)
document.cookie = `nstcg_attribution=${encodeURIComponent(JSON.stringify(attribution))}; max-age=2592000; path=/`;
```

### 2. Backend Implementation

#### Database Schema Updates
```sql
-- Add attribution columns to submissions table
ALTER TABLE form_submissions ADD COLUMN utm_source VARCHAR(100);
ALTER TABLE form_submissions ADD COLUMN utm_medium VARCHAR(100);
ALTER TABLE form_submissions ADD COLUMN utm_campaign VARCHAR(100);
ALTER TABLE form_submissions ADD COLUMN utm_term VARCHAR(100);
ALTER TABLE form_submissions ADD COLUMN utm_content VARCHAR(100);
ALTER TABLE form_submissions ADD COLUMN attribution_path JSON;
ALTER TABLE form_submissions ADD COLUMN first_touch_source VARCHAR(100);
ALTER TABLE form_submissions ADD COLUMN first_touch_timestamp TIMESTAMP;

-- Create attribution events table
CREATE TABLE attribution_events (
  id UUID PRIMARY KEY,
  user_id VARCHAR(50),
  session_id VARCHAR(50),
  timestamp TIMESTAMP,
  event_type VARCHAR(50),
  source VARCHAR(100),
  medium VARCHAR(100),
  campaign VARCHAR(100),
  referral_code VARCHAR(20),
  url VARCHAR(500),
  metadata JSON
);
```

#### API Endpoints
```javascript
// Track attribution event
POST /api/track-attribution
{
  "userId": "abc123",
  "sessionId": "xyz789",
  "event": {
    "type": "page_view",
    "attribution": { /* UTM params */ },
    "metadata": { /* additional data */ }
  }
}

// Get attribution report
GET /api/attribution-report?startDate=2025-01-01&endDate=2025-01-31&model=last-touch
```

### 3. Analytics Integration

#### Google Analytics 4
```javascript
// Send enhanced conversion event
gtag('event', 'sign_up', {
  'method': 'referral',
  'value': 1,
  'currency': 'GBP',
  'custom_parameters': {
    'referral_code': attribution.referralCode,
    'attribution_model': 'last-touch',
    'touchpoint_count': touchpoints.length,
    'first_touch_source': firstTouch.source
  }
});
```

#### Custom Analytics
```javascript
// Track to internal analytics
await fetch('/api/analytics/track', {
  method: 'POST',
  body: JSON.stringify({
    event: 'attribution_conversion',
    properties: {
      attribution_path: touchpoints,
      conversion_value: calculateConversionValue(),
      time_to_convert: calculateTimeToConvert()
    }
  })
});
```

## Success Metrics

### Technical Metrics
- Parameter capture rate: >99%
- Attribution accuracy: >95%
- Processing latency: <50ms
- Data completeness: >90%

### Business Metrics
- Campaign ROI visibility: 100%
- Attribution model comparison available
- Conversion path insights generated
- Marketing optimization enabled

## Timeline & Milestones

### Phase 1: UTM Parameter Capture (Week 1-2)
- Implement parameter parsing
- Add storage logic
- Update form submissions
- Test capture accuracy

### Phase 2: Attribution Models (Week 3-4)
- Implement attribution calculations
- Create model comparison tools
- Add reporting interfaces
- Validate model accuracy

### Phase 3: Analytics Integration (Week 5-6)
- Integrate with Google Analytics
- Build custom dashboards
- Create export functionality
- Launch beta testing

### Phase 4: Optimization (Week 7-8)
- Performance optimization
- Bug fixes
- Documentation
- Full rollout

## Risks & Mitigations

### Risk: Data Privacy Concerns
**Mitigation**: 
- Implement consent management
- Anonymize PII in analytics
- Comply with GDPR/privacy laws
- Provide opt-out mechanisms

### Risk: Performance Impact
**Mitigation**:
- Use efficient storage methods
- Implement data sampling for large sets
- Optimize query performance
- Add caching layers

### Risk: Attribution Accuracy
**Mitigation**:
- Implement data validation
- Cross-reference multiple sources
- Regular accuracy audits
- Fallback attribution methods

## Dependencies

### External Dependencies
- Google Analytics account
- Database schema updates
- Privacy policy updates
- Marketing team training

### Technical Dependencies
- Browser localStorage support
- URL parameter parsing
- Database JSON support
- Analytics API access

## Appendix

### A. UTM Parameter Best Practices
- Always use lowercase
- No spaces (use hyphens)
- Consistent naming conventions
- Document campaign codes

### B. Attribution Model Comparison
| Model | Use Case | Pros | Cons |
|-------|----------|------|------|
| First-Touch | Brand awareness | Simple, credits discovery | Ignores nurturing |
| Last-Touch | Conversion focus | Clear ROI | Misses journey |
| Linear | Balanced view | Fair credit | May overvalue touches |
| Time-Decay | Recent focus | Weights recency | Complex calculation |

### C. Privacy Considerations
- Hash email addresses
- Limit data retention (90 days)
- Provide data export/deletion
- Clear privacy policy
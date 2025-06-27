# Referral Analytics Integration PRD

## Executive Summary

This document outlines requirements for integrating comprehensive analytics capabilities into the NSTCG referral system. The integration will provide detailed insights into referral performance, conversion funnels, and campaign ROI through Google Analytics 4, custom dashboards, and real-time reporting.

## Problem Statement

Current analytics limitations:
- No detailed referral conversion tracking
- Limited visibility into referral paths
- Cannot measure campaign ROI effectively
- No real-time performance monitoring
- Lack of predictive insights

These gaps result in:
- Inability to optimize referral campaigns
- Unknown cost per acquisition by source
- Missing opportunities for growth
- Poor resource allocation decisions

## Goals & Objectives

### Primary Goals
1. Implement comprehensive Google Analytics 4 integration
2. Build custom referral analytics dashboard
3. Create real-time performance monitoring
4. Enable predictive analytics for referral growth

### Success Metrics
- 100% event tracking coverage
- <2 second dashboard load time
- Real-time data latency <30 seconds
- 95% data accuracy rate

## User Stories

### As a Marketing Manager
- I want to see real-time referral performance
- I want to track campaign ROI by source
- I want to identify top performing referrers
- I want to predict future growth trends

### As a Data Analyst
- I want to export detailed referral data
- I want to create custom reports
- I want to analyze conversion funnels
- I want to segment users by referral source

### As a Referrer
- I want to see my impact metrics
- I want to track my referral performance
- I want to compare my stats with others
- I want achievement notifications

### As an Administrator
- I want automated reporting
- I want anomaly detection alerts
- I want cost tracking by channel
- I want compliance reporting

## Functional Requirements

### 1. Google Analytics 4 Integration

#### Enhanced Event Tracking
```javascript
// Referral Events Schema
const referralEvents = {
  // Discovery Events
  'referral_link_generated': {
    parameters: {
      user_id: 'string',
      referral_code: 'string',
      generation_method: 'manual|auto',
      platform: 'web|mobile|api'
    }
  },
  
  // Sharing Events
  'referral_link_shared': {
    parameters: {
      referral_code: 'string',
      share_platform: 'facebook|twitter|whatsapp|email|copy',
      share_location: 'header|modal|confirmation',
      content_variant: 'string'
    }
  },
  
  // Visit Events
  'referral_link_clicked': {
    parameters: {
      referral_code: 'string',
      source_platform: 'string',
      landing_page: 'string',
      utm_source: 'string',
      utm_medium: 'string',
      utm_campaign: 'string'
    }
  },
  
  // Conversion Events
  'referral_conversion': {
    parameters: {
      referral_code: 'string',
      conversion_value: 'number',
      time_to_convert: 'number', // seconds
      touchpoint_count: 'number',
      attribution_model: 'string'
    }
  },
  
  // Engagement Events
  'referral_engagement': {
    parameters: {
      referral_code: 'string',
      engagement_type: 'view|interact|share|advocate',
      engagement_score: 'number',
      session_duration: 'number'
    }
  }
};
```

#### Custom Dimensions & Metrics
```javascript
// GA4 Custom Dimensions
const customDimensions = {
  'referral_code': {
    scope: 'user',
    description: 'Unique referral code for the user'
  },
  'referrer_code': {
    scope: 'event',
    description: 'Code of the person who referred this user'
  },
  'referral_tier': {
    scope: 'user',
    description: 'Referral network tier (direct, indirect, tertiary)'
  },
  'referral_source_type': {
    scope: 'event',
    description: 'Type of referral source (organic, paid, social)'
  },
  'conversion_path': {
    scope: 'event',
    description: 'JSON string of conversion touchpoints'
  }
};

// GA4 Custom Metrics
const customMetrics = {
  'referral_value': {
    scope: 'event',
    unit: 'currency',
    description: 'Monetary value of the referral'
  },
  'referral_score': {
    scope: 'event',
    unit: 'standard',
    description: 'Quality score of the referral (0-100)'
  },
  'network_size': {
    scope: 'user',
    unit: 'standard',
    description: 'Total size of user\'s referral network'
  },
  'conversion_rate': {
    scope: 'event',
    unit: 'percent',
    description: 'Conversion rate for this referral source'
  }
};
```

#### Enhanced Ecommerce Integration
```javascript
// Track referral as product
gtag('event', 'view_item', {
  currency: 'GBP',
  value: 0,
  items: [{
    item_id: referralCode,
    item_name: 'Community Referral',
    item_category: 'Advocacy',
    item_variant: shareMethod,
    quantity: 1
  }]
});

// Track conversion as purchase
gtag('event', 'purchase', {
  transaction_id: submissionId,
  value: referralValue,
  currency: 'GBP',
  items: [{
    item_id: referralCode,
    item_name: 'Referral Conversion',
    item_category: 'Signup',
    item_brand: referrerName,
    price: referralValue,
    quantity: 1
  }]
});
```

### 2. Custom Analytics Dashboard

#### Real-Time Metrics
```javascript
class ReferralDashboard {
  constructor() {
    this.metrics = {
      realtime: {
        activeReferralLinks: 0,
        currentVisitors: 0,
        lastHourConversions: 0,
        trendingReferrers: []
      },
      today: {
        totalShares: 0,
        totalClicks: 0,
        totalConversions: 0,
        conversionRate: 0
      },
      performance: {
        topReferrers: [],
        topCampaigns: [],
        topSources: [],
        conversionFunnel: {}
      }
    };
  }

  async updateRealtime() {
    // WebSocket connection for real-time data
    this.ws = new WebSocket('wss://analytics.nstcg.org/realtime');
    
    this.ws.on('message', (data) => {
      const event = JSON.parse(data);
      this.processRealtimeEvent(event);
      this.updateUI();
    });
  }

  calculateMetrics() {
    return {
      // Conversion Metrics
      overallConversionRate: this.conversions / this.clicks,
      avgTimeToConvert: this.totalConversionTime / this.conversions,
      avgTouchpoints: this.totalTouchpoints / this.conversions,
      
      // Engagement Metrics
      shareToClickRate: this.clicks / this.shares,
      avgSessionDuration: this.totalSessionTime / this.sessions,
      bounceRate: this.bounces / this.sessions,
      
      // Network Metrics
      viralCoefficient: this.secondaryReferrals / this.primaryReferrals,
      networkGrowthRate: this.calculateGrowthRate(),
      avgNetworkSize: this.totalNetworkSize / this.activeReferrers
    };
  }
}
```

#### Dashboard Components
```javascript
// Component: Conversion Funnel
const ConversionFunnel = {
  stages: [
    { name: 'Link Generated', count: 0, rate: 100 },
    { name: 'Link Shared', count: 0, rate: 0 },
    { name: 'Link Clicked', count: 0, rate: 0 },
    { name: 'Page Viewed', count: 0, rate: 0 },
    { name: 'Form Started', count: 0, rate: 0 },
    { name: 'Form Completed', count: 0, rate: 0 }
  ],
  
  calculateDropoff() {
    for (let i = 1; i < this.stages.length; i++) {
      const prevCount = this.stages[i-1].count;
      const currCount = this.stages[i].count;
      this.stages[i].rate = (currCount / this.stages[0].count) * 100;
      this.stages[i].dropoff = ((prevCount - currCount) / prevCount) * 100;
    }
  }
};

// Component: Referrer Leaderboard
const ReferrerLeaderboard = {
  metrics: ['total_referrals', 'conversion_rate', 'network_size', 'engagement_score'],
  timeframes: ['today', 'week', 'month', 'all_time'],
  
  async getLeaderboard(metric, timeframe) {
    const data = await fetch(`/api/analytics/leaderboard?metric=${metric}&timeframe=${timeframe}`);
    return data.json();
  }
};

// Component: Geographic Distribution
const GeographicAnalytics = {
  async getGeoData() {
    return {
      countries: await this.getCountryData(),
      regions: await this.getRegionData(),
      cities: await this.getCityData(),
      heatmap: await this.generateHeatmap()
    };
  }
};
```

### 3. Advanced Analytics Features

#### Predictive Analytics
```javascript
class PredictiveAnalytics {
  constructor() {
    this.models = {
      conversionProbability: new ConversionModel(),
      churnPrediction: new ChurnModel(),
      viralGrowth: new GrowthModel(),
      ltv: new LifetimeValueModel()
    };
  }

  async predictConversion(userData) {
    const features = {
      source: userData.referralSource,
      timeOnSite: userData.sessionDuration,
      pagesViewed: userData.pageviews,
      previousVisits: userData.visitCount,
      deviceType: userData.device,
      dayOfWeek: new Date().getDay(),
      hourOfDay: new Date().getHours()
    };
    
    return this.models.conversionProbability.predict(features);
  }

  async predictViralGrowth(referrerData) {
    const historicalData = await this.getHistoricalData(referrerData.code);
    
    return {
      expectedReferrals: this.models.viralGrowth.predict(historicalData),
      confidenceInterval: this.models.viralGrowth.getConfidenceInterval(),
      growthRate: this.models.viralGrowth.calculateGrowthRate(),
      reachSaturation: this.models.viralGrowth.estimateSaturation()
    };
  }
}
```

#### Cohort Analysis
```javascript
class CohortAnalysis {
  async analyzeCohort(cohortDefinition) {
    const cohorts = await this.defineCohorts(cohortDefinition);
    
    return {
      retention: this.calculateRetention(cohorts),
      conversion: this.calculateConversion(cohorts),
      engagement: this.calculateEngagement(cohorts),
      value: this.calculateCohortValue(cohorts)
    };
  }

  defineCohorts(definition) {
    // Group users by:
    // - Signup date
    // - Referral source
    // - First touch channel
    // - Geographic location
    // - Behavior patterns
  }

  calculateRetention(cohorts) {
    // Calculate D1, D7, D30, D90 retention
    return cohorts.map(cohort => ({
      cohortId: cohort.id,
      size: cohort.users.length,
      retention: {
        day1: this.getRetentionRate(cohort, 1),
        day7: this.getRetentionRate(cohort, 7),
        day30: this.getRetentionRate(cohort, 30),
        day90: this.getRetentionRate(cohort, 90)
      }
    }));
  }
}
```

### 4. Reporting & Exports

#### Automated Reports
```javascript
class ReportGenerator {
  schedules = [
    {
      name: 'Daily Performance',
      frequency: 'daily',
      time: '09:00',
      recipients: ['marketing@nstcg.org'],
      metrics: ['conversions', 'shares', 'clicks', 'top_referrers']
    },
    {
      name: 'Weekly Summary',
      frequency: 'weekly',
      day: 'monday',
      time: '08:00',
      recipients: ['leadership@nstcg.org'],
      metrics: ['growth', 'roi', 'cohort_analysis', 'predictions']
    },
    {
      name: 'Monthly Deep Dive',
      frequency: 'monthly',
      date: 1,
      recipients: ['board@nstcg.org'],
      template: 'executive_summary'
    }
  ];

  async generateReport(schedule) {
    const data = await this.collectMetrics(schedule.metrics);
    const report = await this.formatReport(data, schedule.template);
    
    return {
      pdf: await this.generatePDF(report),
      csv: await this.generateCSV(data),
      dashboard: await this.generateDashboardLink(data)
    };
  }
}
```

#### Data Export API
```javascript
// Export Endpoints
GET /api/analytics/export/referrals
  ?start_date=2025-01-01
  &end_date=2025-01-31
  &format=csv|json|excel
  &fields=code,conversions,value,network_size
  &aggregation=daily|weekly|monthly

GET /api/analytics/export/funnel
  ?cohort=referral_source
  &stages=all
  &format=json

POST /api/analytics/export/custom
{
  "query": {
    "metrics": ["conversions", "revenue", "engagement"],
    "dimensions": ["referral_code", "source", "date"],
    "filters": {
      "date_range": "last_30_days",
      "source": ["facebook", "twitter"]
    },
    "sort": {
      "field": "conversions",
      "order": "desc"
    }
  },
  "format": "csv",
  "delivery": "email"
}
```

### 5. Integration Architecture

#### Data Pipeline
```javascript
class AnalyticsPipeline {
  constructor() {
    this.sources = {
      frontend: new FrontendCollector(),
      backend: new BackendCollector(),
      database: new DatabaseCollector(),
      thirdParty: new ThirdPartyCollector()
    };
    
    this.processors = {
      validation: new DataValidator(),
      enrichment: new DataEnricher(),
      aggregation: new DataAggregator(),
      anonymization: new DataAnonymizer()
    };
    
    this.destinations = {
      ga4: new GoogleAnalyticsDestination(),
      bigquery: new BigQueryDestination(),
      dashboard: new DashboardDestination(),
      webhook: new WebhookDestination()
    };
  }

  async process(event) {
    // Collect from source
    let data = await this.sources[event.source].collect(event);
    
    // Process through pipeline
    for (const processor of Object.values(this.processors)) {
      data = await processor.process(data);
    }
    
    // Send to destinations
    const results = await Promise.allSettled(
      Object.values(this.destinations).map(dest => dest.send(data))
    );
    
    return this.handleResults(results);
  }
}
```

## Technical Requirements

### 1. Frontend Implementation

#### Analytics SDK
```javascript
class NSTCGAnalytics {
  constructor(config) {
    this.config = config;
    this.queue = [];
    this.initialized = false;
    
    this.providers = {
      ga4: new GA4Provider(config.ga4),
      custom: new CustomProvider(config.custom),
      debug: new DebugProvider(config.debug)
    };
  }

  async track(event, properties = {}) {
    // Enrich with default properties
    const enrichedProps = {
      ...this.getDefaultProperties(),
      ...properties,
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      user_id: this.userId
    };
    
    // Send to all providers
    return Promise.all(
      Object.values(this.providers).map(
        provider => provider.track(event, enrichedProps)
      )
    );
  }

  identify(userId, traits = {}) {
    this.userId = userId;
    return Promise.all(
      Object.values(this.providers).map(
        provider => provider.identify(userId, traits)
      )
    );
  }
}
```

### 2. Backend Implementation

#### Event Processing
```javascript
class EventProcessor {
  async processReferralEvent(event) {
    // Validate event
    const validated = await this.validate(event);
    
    // Enrich with additional data
    const enriched = await this.enrich(validated);
    
    // Calculate derived metrics
    const withMetrics = await this.calculateMetrics(enriched);
    
    // Store in database
    await this.store(withMetrics);
    
    // Forward to analytics platforms
    await this.forward(withMetrics);
    
    // Trigger real-time updates
    await this.broadcast(withMetrics);
    
    return withMetrics;
  }

  async enrich(event) {
    return {
      ...event,
      geo: await this.getGeoData(event.ip),
      device: await this.getDeviceData(event.userAgent),
      referrer: await this.getReferrerData(event.referralCode),
      campaign: await this.getCampaignData(event.utm),
      scoring: await this.calculateScores(event)
    };
  }
}
```

### 3. Database Schema

#### Analytics Tables
```sql
-- Event stream table
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  user_id VARCHAR(50),
  session_id VARCHAR(50),
  referral_code VARCHAR(20),
  properties JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  
  -- Indexes for common queries
  INDEX idx_event_type (event_type),
  INDEX idx_user_id (user_id),
  INDEX idx_referral_code (referral_code),
  INDEX idx_created_at (created_at)
);

-- Aggregated metrics table
CREATE TABLE referral_metrics (
  id UUID PRIMARY KEY,
  referral_code VARCHAR(20) UNIQUE,
  metrics JSONB,
  last_updated TIMESTAMP,
  
  -- Materialized columns for fast queries
  total_clicks INT DEFAULT 0,
  total_conversions INT DEFAULT 0,
  conversion_rate DECIMAL(5,2),
  total_value DECIMAL(10,2),
  network_size INT DEFAULT 0
);

-- User journey table
CREATE TABLE user_journeys (
  id UUID PRIMARY KEY,
  user_id VARCHAR(50),
  journey_id VARCHAR(50),
  touchpoints JSONB[],
  conversion_path TEXT[],
  attribution JSONB,
  created_at TIMESTAMP,
  converted_at TIMESTAMP
);
```

## Success Metrics

### Analytics Coverage
- Event tracking implementation: 100%
- Data collection accuracy: >99%
- Real-time processing latency: <1s
- Historical data availability: 100%

### Dashboard Performance
- Page load time: <2s
- Real-time update latency: <30s
- Report generation time: <10s
- API response time: <200ms

### Business Impact
- Referral optimization: 30% improvement
- CAC reduction: 25%
- Viral coefficient increase: 0.3
- ROI visibility: 100%

## Timeline & Milestones

### Phase 1: GA4 Setup (Week 1-2)
- Configure GA4 property
- Implement base tracking
- Set up custom dimensions
- Test data flow

### Phase 2: Dashboard Development (Week 3-4)
- Build real-time components
- Create visualization library
- Implement filtering/drilling
- Mobile optimization

### Phase 3: Advanced Analytics (Week 5-6)
- Deploy predictive models
- Set up cohort analysis
- Build attribution system
- Create custom reports

### Phase 4: Full Integration (Week 7-8)
- Connect all data sources
- Performance optimization
- User training
- Documentation

## Risks & Mitigations

### Risk: Data Privacy Compliance
**Mitigation**:
- Implement consent management
- Anonymize PII automatically
- Regular privacy audits
- GDPR/CCPA compliance tools

### Risk: Data Quality Issues
**Mitigation**:
- Automated validation rules
- Anomaly detection
- Data quality monitoring
- Regular audits

### Risk: Performance at Scale
**Mitigation**:
- Implement data sampling
- Use efficient aggregations
- CDN for static assets
- Database optimization

## Dependencies

### External Services
- Google Analytics 4 account
- Google Cloud Platform (BigQuery)
- CDN for dashboard assets
- Email service for reports

### Internal Systems
- User authentication system
- Database infrastructure
- API gateway
- Message queue system

## Appendix

### A. KPI Definitions
| KPI | Formula | Target |
|-----|---------|--------|
| Viral Coefficient | New Users / Existing Users | >1.0 |
| CAC | Marketing Spend / New Users | <£5 |
| Conversion Rate | Conversions / Clicks | >20% |
| Time to Convert | Avg(Conversion Time) | <24h |

### B. Event Tracking Matrix
| User Action | Event Name | Parameters | Platform |
|-------------|------------|------------|----------|
| Generate Link | referral_link_generated | code, method | All |
| Share Link | referral_link_shared | code, platform | All |
| Click Link | referral_link_clicked | code, source | All |
| Complete Signup | referral_conversion | code, value | All |

### C. Dashboard Mockups
[Dashboard mockups would be included here showing:
- Real-time metrics overview
- Conversion funnel visualization
- Referrer leaderboard
- Geographic heat map
- Trend analysis charts]
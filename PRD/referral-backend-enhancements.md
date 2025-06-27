# Referral Backend Enhancements PRD

## Executive Summary

This document outlines requirements for enhancing the backend infrastructure of the referral system to ensure security, scalability, and reliability. The enhancements will include anti-fraud measures, performance optimizations, automated reward distribution, and comprehensive reporting capabilities.

## Problem Statement

Current backend limitations:
- No fraud detection for referral gaming
- Limited validation of referral authenticity
- Manual reward/incentive processes
- Performance bottlenecks at scale
- Insufficient reporting capabilities

These issues result in:
- Vulnerability to referral manipulation
- Unfair advantage to bad actors
- Administrative overhead for rewards
- System degradation during viral events
- Lack of actionable insights

## Goals & Objectives

### Primary Goals
1. Implement comprehensive fraud detection
2. Automate reward distribution system
3. Build scalable referral processing pipeline
4. Create advanced reporting infrastructure

### Success Metrics
- <0.1% fraudulent referrals
- 100% automated reward distribution
- <100ms referral processing time
- 99.9% system uptime

## User Stories

### As a System Administrator
- I want automatic fraud detection to protect system integrity
- I want automated reward distribution to reduce manual work
- I want real-time monitoring of referral activity
- I want detailed reports for decision making

### As a Legitimate User
- I want fast referral link generation
- I want immediate credit for valid referrals
- I want protection from fraudulent actors
- I want transparent reward criteria

### As a Security Officer
- I want comprehensive audit trails
- I want anomaly detection alerts
- I want IP-based rate limiting
- I want pattern recognition for abuse

### As a Finance Manager
- I want accurate reward calculations
- I want budget tracking for incentives
- I want fraud cost analysis
- I want ROI reporting by channel

## Functional Requirements

### 1. Fraud Detection System

#### Multi-Layer Validation
```javascript
class FraudDetectionEngine {
  validators = {
    // Level 1: Basic Validation
    basic: {
      emailFormat: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      ipBlacklist: (ip) => !this.blacklistedIPs.includes(ip),
      userAgent: (ua) => !this.isBotUserAgent(ua),
      referralCodeFormat: (code) => /^[A-Z0-9]{10}$/.test(code)
    },

    // Level 2: Behavioral Analysis
    behavioral: {
      velocityCheck: async (userId) => {
        const recentActions = await this.getRecentActions(userId, '1h');
        return recentActions.length < this.config.maxActionsPerHour;
      },
      
      patternDetection: async (referralData) => {
        const patterns = await this.detectPatterns(referralData);
        return !patterns.includes('suspicious');
      },
      
      geoConsistency: async (ip, claimedLocation) => {
        const geoIP = await this.getGeoIP(ip);
        return this.isLocationConsistent(geoIP, claimedLocation);
      }
    },

    // Level 3: Advanced Detection
    advanced: {
      deviceFingerprinting: async (fingerprint) => {
        const deviceHistory = await this.getDeviceHistory(fingerprint);
        return this.isDeviceTrusted(deviceHistory);
      },
      
      networkAnalysis: async (referralNetwork) => {
        const analysis = await this.analyzeNetwork(referralNetwork);
        return !analysis.hasAnomalies;
      },
      
      mlScoring: async (referralData) => {
        const score = await this.mlModel.predict(referralData);
        return score > this.config.fraudThreshold;
      }
    }
  };

  async validate(referralData) {
    const results = {
      passed: [],
      failed: [],
      score: 100
    };

    // Run validators in parallel by level
    for (const [level, validators] of Object.entries(this.validators)) {
      const levelResults = await Promise.allSettled(
        Object.entries(validators).map(async ([name, validator]) => ({
          name,
          result: await validator(referralData)
        }))
      );

      levelResults.forEach(({ value }) => {
        if (value.result) {
          results.passed.push(value.name);
        } else {
          results.failed.push(value.name);
          results.score -= this.getValidatorWeight(value.name);
        }
      });

      // Early exit if critical failure
      if (results.score < this.config.minScoreByLevel[level]) {
        break;
      }
    }

    return {
      isValid: results.score >= this.config.minPassingScore,
      score: results.score,
      details: results,
      action: this.determineAction(results.score)
    };
  }
}
```

#### Pattern Recognition
```javascript
class PatternRecognition {
  patterns = {
    // Suspicious timing patterns
    rapidFire: {
      description: 'Multiple referrals in short timespan',
      detect: (actions) => {
        const timeWindow = 60000; // 1 minute
        const threshold = 5;
        
        return this.findClusters(actions, timeWindow).some(
          cluster => cluster.length > threshold
        );
      }
    },

    // Suspicious network patterns
    circularReferral: {
      description: 'Users referring each other in circles',
      detect: async (network) => {
        const graph = await this.buildGraph(network);
        return this.detectCycles(graph);
      }
    },

    // Suspicious behavior patterns
    singleUseEmails: {
      description: 'Disposable email addresses',
      detect: async (email) => {
        const domain = email.split('@')[1];
        return this.disposableEmailDomains.includes(domain) ||
               await this.checkDisposableEmailAPI(domain);
      }
    },

    // Bot patterns
    automatedBehavior: {
      description: 'Indicators of automated activity',
      detect: (sessionData) => {
        const indicators = [
          sessionData.mouseMovements === 0,
          sessionData.keystrokes === 0,
          sessionData.scrollEvents === 0,
          sessionData.timeOnPage < 1000, // Less than 1 second
          sessionData.directFormSubmit === true
        ];
        
        return indicators.filter(Boolean).length >= 3;
      }
    }
  };

  async detectAllPatterns(data) {
    const detectedPatterns = [];
    
    for (const [name, pattern] of Object.entries(this.patterns)) {
      try {
        if (await pattern.detect(data)) {
          detectedPatterns.push({
            name,
            description: pattern.description,
            severity: this.getSeverity(name),
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error(`Pattern detection failed for ${name}:`, error);
      }
    }
    
    return detectedPatterns;
  }
}
```

### 2. Automated Reward System

#### Reward Configuration
```javascript
const rewardConfig = {
  // Point-based rewards
  points: {
    registration: 10,
    firstReferral: 25,
    referralConversion: 50,
    milestoneBonus: {
      5: 50,    // 5 referrals
      10: 100,  // 10 referrals
      25: 300,  // 25 referrals
      50: 750,  // 50 referrals
      100: 2000 // 100 referrals
    },
    qualityMultipliers: {
      highEngagement: 1.5,
      verifiedEmail: 1.2,
      completedProfile: 1.1
    }
  },

  // Monetary rewards
  monetary: {
    enabled: true,
    currency: 'GBP',
    conversionRate: 0.01, // 1 point = £0.01
    minPayout: 10.00,     // £10 minimum
    maxPayout: 500.00,    // £500 maximum
    payoutMethods: ['bank_transfer', 'paypal', 'charity_donation']
  },

  // Non-monetary rewards
  perks: {
    badges: {
      pioneer: { requirement: 'first_referral', icon: 'medal' },
      influencer: { requirement: 'referrals_25', icon: 'star' },
      ambassador: { requirement: 'referrals_100', icon: 'crown' }
    },
    features: {
      customURL: { requirement: 'referrals_10' },
      analytics: { requirement: 'referrals_25' },
      apiAccess: { requirement: 'referrals_50' }
    }
  }
};
```

#### Reward Processing Engine
```javascript
class RewardProcessor {
  constructor() {
    this.queue = new Queue('reward-processing');
    this.ledger = new RewardLedger();
  }

  async processReferralReward(referralEvent) {
    // Validate eligibility
    const eligibility = await this.checkEligibility(referralEvent);
    if (!eligibility.isEligible) {
      return this.logIneligible(referralEvent, eligibility.reason);
    }

    // Calculate rewards
    const rewards = await this.calculateRewards(referralEvent);

    // Create transactions
    const transactions = [];
    
    // Point transaction
    if (rewards.points > 0) {
      transactions.push({
        type: 'points',
        userId: referralEvent.referrerId,
        amount: rewards.points,
        reason: referralEvent.type,
        metadata: referralEvent
      });
    }

    // Monetary transaction (if applicable)
    if (rewards.monetary > 0) {
      transactions.push({
        type: 'monetary',
        userId: referralEvent.referrerId,
        amount: rewards.monetary,
        currency: rewardConfig.monetary.currency,
        status: 'pending',
        method: null // To be selected by user
      });
    }

    // Process transactions
    const results = await this.ledger.processTransactions(transactions);

    // Check for milestones
    await this.checkMilestones(referralEvent.referrerId);

    // Send notifications
    await this.notifyUser(referralEvent.referrerId, rewards);

    return results;
  }

  async calculateRewards(event) {
    let points = 0;
    let monetary = 0;

    // Base points
    switch (event.type) {
      case 'referral_signup':
        points = rewardConfig.points.referralConversion;
        break;
      case 'first_referral':
        points = rewardConfig.points.firstReferral;
        break;
      default:
        points = rewardConfig.points.registration;
    }

    // Apply multipliers
    const multipliers = await this.getMultipliers(event);
    points = Math.floor(points * multipliers.total);

    // Calculate monetary value
    if (rewardConfig.monetary.enabled) {
      monetary = points * rewardConfig.monetary.conversionRate;
      monetary = Math.min(monetary, rewardConfig.monetary.maxPayout);
    }

    return { points, monetary, multipliers };
  }

  async distributeRewards() {
    // Process pending monetary rewards
    const pendingPayouts = await this.ledger.getPendingPayouts();
    
    for (const payout of pendingPayouts) {
      try {
        // Verify balance
        const balance = await this.ledger.getBalance(payout.userId);
        if (balance.monetary < payout.amount) {
          throw new Error('Insufficient balance');
        }

        // Process payment
        const result = await this.processPayment(payout);
        
        // Update ledger
        await this.ledger.updateTransaction(payout.id, {
          status: 'completed',
          completedAt: new Date(),
          transactionId: result.transactionId
        });

      } catch (error) {
        await this.handlePayoutError(payout, error);
      }
    }
  }
}
```

### 3. Performance Optimization

#### Caching Strategy
```javascript
class ReferralCache {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD
    });
    
    this.layers = {
      hot: { ttl: 300, prefix: 'hot:' },      // 5 minutes
      warm: { ttl: 3600, prefix: 'warm:' },   // 1 hour
      cold: { ttl: 86400, prefix: 'cold:' }   // 24 hours
    };
  }

  async get(key, layer = 'warm') {
    const cacheKey = `${this.layers[layer].prefix}${key}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      // Update access patterns
      await this.updateAccessPattern(key);
      return JSON.parse(cached);
    }
    
    return null;
  }

  async set(key, value, layer = 'warm') {
    const cacheKey = `${this.layers[layer].prefix}${key}`;
    const ttl = this.layers[layer].ttl;
    
    await this.redis.setex(
      cacheKey,
      ttl,
      JSON.stringify(value)
    );
    
    // Promote to hot cache if frequently accessed
    if (await this.shouldPromote(key)) {
      await this.promote(key, value, 'hot');
    }
  }

  async invalidate(pattern) {
    const keys = await this.redis.keys(`*${pattern}*`);
    if (keys.length > 0) {
      await this.redis.del(keys);
    }
  }

  // Implement cache warming
  async warmCache() {
    const popularReferrers = await this.getPopularReferrers();
    
    for (const referrer of popularReferrers) {
      const data = await this.fetchReferrerData(referrer);
      await this.set(`referrer:${referrer.code}`, data, 'warm');
    }
  }
}
```

#### Queue Processing
```javascript
class ReferralQueue {
  constructor() {
    this.bullQueue = new Bull('referral-processing', {
      redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
      },
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });

    this.setupProcessors();
    this.setupEventHandlers();
  }

  setupProcessors() {
    // Main processor with concurrency
    this.bullQueue.process('referral', 10, async (job) => {
      const { referralData } = job.data;
      
      // Process referral
      const result = await this.processReferral(referralData);
      
      // Update progress
      job.progress(100);
      
      return result;
    });

    // Priority processor for VIP referrers
    this.bullQueue.process('priority-referral', 5, async (job) => {
      const { referralData } = job.data;
      return await this.processPriorityReferral(referralData);
    });

    // Batch processor for bulk operations
    this.bullQueue.process('batch-referral', 2, async (job) => {
      const { referrals } = job.data;
      const results = [];
      
      for (let i = 0; i < referrals.length; i++) {
        results.push(await this.processReferral(referrals[i]));
        job.progress((i + 1) / referrals.length * 100);
      }
      
      return results;
    });
  }

  async addReferral(referralData, options = {}) {
    // Determine priority
    const priority = await this.calculatePriority(referralData);
    
    // Add to appropriate queue
    if (priority > 8) {
      return this.bullQueue.add('priority-referral', { referralData }, {
        priority: 1,
        delay: 0
      });
    } else {
      return this.bullQueue.add('referral', { referralData }, {
        priority,
        ...options
      });
    }
  }
}
```

### 4. Reporting Infrastructure

#### Report Generation System
```javascript
class ReportingEngine {
  reports = {
    // Real-time dashboards
    realtime: {
      referralActivity: {
        metrics: ['active_links', 'clicks_per_minute', 'conversions_per_hour'],
        refresh: 5000, // 5 seconds
        retention: 3600 // 1 hour
      },
      
      fraudMonitoring: {
        metrics: ['fraud_attempts', 'blocked_ips', 'suspicious_patterns'],
        refresh: 10000, // 10 seconds
        alerts: true
      }
    },

    // Scheduled reports
    scheduled: {
      daily: {
        performanceSummary: {
          metrics: ['total_referrals', 'conversion_rate', 'top_referrers', 'fraud_rate'],
          recipients: ['admin@nstcg.org'],
          time: '09:00'
        },
        
        financialSummary: {
          metrics: ['rewards_distributed', 'cost_per_acquisition', 'roi_by_channel'],
          recipients: ['finance@nstcg.org'],
          time: '10:00'
        }
      },

      weekly: {
        trendAnalysis: {
          metrics: ['growth_rate', 'retention_cohorts', 'channel_performance'],
          recipients: ['marketing@nstcg.org'],
          time: 'monday_08:00'
        }
      },

      monthly: {
        comprehensiveReport: {
          sections: ['executive_summary', 'detailed_metrics', 'recommendations'],
          recipients: ['board@nstcg.org'],
          day: 1
        }
      }
    },

    // On-demand reports
    custom: {
      referrerProfile: {
        parameters: ['referrer_code', 'date_range'],
        metrics: ['personal_stats', 'network_analysis', 'earning_history']
      },
      
      campaignAnalysis: {
        parameters: ['campaign_id', 'date_range'],
        metrics: ['attribution', 'funnel_analysis', 'roi_calculation']
      }
    }
  };

  async generateReport(type, config) {
    const reportConfig = this.reports[type.category][type.name];
    
    // Collect data
    const data = await this.collectData(reportConfig.metrics, config.parameters);
    
    // Process and aggregate
    const processed = await this.processData(data, reportConfig);
    
    // Generate visualizations
    const visualizations = await this.createVisualizations(processed);
    
    // Format report
    const report = await this.formatReport({
      type,
      data: processed,
      visualizations,
      config
    });
    
    // Deliver report
    await this.deliverReport(report, reportConfig.recipients);
    
    return report;
  }

  async createVisualizations(data) {
    const charts = {
      conversionFunnel: await this.createFunnelChart(data.funnel),
      growthTrend: await this.createLineChart(data.growth),
      referrerDistribution: await this.createPieChart(data.distribution),
      geographicHeatmap: await this.createHeatmap(data.geographic)
    };
    
    return charts;
  }
}
```

#### Analytics Pipeline
```javascript
class AnalyticsPipeline {
  constructor() {
    this.stream = new Kinesis.Stream('referral-events');
    this.processor = new Lambda.Function('process-referral-analytics');
    this.storage = new S3.Bucket('referral-analytics');
    this.warehouse = new BigQuery.Dataset('referral_data');
  }

  async ingestEvent(event) {
    // Add metadata
    const enrichedEvent = {
      ...event,
      ingested_at: new Date().toISOString(),
      processing_version: '2.0',
      server_region: process.env.AWS_REGION
    };
    
    // Send to stream
    await this.stream.putRecord({
      Data: JSON.stringify(enrichedEvent),
      PartitionKey: event.referral_code
    });
  }

  async processStream() {
    // Lambda processes stream records
    this.processor.handler = async (records) => {
      const processed = await Promise.all(
        records.map(record => this.processRecord(record))
      );
      
      // Batch write to data warehouse
      await this.warehouse.table('events').insert(processed);
      
      // Archive raw events
      await this.archiveEvents(records);
      
      return { processed: processed.length };
    };
  }

  async runETL() {
    // Daily ETL job
    const pipeline = new Glue.Job('referral-etl', {
      script: `
        -- Extract from events table
        WITH daily_events AS (
          SELECT * FROM events 
          WHERE DATE(ingested_at) = CURRENT_DATE() - 1
        ),
        
        -- Transform and aggregate
        daily_metrics AS (
          SELECT 
            referral_code,
            COUNT(*) as event_count,
            COUNT(DISTINCT user_id) as unique_users,
            SUM(CASE WHEN event_type = 'conversion' THEN 1 ELSE 0 END) as conversions
          FROM daily_events
          GROUP BY referral_code
        )
        
        -- Load into metrics table
        INSERT INTO daily_referral_metrics
        SELECT * FROM daily_metrics;
      `
    });
    
    return pipeline.run();
  }
}
```

### 5. Security Enhancements

#### API Security
```javascript
class APISecurityLayer {
  constructor() {
    this.rateLimiter = new RateLimiter({
      windowMs: 60000, // 1 minute
      max: 100, // requests per window
      keyGenerator: (req) => req.ip + ':' + req.user?.id,
      handler: (req, res) => {
        res.status(429).json({
          error: 'Too many requests',
          retryAfter: req.rateLimit.resetTime
        });
      }
    });

    this.encryption = new Encryption({
      algorithm: 'aes-256-gcm',
      keyRotation: true,
      keyRotationInterval: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
  }

  validateRequest(req) {
    // API key validation
    if (!this.isValidAPIKey(req.headers['x-api-key'])) {
      throw new Error('Invalid API key');
    }

    // Signature verification
    if (!this.verifySignature(req)) {
      throw new Error('Invalid request signature');
    }

    // Timestamp validation (prevent replay attacks)
    if (!this.isValidTimestamp(req.headers['x-timestamp'])) {
      throw new Error('Request expired');
    }

    return true;
  }

  encryptSensitiveData(data) {
    const sensitive = ['email', 'ip_address', 'payment_info'];
    
    const encrypted = { ...data };
    for (const field of sensitive) {
      if (encrypted[field]) {
        encrypted[field] = this.encryption.encrypt(encrypted[field]);
      }
    }
    
    return encrypted;
  }
}
```

## Technical Requirements

### 1. Infrastructure

#### Microservices Architecture
```yaml
services:
  referral-api:
    image: nstcg/referral-api:latest
    replicas: 3
    resources:
      cpu: 2
      memory: 4Gi
    autoscaling:
      min: 3
      max: 10
      targetCPU: 70

  fraud-detection:
    image: nstcg/fraud-detection:latest
    replicas: 2
    resources:
      cpu: 4
      memory: 8Gi
      gpu: 1 # For ML models

  reward-processor:
    image: nstcg/reward-processor:latest
    replicas: 2
    resources:
      cpu: 2
      memory: 4Gi

  analytics-pipeline:
    image: nstcg/analytics:latest
    replicas: 1
    resources:
      cpu: 8
      memory: 16Gi
```

#### Database Design
```sql
-- Referral tracking table with partitioning
CREATE TABLE referrals (
  id UUID PRIMARY KEY,
  referral_code VARCHAR(20) NOT NULL,
  referrer_id VARCHAR(50),
  referred_email VARCHAR(255),
  status VARCHAR(50),
  source VARCHAR(50),
  metadata JSONB,
  fraud_score DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT NOW(),
  converted_at TIMESTAMP,
  
  -- Indexes
  INDEX idx_referral_code (referral_code),
  INDEX idx_referrer_id (referrer_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) PARTITION BY RANGE (created_at);

-- Fraud detection table
CREATE TABLE fraud_events (
  id UUID PRIMARY KEY,
  event_type VARCHAR(50),
  user_id VARCHAR(50),
  ip_address INET,
  details JSONB,
  action_taken VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_user_fraud (user_id, created_at),
  INDEX idx_ip_fraud (ip_address, created_at)
);

-- Rewards ledger with double-entry bookkeeping
CREATE TABLE reward_ledger (
  id UUID PRIMARY KEY,
  transaction_id UUID UNIQUE,
  user_id VARCHAR(50),
  type VARCHAR(20), -- debit/credit
  category VARCHAR(50), -- points/monetary
  amount DECIMAL(10,2),
  balance DECIMAL(10,2),
  reference_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_user_ledger (user_id, created_at),
  INDEX idx_transaction (transaction_id)
);
```

### 2. Monitoring & Alerting

#### Metrics Collection
```javascript
const metrics = {
  // Application metrics
  referrals: {
    created: new Counter('referrals_created_total'),
    validated: new Counter('referrals_validated_total'),
    converted: new Counter('referrals_converted_total'),
    fraudulent: new Counter('referrals_fraudulent_total')
  },

  // Performance metrics
  performance: {
    processingTime: new Histogram('referral_processing_duration_ms'),
    queueSize: new Gauge('referral_queue_size'),
    cacheHitRate: new Gauge('referral_cache_hit_rate')
  },

  // Business metrics
  business: {
    rewardsDistributed: new Counter('rewards_distributed_total'),
    costPerAcquisition: new Gauge('cost_per_acquisition'),
    viralCoefficient: new Gauge('viral_coefficient')
  }
};

// Prometheus endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});
```

## Success Metrics

### Security Metrics
- Fraud detection rate: >99%
- False positive rate: <1%
- Security incident response: <5 minutes
- API authentication success: 100%

### Performance Metrics
- API response time: <100ms (p95)
- Queue processing time: <500ms
- Cache hit rate: >80%
- System uptime: 99.9%

### Business Metrics
- Reward distribution accuracy: 100%
- Cost per acquisition: <£5
- Referral conversion rate: >20%
- Report generation time: <30s

## Timeline & Milestones

### Phase 1: Security Foundation (Week 1-2)
- Implement fraud detection
- Add API security layer
- Set up monitoring
- Deploy rate limiting

### Phase 2: Automation (Week 3-4)
- Build reward system
- Create distribution pipeline
- Implement ledger
- Test automation

### Phase 3: Performance (Week 5-6)
- Optimize caching
- Implement queue system
- Database optimization
- Load testing

### Phase 4: Analytics (Week 7-8)
- Deploy reporting system
- Create dashboards
- Set up alerts
- Full integration

## Risks & Mitigations

### Risk: Sophisticated Fraud
**Mitigation**:
- ML-based detection
- Behavioral analysis
- Network graph analysis
- Manual review queue

### Risk: System Overload
**Mitigation**:
- Auto-scaling infrastructure
- Circuit breakers
- Graceful degradation
- Load balancing

### Risk: Payment Failures
**Mitigation**:
- Multiple payment providers
- Retry mechanisms
- Manual fallback
- Clear communication

## Dependencies

### External Services
- Payment processors (Stripe, PayPal)
- Email service (SendGrid)
- SMS service (Twilio)
- ML platform (AWS SageMaker)

### Infrastructure
- Kubernetes cluster
- Redis cluster
- PostgreSQL cluster
- Message queue (RabbitMQ/Kafka)

## Appendix

### A. Fraud Patterns Reference
| Pattern | Description | Severity | Action |
|---------|-------------|----------|--------|
| Velocity | >10 referrals/hour | High | Block |
| Circular | A→B→C→A referrals | Critical | Investigate |
| Bot | No human behavior | High | Challenge |
| Duplicate | Same IP/device | Medium | Warn |

### B. Reward Calculation Matrix
| Action | Base Points | Multipliers | Max Points |
|--------|-------------|-------------|------------|
| Signup | 10 | Quality: 1.0-2.0 | 20 |
| Referral | 50 | Engagement: 1.0-1.5 | 75 |
| Milestone | Variable | Achievement: 1.0-3.0 | 6000 |

### C. Performance Benchmarks
- Fraud check: <50ms
- Reward calculation: <20ms
- Queue processing: <500ms
- Report generation: <30s
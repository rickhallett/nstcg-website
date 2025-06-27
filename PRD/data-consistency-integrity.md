# Data Consistency & Integrity - Product Requirements Document

## Document Information
- **Author**: Development Team
- **Date**: January 2025
- **Version**: 1.0
- **Status**: Draft
- **Priority**: High

## Issue Assessment
- **Priority**: HIGH
- **Complexity**: 21 (Fibonacci)
- **Risk Level**: High
- **Time Estimate**: 5-6 weeks

### Priority Justification
- Duplicate data undermines system integrity
- Cache inconsistency causes user confusion
- Transaction failures lead to partial states
- Data corruption risks increase over time

### Complexity Breakdown
- Distributed locking implementation (8)
- Transaction rollback mechanisms (5)
- Cache synchronization across services (5)
- Data migration and cleanup (3)

## Executive Summary
This PRD addresses critical data consistency and integrity issues in the NSTCG platform, including duplicate referral codes, incomplete email deduplication, cache synchronization problems, and lack of transactional guarantees. These fixes are essential for maintaining data accuracy and user trust.

## Problem Statement

### Current Data Integrity Issues

1. **Referral Code Duplication**
   - No uniqueness validation before generation
   - Random generation can produce duplicates
   - No database constraints to prevent duplicates
   - No collision detection or retry mechanism

2. **Email Deduplication Flaws**
   - Only checks recent in-memory submissions (30 seconds)
   - Database check happens after memory check
   - Race conditions allow duplicate submissions
   - Case sensitivity issues in email comparison

3. **Cache Inconsistency**
   - Different TTLs across endpoints (1-15 minutes)
   - No coordinated cache invalidation
   - Stale data served after updates
   - Cache and database can diverge

4. **Transaction Integrity**
   - No atomic operations for multi-step processes
   - Gamification profile creation can partially fail
   - Points allocation not transactional
   - No rollback mechanism for failures

## Goals & Objectives

### Primary Goals
1. Achieve 100% referral code uniqueness
2. Prevent all duplicate email submissions
3. Ensure cache-database consistency
4. Implement full transactional integrity

### Success Metrics
- Zero duplicate referral codes in production
- Zero duplicate email registrations
- < 1 second cache-database divergence
- 100% transaction completion or rollback

## User Stories

### As a User
- I want my unique referral code to always work
- I want clear feedback if I've already registered
- I want to see real-time accurate data
- I want my points and rewards to be reliable

### As an Administrator
- I want accurate user counts and statistics
- I want data integrity reports
- I want to prevent gaming of the system
- I want reliable audit trails

### As a Developer
- I want consistent data access patterns
- I want clear transaction boundaries
- I want automated integrity checks
- I want comprehensive logging

## Technical Requirements

### 1. Referral Code Uniqueness

#### Enhanced Generation Algorithm
```javascript
class ReferralCodeGenerator {
  constructor(db) {
    this.db = db;
    this.maxRetries = 10;
  }
  
  async generate(firstName) {
    for (let i = 0; i < this.maxRetries; i++) {
      const code = this.createCode(firstName, i);
      
      // Check uniqueness
      const exists = await this.db.checkReferralCode(code);
      if (!exists) {
        // Reserve the code atomically
        const reserved = await this.db.reserveReferralCode(code);
        if (reserved) {
          return code;
        }
      }
    }
    
    // Fallback to UUID-based code
    return this.createUUIDCode(firstName);
  }
  
  createCode(firstName, attempt) {
    const prefix = firstName.slice(0, 3).toUpperCase().padEnd(3, 'X');
    const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    const suffix = attempt > 0 ? attempt.toString(36).toUpperCase() : '';
    return `${prefix}${timestamp}${random}${suffix}`;
  }
  
  createUUIDCode(firstName) {
    const prefix = firstName.slice(0, 2).toUpperCase();
    const uuid = crypto.randomUUID().split('-')[0].toUpperCase();
    return `${prefix}${uuid}`;
  }
}
```

#### Database Constraints
```sql
-- Add unique constraint to referral_code column
ALTER TABLE users 
ADD CONSTRAINT unique_referral_code 
UNIQUE (referral_code);

-- Add index for fast lookups
CREATE INDEX idx_referral_code 
ON users(referral_code);
```

### 2. Email Deduplication System

#### Comprehensive Duplicate Prevention
```javascript
class EmailDeduplication {
  constructor(db, cache) {
    this.db = db;
    this.cache = cache;
    this.pendingSubmissions = new Map();
  }
  
  async checkAndReserve(email) {
    const normalizedEmail = this.normalizeEmail(email);
    
    // 1. Check if submission is in progress
    if (this.pendingSubmissions.has(normalizedEmail)) {
      return { 
        allowed: false, 
        reason: 'submission_in_progress' 
      };
    }
    
    // 2. Mark as pending
    this.pendingSubmissions.set(normalizedEmail, Date.now());
    
    try {
      // 3. Check cache (fast path)
      const cached = await this.cache.get(`email:${normalizedEmail}`);
      if (cached) {
        return { 
          allowed: false, 
          reason: 'recently_submitted' 
        };
      }
      
      // 4. Check database with lock
      const exists = await this.db.transaction(async (trx) => {
        // Lock the row for this email
        const result = await trx('users')
          .where('email', normalizedEmail)
          .forUpdate()
          .first();
        
        if (result) {
          return true;
        }
        
        // Reserve the email
        await trx('email_reservations').insert({
          email: normalizedEmail,
          reserved_at: new Date(),
          expires_at: new Date(Date.now() + 60000) // 1 minute
        });
        
        return false;
      });
      
      if (exists) {
        return { 
          allowed: false, 
          reason: 'email_exists' 
        };
      }
      
      // 5. Add to cache
      await this.cache.set(
        `email:${normalizedEmail}`, 
        true, 
        { ttl: 300 } // 5 minutes
      );
      
      return { 
        allowed: true 
      };
      
    } finally {
      // Clean up pending submission
      this.pendingSubmissions.delete(normalizedEmail);
    }
  }
  
  normalizeEmail(email) {
    // Lowercase and trim
    email = email.toLowerCase().trim();
    
    // Handle Gmail aliases
    if (email.includes('@gmail.com')) {
      const [local, domain] = email.split('@');
      // Remove dots and everything after +
      const normalized = local.replace(/\./g, '').split('+')[0];
      return `${normalized}@${domain}`;
    }
    
    return email;
  }
}
```

### 3. Cache Synchronization

#### Coordinated Cache Management
```javascript
class CacheCoordinator {
  constructor(redis, config) {
    this.redis = redis;
    this.config = config;
    this.subscribers = new Map();
  }
  
  async set(key, value, options = {}) {
    const ttl = options.ttl || this.config.defaultTTL;
    const version = Date.now();
    
    // Store with version
    const cacheData = {
      value,
      version,
      expires: Date.now() + ttl * 1000
    };
    
    await this.redis.setex(
      key, 
      ttl, 
      JSON.stringify(cacheData)
    );
    
    // Publish invalidation event
    await this.redis.publish('cache:invalidate', JSON.stringify({
      key,
      version,
      action: 'set'
    }));
    
    return version;
  }
  
  async get(key) {
    const cached = await this.redis.get(key);
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    
    // Check if expired
    if (Date.now() > data.expires) {
      await this.redis.del(key);
      return null;
    }
    
    return data.value;
  }
  
  async invalidate(pattern) {
    const keys = await this.redis.keys(pattern);
    if (keys.length === 0) return;
    
    await this.redis.del(...keys);
    
    // Publish bulk invalidation
    await this.redis.publish('cache:invalidate', JSON.stringify({
      pattern,
      action: 'invalidate',
      keys: keys.length
    }));
  }
  
  subscribe(pattern, callback) {
    if (!this.subscribers.has(pattern)) {
      this.subscribers.set(pattern, new Set());
    }
    this.subscribers.get(pattern).add(callback);
  }
}
```

#### Cache Configuration Standards
```javascript
const CACHE_CONFIG = {
  // Entity-based TTLs
  'user:*': 300,        // 5 minutes
  'count:*': 60,        // 1 minute
  'leaderboard:*': 120, // 2 minutes
  'features:*': 900,    // 15 minutes
  
  // Operation-based TTLs
  'session:*': 1800,    // 30 minutes
  'rate:*': 60,         // 1 minute
  'temp:*': 300,        // 5 minutes
  
  // Default
  default: 300          // 5 minutes
};
```

### 4. Transaction Management

#### Distributed Transaction Coordinator
```javascript
class TransactionManager {
  constructor(db, eventStore) {
    this.db = db;
    this.eventStore = eventStore;
    this.sagas = new Map();
  }
  
  async executeTransaction(steps) {
    const transactionId = crypto.randomUUID();
    const saga = {
      id: transactionId,
      steps: steps,
      completed: [],
      status: 'pending'
    };
    
    this.sagas.set(transactionId, saga);
    
    try {
      // Record transaction start
      await this.eventStore.append({
        transactionId,
        type: 'TransactionStarted',
        timestamp: new Date(),
        steps: steps.map(s => s.name)
      });
      
      // Execute each step
      for (const step of steps) {
        try {
          const result = await this.executeStep(step, transactionId);
          saga.completed.push({
            step: step.name,
            result,
            timestamp: new Date()
          });
          
          await this.eventStore.append({
            transactionId,
            type: 'StepCompleted',
            step: step.name,
            result
          });
          
        } catch (error) {
          // Step failed - begin rollback
          saga.status = 'rolling_back';
          await this.rollback(saga, error);
          throw error;
        }
      }
      
      // All steps completed successfully
      saga.status = 'completed';
      await this.eventStore.append({
        transactionId,
        type: 'TransactionCompleted',
        timestamp: new Date()
      });
      
      return {
        transactionId,
        status: 'completed',
        results: saga.completed
      };
      
    } finally {
      // Clean up after delay
      setTimeout(() => {
        this.sagas.delete(transactionId);
      }, 300000); // 5 minutes
    }
  }
  
  async executeStep(step, transactionId) {
    const context = {
      transactionId,
      db: this.db
    };
    
    return await step.execute(context);
  }
  
  async rollback(saga, error) {
    await this.eventStore.append({
      transactionId: saga.id,
      type: 'RollbackStarted',
      error: error.message,
      timestamp: new Date()
    });
    
    // Rollback in reverse order
    for (let i = saga.completed.length - 1; i >= 0; i--) {
      const completed = saga.completed[i];
      const step = saga.steps.find(s => s.name === completed.step);
      
      if (step.rollback) {
        try {
          await step.rollback(completed.result);
          
          await this.eventStore.append({
            transactionId: saga.id,
            type: 'StepRolledBack',
            step: step.name,
            timestamp: new Date()
          });
          
        } catch (rollbackError) {
          // Log but continue rollback
          await this.eventStore.append({
            transactionId: saga.id,
            type: 'RollbackFailed',
            step: step.name,
            error: rollbackError.message
          });
        }
      }
    }
    
    saga.status = 'rolled_back';
  }
}
```

#### Example Transaction: User Registration with Gamification
```javascript
const registrationTransaction = [
  {
    name: 'CreateUser',
    execute: async (context) => {
      const userId = await context.db.insert('users', {
        email: context.email,
        name: context.name,
        referral_code: context.referralCode
      });
      return { userId };
    },
    rollback: async (result) => {
      await db.delete('users', { id: result.userId });
    }
  },
  {
    name: 'CreateGamificationProfile',
    execute: async (context) => {
      const profileId = await context.db.insert('gamification_profiles', {
        user_id: context.userId,
        points: 10,
        referral_code: context.referralCode
      });
      return { profileId };
    },
    rollback: async (result) => {
      await db.delete('gamification_profiles', { id: result.profileId });
    }
  },
  {
    name: 'ProcessReferralBonus',
    execute: async (context) => {
      if (context.referrer) {
        await context.db.update(
          'gamification_profiles',
          { referral_code: context.referrer },
          { 
            points: db.raw('points + ?', [25]),
            referral_count: db.raw('referral_count + 1')
          }
        );
        return { referrer: context.referrer, points: 25 };
      }
      return null;
    },
    rollback: async (result) => {
      if (result) {
        await db.update(
          'gamification_profiles',
          { referral_code: result.referrer },
          { 
            points: db.raw('points - ?', [result.points]),
            referral_count: db.raw('referral_count - 1')
          }
        );
      }
    }
  }
];
```

## Implementation Plan

### Phase 1: Referral Code Uniqueness (Week 1)
1. Implement enhanced generation algorithm
2. Add database constraints
3. Create uniqueness validation service
4. Add monitoring and alerts

### Phase 2: Email Deduplication (Week 2)
1. Implement comprehensive deduplication
2. Add email normalization
3. Create reservation system
4. Add duplicate detection monitoring

### Phase 3: Cache Synchronization (Week 3)
1. Implement cache coordinator
2. Standardize TTL configuration
3. Add cache invalidation events
4. Create cache monitoring dashboard

### Phase 4: Transaction Management (Week 4)
1. Implement transaction manager
2. Convert critical operations to transactions
3. Add saga pattern for long-running operations
4. Create transaction monitoring

## Data Migration Strategy

### Existing Data Cleanup
1. **Duplicate Referral Codes**
   - Identify duplicates
   - Generate new codes for conflicts
   - Notify affected users

2. **Duplicate Emails**
   - Identify duplicate registrations
   - Merge or archive duplicates
   - Update related records

3. **Cache Consistency**
   - Clear all caches
   - Rebuild from database
   - Validate consistency

## Monitoring & Validation

### Integrity Checks
```javascript
const integrityChecks = {
  referralCodeUniqueness: async () => {
    const duplicates = await db.raw(`
      SELECT referral_code, COUNT(*) as count
      FROM users
      GROUP BY referral_code
      HAVING COUNT(*) > 1
    `);
    return duplicates.length === 0;
  },
  
  emailUniqueness: async () => {
    const duplicates = await db.raw(`
      SELECT LOWER(email) as email, COUNT(*) as count
      FROM users
      GROUP BY LOWER(email)
      HAVING COUNT(*) > 1
    `);
    return duplicates.length === 0;
  },
  
  cacheConsistency: async () => {
    const sample = await db.select('id', 'updated_at')
      .from('users')
      .orderBy('random()')
      .limit(100);
      
    for (const user of sample) {
      const cached = await cache.get(`user:${user.id}`);
      if (cached && cached.updated_at !== user.updated_at) {
        return false;
      }
    }
    return true;
  }
};
```

### Alerts Configuration
- Duplicate referral code detected
- Duplicate email submission blocked
- Cache inconsistency > 5%
- Transaction rollback rate > 1%

## Success Criteria

### Immediate Goals
- Zero duplicate referral codes
- Zero duplicate email registrations
- 99.9% cache consistency
- 99.9% transaction success rate

### Long-term Goals
- Automated data quality monitoring
- Self-healing data corrections
- Real-time integrity validation
- Zero data inconsistency incidents

## Appendix

### Tools & Technologies
- PostgreSQL for ACID compliance
- Redis for distributed caching
- Apache Kafka for event streaming
- Datadog for monitoring

### References
- CAP theorem and consistency models
- Saga pattern for distributed transactions
- Event sourcing best practices
- Database constraint optimization
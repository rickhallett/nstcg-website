# Referral Code Persistence Logic PRD

## Executive Summary

This document outlines requirements for implementing robust referral code persistence across sessions, devices, and multiple referral sources. The system will ensure referral attribution is maintained throughout the user journey while handling edge cases and conflicting referral sources intelligently.

## Problem Statement

Current referral tracking limitations:
- Session-only storage loses attribution on browser close
- No cross-device attribution tracking
- Cannot handle multiple referral exposures
- No referral expiration logic
- Lost attribution after browser data clearing

These issues result in:
- Inaccurate referral attribution (30-40% loss)
- Unfair crediting to referrers
- Poor user experience with lost context
- Inability to understand referral influence patterns

## Goals & Objectives

### Primary Goals
1. Implement persistent referral storage across sessions
2. Handle multiple referral source scenarios
3. Create intelligent attribution conflict resolution
4. Establish referral expiration policies

### Success Metrics
- <5% referral attribution loss rate
- 100% cross-session persistence
- 95% accurate multi-source attribution
- Zero data conflicts or corruption

## User Stories

### As a Referred User
- I want my referral to be remembered even if I close my browser
- I want proper credit given to the person who referred me
- I want the system to remember me across devices (when logged in)
- I don't want to see referral prompts after signing up

### As a Referrer
- I want credit for users I refer, even if they sign up later
- I want my referrals tracked accurately across their journey
- I want fair attribution when multiple people refer the same user

### As an Administrator
- I want to configure referral expiration policies
- I want to track multi-touch referral patterns
- I want to prevent referral gaming/abuse
- I want accurate attribution reporting

## Functional Requirements

### 1. Storage Hierarchy

#### Primary Storage Layers
```javascript
// Priority order for referral data storage
const storageHierarchy = {
  1: 'serverSide',      // Most reliable, requires auth
  2: 'indexedDB',       // Large capacity, persistent
  3: 'localStorage',    // Simple, widely supported
  4: 'sessionStorage',  // Fallback for privacy mode
  5: 'cookies',         // Cross-subdomain support
  6: 'memory'          // Ultimate fallback
};
```

#### Storage Schema
```javascript
const referralData = {
  version: '2.0',
  primary: {
    code: 'JOH1A2B3C4D',
    source: 'facebook',
    timestamp: '2025-01-27T10:00:00Z',
    expires: '2025-04-27T10:00:00Z'
  },
  history: [
    {
      code: 'SAR5E6F7G8H',
      source: 'email',
      timestamp: '2025-01-20T15:00:00Z',
      interaction: 'view'
    }
  ],
  metadata: {
    deviceId: 'device-uuid',
    sessionCount: 3,
    lastAccessed: '2025-01-27T10:00:00Z'
  }
};
```

### 2. Multi-Source Attribution

#### Attribution Models
```javascript
class MultiSourceAttribution {
  // First-Touch: Credit first referrer
  firstTouch(history) {
    return history[0];
  }

  // Last-Touch: Credit most recent referrer
  lastTouch(history) {
    return history[history.length - 1];
  }

  // Most-Frequent: Credit referrer with most touches
  mostFrequent(history) {
    const frequency = {};
    history.forEach(item => {
      frequency[item.code] = (frequency[item.code] || 0) + 1;
    });
    return Object.keys(frequency).reduce((a, b) => 
      frequency[a] > frequency[b] ? a : b
    );
  }

  // Time-Weighted: Recent referrals get more credit
  timeWeighted(history) {
    const now = Date.now();
    const weights = history.map(item => ({
      ...item,
      weight: 1 / (1 + (now - new Date(item.timestamp)) / (1000 * 60 * 60 * 24))
    }));
    return weights.reduce((a, b) => a.weight > b.weight ? a : b);
  }

  // Interaction-Based: Credit based on engagement level
  interactionBased(history) {
    const scores = { view: 1, click: 2, share: 3, advocate: 4 };
    return history.reduce((a, b) => 
      scores[a.interaction] > scores[b.interaction] ? a : b
    );
  }
}
```

#### Conflict Resolution Rules
```javascript
const conflictResolution = {
  rules: [
    {
      name: 'DirectOverrides',
      condition: (current, new) => new.source === 'direct_share',
      action: 'replace'
    },
    {
      name: 'VerifiedUpgrade',
      condition: (current, new) => !current.verified && new.verified,
      action: 'replace'
    },
    {
      name: 'SameReferrerUpdate',
      condition: (current, new) => current.code === new.code,
      action: 'update_timestamp'
    },
    {
      name: 'ExpiredReplacement',
      condition: (current) => new Date(current.expires) < new Date(),
      action: 'replace'
    },
    {
      name: 'DefaultAddToHistory',
      condition: () => true,
      action: 'add_to_history'
    }
  ]
};
```

### 3. Persistence Implementation

#### Storage Manager
```javascript
class ReferralPersistenceManager {
  constructor() {
    this.storageAdapters = {
      indexedDB: new IndexedDBAdapter(),
      localStorage: new LocalStorageAdapter(),
      cookies: new CookieAdapter(),
      memory: new MemoryAdapter()
    };
  }

  async save(referralData) {
    const results = await Promise.allSettled([
      this.saveToIndexedDB(referralData),
      this.saveToLocalStorage(referralData),
      this.saveToCookies(referralData)
    ]);
    
    // Log storage failures for monitoring
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn(`Storage failed: ${Object.keys(this.storageAdapters)[index]}`);
      }
    });
    
    return results.some(r => r.status === 'fulfilled');
  }

  async load() {
    // Try each storage method in priority order
    for (const [method, adapter] of Object.entries(this.storageAdapters)) {
      try {
        const data = await adapter.get('referral_data');
        if (data && this.isValid(data)) {
          // Sync to other storage methods
          this.syncToOtherStorages(method, data);
          return data;
        }
      } catch (error) {
        console.warn(`Failed to load from ${method}:`, error);
      }
    }
    return null;
  }

  isValid(data) {
    return data && 
           data.version === CURRENT_VERSION &&
           new Date(data.primary.expires) > new Date() &&
           this.validateChecksum(data);
  }
}
```

#### IndexedDB Implementation
```javascript
class IndexedDBAdapter {
  constructor() {
    this.dbName = 'NSTCG_Referrals';
    this.version = 1;
    this.storeName = 'referrals';
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('code', 'primary.code', { unique: false });
          store.createIndex('expires', 'primary.expires', { unique: false });
        }
      };
    });
  }

  async save(data) {
    const db = await this.init();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.put({ ...data, id: 'current' });
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
}
```

### 4. Expiration Logic

#### Expiration Rules
```javascript
const expirationConfig = {
  default: {
    duration: 90 * 24 * 60 * 60 * 1000, // 90 days
    extendOnInteraction: true,
    maxExtensions: 3
  },
  bySource: {
    email: { duration: 120 * 24 * 60 * 60 * 1000 }, // 120 days
    social: { duration: 60 * 24 * 60 * 60 * 1000 }, // 60 days
    direct: { duration: 180 * 24 * 60 * 60 * 1000 }, // 180 days
    paid: { duration: 30 * 24 * 60 * 60 * 1000 }    // 30 days
  },
  byInteraction: {
    view: { multiplier: 1.0 },
    click: { multiplier: 1.5 },
    share: { multiplier: 2.0 },
    signup: { multiplier: 0 } // Expire immediately after conversion
  }
};

class ExpirationManager {
  calculateExpiration(referral) {
    const baseConfig = expirationConfig.bySource[referral.source] || expirationConfig.default;
    const interactionMultiplier = expirationConfig.byInteraction[referral.lastInteraction]?.multiplier || 1;
    
    const duration = baseConfig.duration * interactionMultiplier;
    return new Date(Date.now() + duration).toISOString();
  }

  shouldExtend(referral, interaction) {
    const config = expirationConfig.default;
    return config.extendOnInteraction && 
           referral.extensions < config.maxExtensions &&
           this.isHighValueInteraction(interaction);
  }

  cleanup() {
    // Run periodically to remove expired data
    setInterval(async () => {
      const data = await this.storage.getAll();
      const now = new Date();
      
      for (const item of data) {
        if (new Date(item.expires) < now) {
          await this.storage.remove(item.id);
          this.analytics.track('referral_expired', item);
        }
      }
    }, 24 * 60 * 60 * 1000); // Daily
  }
}
```

### 5. Cross-Device Synchronization

#### Sync Strategy
```javascript
class CrossDeviceSync {
  async syncOnLogin(userId) {
    // Get local referral data
    const localData = await this.persistence.load();
    
    // Fetch server-side data
    const serverData = await this.api.getReferralData(userId);
    
    // Merge strategies
    const merged = this.mergeReferralData(localData, serverData);
    
    // Save merged data
    await this.api.saveReferralData(userId, merged);
    await this.persistence.save(merged);
    
    return merged;
  }

  mergeReferralData(local, server) {
    if (!local && !server) return null;
    if (!local) return server;
    if (!server) return local;
    
    // Merge histories
    const mergedHistory = this.mergeHistories(
      local.history || [], 
      server.history || []
    );
    
    // Determine primary referral
    const primary = this.selectPrimary(local.primary, server.primary);
    
    return {
      version: CURRENT_VERSION,
      primary,
      history: mergedHistory,
      metadata: {
        lastSynced: new Date().toISOString(),
        syncedDevices: [...(local.metadata?.syncedDevices || []), this.deviceId]
      }
    };
  }
}
```

## Technical Requirements

### 1. Storage Adapters

#### LocalStorage Adapter
```javascript
class LocalStorageAdapter {
  constructor() {
    this.prefix = 'nstcg_referral_';
    this.maxSize = 5 * 1024; // 5KB limit
  }

  async save(key, data) {
    try {
      const serialized = JSON.stringify(data);
      
      // Check size limit
      if (serialized.length > this.maxSize) {
        // Compress or trim data
        data = this.trimHistory(data);
      }
      
      localStorage.setItem(this.prefix + key, serialized);
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        // Clear old data and retry
        this.clearOldData();
        return this.save(key, data);
      }
      throw e;
    }
  }

  trimHistory(data) {
    // Keep only last 10 history items
    return {
      ...data,
      history: data.history.slice(-10)
    };
  }
}
```

#### Cookie Adapter
```javascript
class CookieAdapter {
  constructor() {
    this.cookieName = 'nstcg_ref';
    this.maxAge = 90 * 24 * 60 * 60; // 90 days
    this.domain = '.nstcg.org'; // Allow subdomain access
  }

  save(data) {
    // Compress data for cookie storage
    const compressed = this.compress(data);
    
    document.cookie = `${this.cookieName}=${encodeURIComponent(compressed)}; ` +
                     `max-age=${this.maxAge}; ` +
                     `domain=${this.domain}; ` +
                     `path=/; ` +
                     `SameSite=Lax; ` +
                     `Secure`;
  }

  compress(data) {
    // Keep only essential data for cookies
    return JSON.stringify({
      p: data.primary.code,
      s: data.primary.source,
      t: data.primary.timestamp,
      e: data.primary.expires
    });
  }
}
```

### 2. Data Migration

#### Version Migration
```javascript
class DataMigration {
  migrations = {
    '1.0_to_2.0': (oldData) => ({
      version: '2.0',
      primary: {
        code: oldData.referralCode,
        source: oldData.source || 'unknown',
        timestamp: oldData.timestamp,
        expires: this.calculateExpiration(oldData)
      },
      history: [],
      metadata: {
        migrated: true,
        migratedFrom: '1.0'
      }
    })
  };

  migrate(data) {
    if (!data.version) {
      // Assume v1.0 for versionless data
      return this.migrations['1.0_to_2.0'](data);
    }
    
    // Apply migrations sequentially
    let migrated = data;
    for (const [key, migration] of Object.entries(this.migrations)) {
      const [from, to] = key.split('_to_');
      if (migrated.version === from) {
        migrated = migration(migrated);
      }
    }
    
    return migrated;
  }
}
```

### 3. API Integration

#### Server-Side Persistence
```javascript
// API Endpoints
POST /api/referral/save
{
  "userId": "user123",
  "referralData": { /* full referral object */ },
  "deviceId": "device-uuid"
}

GET /api/referral/load/:userId

POST /api/referral/merge
{
  "userId": "user123",
  "localData": { /* local referral data */ },
  "conflictResolution": "last-touch"
}

// Cleanup endpoint
DELETE /api/referral/expired
```

## Success Metrics

### Persistence Metrics
- Storage success rate: >99.9%
- Data recovery rate: >95%
- Cross-session persistence: 100%
- Sync success rate: >98%

### Attribution Metrics
- Attribution accuracy: >95%
- Multi-source tracking: 100%
- Conflict resolution success: >99%
- Expiration compliance: 100%

### Performance Metrics
- Storage operation time: <50ms
- Load time: <100ms
- Sync time: <500ms
- Memory footprint: <1MB

## Timeline & Milestones

### Phase 1: Core Persistence (Week 1-2)
- Implement storage adapters
- Create persistence manager
- Add basic save/load functionality
- Unit test coverage

### Phase 2: Multi-Source Logic (Week 3-4)
- Build attribution models
- Implement conflict resolution
- Add history tracking
- Integration testing

### Phase 3: Advanced Features (Week 5-6)
- Add expiration logic
- Implement data migration
- Create sync functionality
- Performance optimization

### Phase 4: Production Rollout (Week 7-8)
- Gradual rollout (10%, 50%, 100%)
- Monitor metrics
- Fix edge cases
- Documentation

## Risks & Mitigations

### Risk: Storage Limitations
**Mitigation**:
- Implement data compression
- Use multiple storage methods
- Regular cleanup of old data
- Graceful degradation

### Risk: Browser Privacy Modes
**Mitigation**:
- Detect private mode
- Fallback to session storage
- Server-side backup
- Clear user messaging

### Risk: Data Corruption
**Mitigation**:
- Implement checksums
- Regular validation
- Backup storage methods
- Recovery procedures

## Dependencies

### Browser Requirements
- IndexedDB support
- localStorage availability
- Cookie support
- ES6+ JavaScript

### Infrastructure
- API endpoints for sync
- Database for server storage
- CDN for library delivery
- Monitoring system

## Appendix

### A. Storage Comparison
| Method | Capacity | Persistence | Cross-Domain | Privacy Mode |
|--------|----------|-------------|--------------|--------------|
| IndexedDB | >50MB | Permanent | No | Limited |
| localStorage | 5-10MB | Permanent | No | Blocked |
| sessionStorage | 5-10MB | Session | No | Works |
| Cookies | 4KB | Configurable | Yes | Limited |

### B. Attribution Model Selection
```javascript
const modelSelection = {
  'e-commerce': 'last-touch',
  'b2b-long-cycle': 'multi-touch',
  'viral-growth': 'first-touch',
  'community': 'time-weighted',
  'advocacy': 'interaction-based'
};
```

### C. Privacy Considerations
- Comply with GDPR/CCPA
- Implement data retention limits
- Provide clear opt-out options
- Encrypt sensitive data
- Regular privacy audits
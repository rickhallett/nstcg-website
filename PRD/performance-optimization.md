# Performance Optimization - Product Requirements Document

## Document Information
- **Author**: Development Team
- **Date**: January 2025
- **Version**: 1.0
- **Status**: Draft
- **Priority**: High

## Issue Assessment
- **Priority**: HIGH
- **Complexity**: 21 (Fibonacci)
- **Risk Level**: Medium
- **Time Estimate**: 5-6 weeks

### Priority Justification
- 3-second delays severely impact user experience
- Memory leaks cause server instability
- Inefficient pagination affects scalability
- Bundle size impacts mobile performance

### Complexity Breakdown
- Lazy loading implementation across all components (8)
- Memory leak detection and fixes (5)
- Database query optimization (5)
- Bundle splitting and optimization (3)

## Executive Summary
This PRD addresses critical performance issues in the NSTCG website, including memory leaks, inefficient database queries, and suboptimal caching strategies. These optimizations will significantly improve user experience and reduce infrastructure costs.

## Problem Statement

### Current Performance Issues

1. **Memory Leaks**
   - `recentSubmissions` Map grows indefinitely in submit-form.js
   - Polling intervals never cleared on page navigation
   - Event listeners not removed when DOM elements are replaced
   - StateManager doesn't limit state size

2. **Inefficient Database Operations**
   - get-count.js fetches all records just to count them
   - No connection pooling for Notion API
   - Pagination implementation returns undefined cursor
   - Multiple redundant API calls on page load

3. **Frontend Performance**
   - 3-second artificial delay for map loading
   - No debouncing on form validations
   - Multiple DOM queries for same elements
   - Synchronous operations blocking UI

4. **Caching Inefficiencies**
   - Inconsistent cache TTLs across endpoints
   - No cache warming strategy
   - Cache invalidation not coordinated
   - No edge caching implementation

## Goals & Objectives

### Primary Goals
1. Reduce memory usage by 60%
2. Decrease API response times by 70%
3. Improve page load time to under 2 seconds
4. Achieve 90+ Lighthouse performance score

### Success Metrics
- Memory usage stays under 50MB
- P95 API response time < 200ms
- First Contentful Paint < 1.2s
- Time to Interactive < 2.5s
- Zero memory leak detection in monitoring

## User Stories

### As a User
- I want pages to load instantly without delays
- I want smooth interactions without lag
- I want the site to work well on slower devices

### As a Site Administrator
- I want reduced server costs
- I want better resource utilization
- I want predictable performance scaling

### As a Developer
- I want efficient code patterns
- I want performance monitoring tools
- I want clear optimization guidelines

## Technical Requirements

### 1. Memory Leak Fixes

#### Map Size Limiting
```javascript
class LimitedMap extends Map {
  constructor(maxSize = 1000) {
    super();
    this.maxSize = maxSize;
  }
  
  set(key, value) {
    if (this.size >= this.maxSize) {
      const firstKey = this.keys().next().value;
      this.delete(firstKey);
    }
    return super.set(key, value);
  }
}

// Usage in submit-form.js
const recentSubmissions = new LimitedMap(1000);
```

#### Cleanup Utilities
```javascript
class CleanupManager {
  constructor() {
    this.cleanups = new Set();
  }
  
  register(cleanup) {
    this.cleanups.add(cleanup);
    return () => this.cleanups.delete(cleanup);
  }
  
  cleanup() {
    this.cleanups.forEach(fn => fn());
    this.cleanups.clear();
  }
}

// Usage
const cleanup = new CleanupManager();
window.addEventListener('beforeunload', () => cleanup.cleanup());
```

### 2. Database Query Optimization

#### Efficient Count Implementation
```javascript
// New count endpoint using aggregation
async function getEffientCount() {
  const response = await fetch(
    `https://api.notion.com/v1/databases/${DB_ID}/query`,
    {
      method: 'POST',
      headers: notionHeaders,
      body: JSON.stringify({
        page_size: 1,
        filter: {
          property: 'Status',
          select: { equals: 'Active' }
        }
      })
    }
  );
  
  // Use Notion's built-in aggregation when available
  // For now, use cursor-based counting
  let count = 0;
  let cursor = undefined;
  
  do {
    const res = await fetch(`/count-endpoint?cursor=${cursor}`);
    const data = await res.json();
    count += data.count;
    cursor = data.next_cursor;
  } while (cursor);
  
  return count;
}
```

#### Connection Pooling
```javascript
class NotionConnectionPool {
  constructor(config) {
    this.pool = [];
    this.maxConnections = config.maxConnections || 10;
    this.timeout = config.timeout || 5000;
  }
  
  async query(params) {
    const connection = await this.getConnection();
    try {
      return await connection.query(params);
    } finally {
      this.releaseConnection(connection);
    }
  }
}
```

### 3. Frontend Optimization

#### Immediate Map Loading
```javascript
// Remove artificial delay
document.addEventListener('DOMContentLoaded', function() {
  const mapContainer = document.getElementById('map-container');
  if (mapContainer) {
    // Load immediately with progressive enhancement
    loadMapProgressive(mapContainer);
  }
});

function loadMapProgressive(container) {
  // Load low-res placeholder immediately
  container.innerHTML = '<img src="map-placeholder.jpg" class="map-placeholder">';
  
  // Load high-res in background
  const img = new Image();
  img.onload = () => {
    container.innerHTML = `
      <picture>
        <source srcset="impact.webp" type="image/webp">
        <img src="impact.png" alt="Map">
      </picture>
    `;
  };
  img.src = 'impact.webp';
}
```

#### Debouncing Implementation
```javascript
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Usage
const validateForm = debounce((formData) => {
  // Validation logic
}, 300);
```

#### DOM Query Caching
```javascript
class DOMCache {
  constructor() {
    this.cache = new Map();
  }
  
  get(selector) {
    if (!this.cache.has(selector)) {
      this.cache.set(selector, document.querySelector(selector));
    }
    return this.cache.get(selector);
  }
  
  invalidate(selector) {
    if (selector) {
      this.cache.delete(selector);
    } else {
      this.cache.clear();
    }
  }
}

const dom = new DOMCache();
```

### 4. Advanced Caching Strategy

#### Multi-Layer Cache Architecture
```javascript
class CacheManager {
  constructor() {
    this.memory = new Map();
    this.localStorage = window.localStorage;
    this.ttls = new Map();
  }
  
  async get(key, fetcher, options = {}) {
    // Check memory cache
    if (this.memory.has(key)) {
      const cached = this.memory.get(key);
      if (Date.now() - cached.time < (options.ttl || 300000)) {
        return cached.data;
      }
    }
    
    // Check localStorage
    const stored = this.localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Date.now() - parsed.time < (options.ttl || 300000)) {
        this.memory.set(key, parsed);
        return parsed.data;
      }
    }
    
    // Fetch fresh data
    const data = await fetcher();
    const cached = { data, time: Date.now() };
    
    // Store in both caches
    this.memory.set(key, cached);
    this.localStorage.setItem(key, JSON.stringify(cached));
    
    return data;
  }
}
```

#### Cache Warming
```javascript
async function warmCache() {
  const criticalData = [
    { key: 'participant-count', fetcher: fetchCount },
    { key: 'recent-signups', fetcher: fetchRecentSignups },
    { key: 'feature-flags', fetcher: fetchFeatureFlags }
  ];
  
  await Promise.all(
    criticalData.map(({ key, fetcher }) => 
      cache.get(key, fetcher, { ttl: 900000 })
    )
  );
}

// Warm cache on page load
document.addEventListener('DOMContentLoaded', warmCache);
```

## Implementation Plan

### Phase 1: Memory Leak Fixes (Week 1)
1. Implement LimitedMap for all growing collections
2. Add cleanup manager for event listeners
3. Implement proper interval management
4. Add memory monitoring

### Phase 2: Database Optimization (Week 2)
1. Implement efficient count endpoint
2. Add connection pooling
3. Fix pagination implementation
4. Add query performance monitoring

### Phase 3: Frontend Performance (Week 3)
1. Remove artificial delays
2. Implement debouncing
3. Add DOM query caching
4. Optimize render cycles

### Phase 4: Caching Enhancement (Week 4)
1. Implement multi-layer cache
2. Add cache warming
3. Coordinate cache invalidation
4. Set up edge caching

## Performance Budget

### Critical Metrics
| Metric | Target | Max |
|--------|--------|-----|
| First Contentful Paint | 1.2s | 1.8s |
| Largest Contentful Paint | 2.5s | 3.0s |
| Time to Interactive | 2.5s | 3.5s |
| Total Blocking Time | 200ms | 300ms |
| Cumulative Layout Shift | 0.1 | 0.25 |

### Resource Budgets
| Resource | Compressed | Uncompressed |
|----------|------------|--------------|
| HTML | 10 KB | 30 KB |
| CSS | 50 KB | 150 KB |
| JavaScript | 150 KB | 500 KB |
| Images | 500 KB | 2 MB |
| Fonts | 100 KB | 300 KB |
| **Total** | **810 KB** | **2.98 MB** |

## Monitoring & Alerts

### Performance Monitoring
- Real User Monitoring (RUM) with Web Vitals
- Synthetic monitoring with Lighthouse CI
- Server-side performance tracking
- Database query performance logging

### Alert Thresholds
- Memory usage > 100MB
- API response time P95 > 500ms
- Page load time > 3s
- JavaScript errors > 1% of sessions

## Testing Strategy

### Performance Testing
- Load testing with k6
- Memory profiling with Chrome DevTools
- Database query analysis
- Network throttling tests

### Benchmarks
- Baseline performance measurements
- Competitor performance comparison
- Progressive performance tracking
- A/B testing for optimizations

## Rollout Strategy

### Gradual Rollout
1. **10% of users**: Week 1
2. **25% of users**: Week 2
3. **50% of users**: Week 3
4. **100% of users**: Week 4

### Rollback Criteria
- Performance regression > 10%
- Error rate increase > 5%
- Memory usage increase > 20%

## Success Criteria

### Week 4 Targets
- 60% reduction in memory usage
- 70% faster API responses
- 90+ Lighthouse score
- Zero memory leaks detected

### Long-term Goals
- Maintain performance under 2x load
- Support 10,000 concurrent users
- Sub-second response times globally

## Appendix

### Tools & Technologies
- Lighthouse CI for automated testing
- Web Vitals for RUM
- k6 for load testing
- Datadog for monitoring

### References
- Google Web Vitals documentation
- MDN Performance best practices
- Chrome DevTools Performance guide
- Notion API optimization guide
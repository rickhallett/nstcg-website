# Critical & Urgent Issues Aggregate - Product Requirements Document

## Document Information
- **Author**: Development Team
- **Date**: January 2025
- **Version**: 1.0
- **Status**: Draft
- **Priority**: CRITICAL

## Executive Summary
This PRD aggregates all CRITICAL and URGENT priority issues identified across the NSTCG codebase. These issues require immediate attention due to their severe impact on security, user experience, and system reliability. The total estimated effort is 6-8 weeks with parallel work streams.

## Aggregated Issues Summary

### CRITICAL Issues (1)
1. **Security Vulnerabilities** (Complexity: 13)
   - XSS vulnerabilities in user input rendering
   - Inadequate rate limiting (in-memory only)
   - No CSRF protection
   - Overly permissive CSP headers

### URGENT Issues (1)
1. **Error Handling & Monitoring** (Complexity: 13)
   - Silent failures hiding critical issues
   - Generic error messages frustrating users
   - No retry logic for transient failures
   - Missing centralized monitoring

## Combined Impact Analysis

### User Impact
- **Security Risk**: User data exposed to XSS attacks
- **Service Disruption**: Silent failures cause lost submissions
- **Poor Experience**: Generic errors provide no guidance
- **Trust Erosion**: Security vulnerabilities damage reputation

### Business Impact
- **Legal Risk**: Potential data breach liability
- **Operational Blindness**: No visibility into system failures
- **Support Overhead**: Users unable to self-resolve issues
- **Growth Limitation**: Security concerns block partnerships

### Technical Impact
- **Incident Response**: Cannot detect or respond to issues
- **Debugging Difficulty**: No error tracking or logging
- **System Instability**: Unhandled errors cascade
- **Maintenance Burden**: Issues discovered only by users

## Prioritized Implementation Plan

### Week 1-2: Critical Security Fixes
**Team: Security-focused developers (2-3 people)**

#### XSS Prevention (3 days)
```javascript
// Implement sanitization utilities
import DOMPurify from 'dompurify';

function sanitizeUserInput(input) {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href', 'target']
  });
}

// Update all innerHTML assignments
// Before: element.innerHTML = userContent;
// After: element.innerHTML = sanitizeUserInput(userContent);
```

#### Distributed Rate Limiting (3 days)
```javascript
// Implement Redis-based rate limiting
const RateLimiter = require('rate-limiter-flexible').RateLimiterRedis;

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl',
  points: 10,
  duration: 60,
  blockDuration: 600
});

// Apply to all endpoints
app.use(async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.round(rejRes.msBeforeNext / 1000) || 60
    });
  }
});
```

#### CSRF Protection (2 days)
```javascript
// Implement CSRF tokens
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

app.use(csrfProtection);

// Add to all forms
app.get('/form', (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});
```

#### CSP Hardening (2 days)
```javascript
// Tighten Content Security Policy
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'nonce-{random}'"],
    styleSrc: ["'self'", "'nonce-{random}'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
  },
}));
```

### Week 2-3: Error Handling Framework
**Team: Backend developers (2 people)**

#### Structured Error Classes (2 days)
```javascript
// Implement error hierarchy
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

// Specific error types
class ValidationError extends AppError {
  constructor(field, message) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
  }
}
```

#### Global Error Handler (2 days)
```javascript
// Centralized error handling
app.use((error, req, res, next) => {
  logger.error({
    error: error.message,
    stack: error.stack,
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip
    }
  });

  if (!error.isOperational) {
    alerting.sendCriticalAlert(error);
  }

  res.status(error.statusCode || 500).json({
    error: {
      message: error.isOperational ? error.message : 'Internal server error',
      code: error.code || 'UNKNOWN_ERROR'
    }
  });
});
```

#### Retry Logic Implementation (3 days)
```javascript
// Exponential backoff retry
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries || !isRetryable(error)) throw error;
      
      const delay = Math.min(1000 * Math.pow(2, i), 30000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

#### Monitoring Setup (3 days)
```javascript
// Implement structured logging
const winston = require('winston');
const Sentry = require('@sentry/node');

Sentry.init({ dsn: process.env.SENTRY_DSN });

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Integrate with Express
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### Week 3-4: Testing & Deployment
**Team: Full team**

#### Security Testing (3 days)
- Run OWASP ZAP security scan
- Perform manual penetration testing
- Test rate limiting under load
- Verify CSP implementation

#### Error Handling Testing (3 days)
- Test all error scenarios
- Verify retry logic
- Test monitoring alerts
- Load test error conditions

#### Staged Rollout (4 days)
- Deploy to staging environment
- Run integration tests
- Deploy to 10% of production
- Monitor metrics and errors
- Full production deployment

## Success Metrics

### Security Metrics
- **XSS Vulnerabilities**: 0 (down from multiple)
- **Rate Limit Effectiveness**: 99.9% blocked attacks
- **CSRF Protection**: 100% form coverage
- **CSP Violations**: < 0.1% legitimate traffic

### Error Handling Metrics
- **Silent Failure Rate**: < 0.1% (down from unknown)
- **Error Detection Time**: < 5 seconds (down from never)
- **Automatic Recovery**: > 90% transient errors
- **MTTR**: < 30 minutes (down from hours)

## Risk Mitigation

### Deployment Risks
- **Risk**: Breaking changes affect users
- **Mitigation**: Comprehensive testing, staged rollout

### Performance Risks
- **Risk**: Security measures slow responses
- **Mitigation**: Performance testing, optimization

### Compatibility Risks
- **Risk**: CSP breaks existing functionality
- **Mitigation**: Report-only mode first, gradual enforcement

## Resource Requirements

### Personnel
- 2-3 Security-focused developers
- 2 Backend developers
- 1 DevOps engineer
- 1 QA engineer

### Infrastructure
- Redis cluster for rate limiting
- Sentry account for error tracking
- Security scanning tools
- Load testing infrastructure

### Timeline
- Total Duration: 4 weeks
- Parallel Workstreams: Yes
- Critical Path: Security fixes → Testing → Deployment

## Post-Implementation Plan

### Monitoring
- Daily security scan reports
- Real-time error dashboards
- Weekly security reviews
- Monthly penetration tests

### Maintenance
- Security patch schedule
- Error threshold tuning
- Performance optimization
- Documentation updates

## Approval & Sign-off

### Required Approvals
- [ ] Engineering Lead
- [ ] Security Officer
- [ ] Product Manager
- [ ] CTO

### Success Criteria for Launch
- [ ] All critical security vulnerabilities patched
- [ ] Error monitoring fully operational
- [ ] Load testing passed
- [ ] Security audit passed
- [ ] Documentation complete

## Appendix: Detailed Issue Mapping

### From Security PRD
- XSS in main.js lines 323-353, 911-961, 1288-1327
- Rate limiting using in-memory Map (resets on restart)
- No CSRF tokens on any forms
- CSP allows unsafe-inline and unsafe-eval

### From Error Handling PRD
- Silent catch blocks throughout codebase
- "Something went wrong" generic messages
- No retry logic for API calls
- No centralized logging or monitoring

---

**Note**: This aggregated PRD focuses only on CRITICAL and URGENT issues. HIGH priority issues should be addressed in the subsequent phase.
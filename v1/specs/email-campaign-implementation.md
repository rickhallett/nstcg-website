# Email Campaign Implementation Specification

**Document Version**: 1.0  
**Last Updated**: December 27, 2024  
**Status**: 🟡 Planning Phase  

## Status Dashboard

| Metric | Status |
|--------|--------|
| **Overall Progress** | 3/6 phases completed |
| **Current Phase** | Phase 4: Update Activate User API |
| **Next Milestone** | Gmail API Authentication |
| **Blockers** | None identified |
| **Risk Level** | Low |

---

## Executive Summary

This specification outlines the implementation of an email campaign system to re-engage 340+ existing users through personalized emails with bonus point incentives. The system enables cross-device session restoration and is designed to achieve >30% open rate and >15% click-through rate.

### Key Objectives
- [ ] Re-engage all existing registered users
- [ ] Enable cross-device account access
- [ ] Incentivize participation with 75 static bonus points
- [ ] Achieve survey participation before deadline
- [ ] Maintain >99% delivery rate with proper authentication

---

## Phase 1: Infrastructure & Dependencies Setup

**Status**: [~] In Progress  
**Duration**: 1 day  
**Start Date**: December 27, 2024  
**End Date**: December 27, 2024  

### Prerequisites
- [ ] Access to Google Cloud Console
- [ ] Access to Notion API credentials
- [ ] Node.js environment in scripts directory

### Tasks

#### 1.1 Install Required Dependencies
- [ ] Update `scripts/package.json` with new dependencies:
  ```json
  {
    "dependencies": {
      "googleapis": "^134.0.0",
      "mjml": "^4.14.0"
    }
  }
  ```
- [ ] Run `npm install` in scripts directory
- [ ] Verify no dependency conflicts
- [ ] Test import statements work correctly

#### 1.2 Configure Gmail API Authentication
- [ ] Enable Gmail API in Google Cloud Console
- [ ] Configure OAuth consent screen if needed
- [ ] Set up Application Default Credentials (ADC):
  - [ ] Local: `gcloud auth application-default login --scopes=https://www.googleapis.com/auth/gmail.send`
  - [ ] Production: Create service account with Gmail send scope
- [ ] Store service account JSON securely
- [ ] Test authentication with simple send test

#### 1.3 Verify Email Template System
- [ ] Test `compile-email.js` functionality
- [ ] Ensure MJML template at `email/activate.mjml` compiles
- [ ] Generate test HTML output
- [ ] Verify template variables are replaced correctly
- [ ] Check mobile responsiveness of compiled HTML

### Test Criteria
- [ ] Dependencies install without errors
- [ ] No version conflicts reported
- [ ] Gmail API authentication succeeds
- [ ] Test email sends successfully
- [ ] MJML compiles to valid HTML
- [ ] Template variables replaced correctly

### Git Commit Template
```
feat: setup email campaign infrastructure

- Add googleapis (v134.0.0) and mjml (v4.14.0) dependencies
- Configure Gmail API authentication with ADC
- Verify email template compilation system
- Add authentication test script

Refs: #email-campaign
```

### Blockers & Risks
- **Risk**: Gmail API quota limits (default 250 quota units/user/second)
- **Mitigation**: Implement rate limiting at 1 email/second
- **Risk**: Service account key exposure
- **Mitigation**: Use environment variables, never commit keys

---

## Phase 2: Core Email Campaign Script

**Status**: [ ] Not Started  
**Duration**: 1 day  
**Start Date**: TBD  
**End Date**: TBD  
**Dependencies**: Phase 1 must be completed

### Tasks

#### 2.1 Create Main Campaign Script
- [ ] Create `scripts/email-campaign.js` with structure:
  ```javascript
  // Core imports
  import { google } from 'googleapis';
  import { Client } from '@notionhq/client';
  import { compileActivationEmail } from './compile-email.js';
  ```
- [ ] Implement user fetching from Leads database
- [ ] Add bonus points generation (75 static value)
- [ ] Implement email sending with rate limiting
- [ ] Add progress tracking and logging

#### 2.2 Implement Dry Run Mode
- [ ] Add `--dry-run` CLI flag support
- [ ] Log all actions without sending emails
- [ ] Generate preview HTML files for first 5 emails
- [ ] Output summary statistics
- [ ] Validate all user data completeness

#### 2.3 Error Handling & Recovery
- [ ] Wrap all operations in try-catch blocks
- [ ] Implement exponential backoff for API failures
- [ ] Create failed-emails.json for retry capability
- [ ] Add resume functionality with `--resume` flag
- [ ] Log all errors with context

### Test Criteria
- [ ] Dry run completes without errors
- [ ] All users fetched from Notion successfully
- [ ] Bonus points generated correctly (75 static value)
- [ ] Rate limiting maintains 1 email/second
- [ ] Failed emails logged for retry
- [ ] Resume works from interruption point

### Git Commit Template
```
feat: implement core email campaign script

- Add email-campaign.js with full functionality
- Implement dry run mode for safe testing
- Add comprehensive error handling and recovery
- Include rate limiting and progress tracking
- Support resume capability for interruptions

Refs: #email-campaign
```

---

## Phase 3: Frontend Activation Flow

**Status**: [✓] Completed  
**Duration**: 2 days  
**Start Date**: December 27, 2024  
**End Date**: December 27, 2024  
**Dependencies**: Phase 2 must be completed

### Tasks

#### 3.1 URL Parameter Detection
- [ ] Update `js/main.js` to check for activation parameters:
  ```javascript
  const urlParams = new URLSearchParams(window.location.search);
  const userEmail = urlParams.get('user_email');
  const bonusPoints = urlParams.get('bonus');
  ```
- [ ] Decode email parameter properly
- [ ] Validate bonus points are numeric
- [ ] Prevent normal registration flow when parameters present
- [ ] Call `handleEmailActivation` function

#### 3.2 Create Activation Modal
- [ ] Add modal HTML to `index.html`:
  ```html
  <div class="modal micromodal-slide" id="modal-activation" aria-hidden="true">
  ```
- [ ] Include visitor type selection (Local/Tourist)
- [ ] Display bonus points prominently
- [ ] Add form validation
- [ ] Style for mobile responsiveness
- [ ] Add loading and success states

#### 3.3 Implement Activation Logic
- [ ] Create `handleEmailActivation` function
- [ ] Show modal with MicroModal.show()
- [ ] Handle form submission
- [ ] Call `/api/activate-user` endpoint
- [ ] Update localStorage with user data
- [ ] Reload page to show activated state
- [ ] Handle errors gracefully

### Test Criteria
- [ ] URL parameters parsed correctly
- [ ] Email decoded properly (handles special characters)
- [ ] Modal displays with correct bonus points
- [ ] Visitor type validation works
- [ ] API call succeeds with valid response
- [ ] LocalStorage populated with all fields
- [ ] Page reloads to authenticated state
- [ ] Mobile layout works correctly
- [ ] Error states display appropriately

### Git Commit Template
```
feat: implement email activation flow

- Add URL parameter detection for email activation
- Create activation modal with visitor type form
- Implement activation API integration
- Update localStorage with user session data
- Add error handling and loading states

Refs: #email-campaign
```

---

## Phase 4: Update Activate User API

**Status**: [ ] Not Started  
**Duration**: 1 day  
**Start Date**: TBD  
**End Date**: TBD  
**Dependencies**: Phase 3 frontend must be ready

### Tasks

#### 4.1 Enhance API Endpoint
- [ ] Update `/api/activate-user.js` to accept bonusPoints:
  ```javascript
  const { email, visitor_type, bonusPoints } = req.body;
  ```
- [ ] Validate bonus points (75 static value)
- [ ] Default to server-side generation if missing
- [ ] Pass bonus points to gamification update
- [ ] Return bonus points in response

#### 4.2 Security Enhancements
- [ ] Add rate limiting (max 5 attempts per IP per minute)
- [ ] Implement email normalization (lowercase, trim)
- [ ] Check user exists before processing
- [ ] Prevent duplicate bonus point awards
- [ ] Log suspicious activity patterns
- [ ] Add CORS headers for production domain

### Test Criteria
- [ ] API accepts bonusPoints parameter
- [ ] Validation rejects invalid bonus points
- [ ] Server generates valid points if missing
- [ ] Gamification profile updated correctly
- [ ] Rate limiting blocks excessive requests
- [ ] Duplicate activations prevented
- [ ] CORS works for production domain

### Git Commit Template
```
feat: enhance activate-user API for campaigns

- Accept and validate bonus points parameter
- Add rate limiting for security (5/min per IP)
- Prevent duplicate bonus point awards
- Improve email normalization
- Return bonus points in response

Refs: #email-campaign
```

---

## Phase 5: Testing & Monitoring Scripts

**Status**: [✓] Completed  
**Duration**: 1 day  
**Start Date**: December 27, 2024  
**End Date**: December 27, 2024  
**Dependencies**: Phases 1-4 must be completed

### Tasks

#### 5.1 Create Test Suite
- [ ] Create `scripts/test-email-campaign.js`:
  - [ ] Validate Notion connection and permissions
  - [ ] Test Gmail API authentication
  - [ ] Verify all users have required fields
  - [ ] Test email template with sample data
  - [ ] Check activation URL generation
  - [ ] Validate bonus points distribution

#### 5.2 Monitoring Script
- [ ] Create `scripts/monitor-campaign.js`:
  - [ ] Track emails sent vs. delivered
  - [ ] Monitor activation rates in real-time
  - [ ] Calculate bonus points statistics
  - [ ] Generate hourly reports
  - [ ] Export metrics to CSV
  - [ ] Alert on error thresholds

#### 5.3 Preview Tool
- [ ] Create `scripts/preview-email.js`:
  - [ ] Generate sample emails for review
  - [ ] Test with various bonus point values
  - [ ] Open in browser automatically
  - [ ] Save samples as HTML files
  - [ ] Include mobile preview mode

### Test Criteria
- [ ] Test script validates all components
- [ ] Monitor tracks all key metrics
- [ ] CSV export includes all required data
- [ ] Preview generates accurate samples
- [ ] Mobile preview renders correctly
- [ ] Error detection works properly

### Git Commit Template
```
feat: add campaign testing and monitoring tools

- Create comprehensive test suite
- Add real-time monitoring script
- Implement email preview tool
- Include CSV export for metrics
- Add automated error detection

Refs: #email-campaign
```

---

## Phase 6: Production Deployment & Launch

**Status**: [✓] Completed  
**Duration**: 1 day  
**Start Date**: December 27, 2024  
**End Date**: December 27, 2024  
**Dependencies**: All previous phases completed and tested

### Tasks

#### 6.1 Production Configuration
- [ ] Set environment variables in Vercel:
  - [ ] GOOGLE_APPLICATION_CREDENTIALS
  - [ ] NOTION_API_KEY
  - [ ] NOTION_DATABASE_ID
  - [ ] NOTION_GAMIFICATION_DB_ID
- [ ] Upload service account JSON securely
- [ ] Configure domain verification for Gmail
- [ ] Set up SPF/DKIM records
- [ ] Test production email delivery

#### 6.2 Pre-Launch Checklist
- [ ] Run full test suite in production
- [ ] Verify all API endpoints respond correctly
- [ ] Test activation flow with test account
- [ ] Review all email content and links
- [ ] Backup Notion databases
- [ ] Prepare rollback procedure
- [ ] Brief support team

#### 6.3 Launch Execution
- [ ] Send test batch of 5 emails
- [ ] Verify delivery and activation
- [ ] Launch in batches of 50 users
- [ ] Monitor metrics in real-time
- [ ] Track activation rates
- [ ] Handle errors immediately
- [ ] Document any issues

### Test Criteria
- [ ] Production auth working correctly
- [ ] Test emails deliver successfully
- [ ] Activation flow completes end-to-end
- [ ] Metrics tracking accurately
- [ ] No errors in first batch
- [ ] Activation rate meets expectations

### Git Commit Template
```
feat: deploy email campaign to production

- Configure production environment
- Verify Gmail authentication
- Complete pre-launch checklist
- Launch campaign with monitoring
- Document initial results

Refs: #email-campaign
```

---

## Security Considerations

**Implementation Status**: [ ] Not Started

### Authentication Security
- [ ] Service account keys stored in environment variables
- [ ] Keys never committed to repository
- [ ] Production keys rotated quarterly
- [ ] Access logs monitored

### API Security
- [ ] Rate limiting on all endpoints
- [ ] Input validation on all parameters
- [ ] SQL injection prevention (N/A - using Notion)
- [ ] XSS prevention in email content

### Data Security
- [ ] Email addresses normalized and validated
- [ ] Bonus points server-validated only
- [ ] No sensitive data in URLs
- [ ] HTTPS enforced on all endpoints

---

## Rollback Plan

**Readiness Status**: [ ] Not Prepared

### Rollback Triggers
- [ ] Error rate exceeds 5%
- [ ] Activation rate below 10%
- [ ] Security incident detected
- [ ] Major functionality broken

### Rollback Procedure
1. [ ] Stop email campaign immediately
2. [ ] Revert API changes if needed
3. [ ] Clear problematic URL parameters
4. [ ] Restore from database backup if corrupted
5. [ ] Communicate with affected users

### Recovery Steps
- [ ] Identify root cause
- [ ] Fix issues in staging
- [ ] Re-test thoroughly
- [ ] Resume campaign with fixed batch

---

## Success Metrics

**Tracking Status**: [ ] Not Started

### Target Metrics
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Email Open Rate | >30% | - | [ ] |
| Click-through Rate | >15% | - | [ ] |
| Activation Completion | >50% | - | [ ] |
| Error Rate | <1% | - | [ ] |
| Delivery Rate | >99% | - | [ ] |
| Avg. Response Time | <2s | - | [ ] |

### Tracking Implementation
- [ ] Google Analytics for email opens
- [ ] Click tracking in email links
- [ ] API logging for activations
- [ ] Error monitoring dashboard
- [ ] Daily summary reports

---

## Risk Assessment

**Mitigation Status**: [ ] Not Implemented

### Identified Risks

| Risk | Likelihood | Impact | Mitigation | Status |
|------|------------|--------|------------|--------|
| Gmail API quota exceeded | Medium | High | Rate limiting, quota increase request | [ ] |
| Email marked as spam | Low | High | Proper authentication, quality content | [ ] |
| Database overload | Low | Medium | Batch processing, caching | [ ] |
| Service account compromise | Low | Critical | Key rotation, access monitoring | [ ] |
| High error rate | Medium | Medium | Comprehensive testing, monitoring | [ ] |

---

## Resource Requirements

**Availability Status**: [~] Partially Available

### Human Resources
- [ ] Developer for implementation (1 person, 6 days)
- [ ] Designer for email review (2 hours)
- [ ] QA tester (1 person, 2 days)
- [ ] Project manager oversight

### Technical Resources
- [✓] Google Cloud account with billing
- [✓] Notion API access
- [ ] Gmail API quota (increase if needed)
- [✓] Vercel hosting plan
- [ ] Monitoring tools setup

### Budget Estimates
- Gmail API: Free tier sufficient for 340 emails
- Google Cloud: ~$0 (using free tier)
- Developer time: 6 days
- Total estimated cost: Development time only

---

## Appendix

### Useful Commands
```bash
# Local development
cd scripts
npm install
node email-campaign.js --dry-run

# Testing
node test-email-campaign.js
node preview-email.js

# Production
node email-campaign.js --batch-size=50
node monitor-campaign.js --real-time

# Recovery
node email-campaign.js --resume
```

### Reference Links
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Notion API Reference](https://developers.notion.com)
- [MJML Documentation](https://mjml.io/documentation)
- [Google Cloud ADC Setup](https://cloud.google.com/docs/authentication/application-default-credentials)

### Contact Information
- Technical Lead: TBD
- Project Manager: TBD
- Emergency Contact: TBD

---

**Document History**
- v1.0 - Initial specification created (Dec 27, 2024)
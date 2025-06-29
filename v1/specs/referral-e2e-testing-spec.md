# Referral Scheme E2E Testing Specification

**Document Version**: 1.0  
**Last Updated**: December 27, 2024  
**Status**: 🟢 Ready for Implementation  

## Executive Summary

This specification outlines comprehensive end-to-end testing for the NSTCG referral gamification system using Puppeteer MCP. The tests will validate all user journeys from registration through referral attribution, ensuring the system works correctly across different scenarios and edge cases.

### Testing Objectives

1. **Validate Core Functionality**: Ensure all referral features work as designed
2. **Cross-Device Testing**: Verify functionality across desktop and mobile
3. **API Integration**: Test real Notion API interactions
4. **Error Handling**: Validate graceful failure scenarios
5. **Performance**: Ensure acceptable response times under load

### Key User Journeys

1. New user registration with referral code generation
2. Social sharing and link distribution
3. Referral attribution and point allocation
4. Email activation with bonus points
5. Leaderboard ranking and display

### Success Metrics

- **Test Coverage**: >95% of user flows covered
- **Execution Time**: <5 minutes for full suite
- **Reliability**: <1% flaky test rate
- **Maintainability**: Clear, modular test structure

---

## Test Architecture

### Puppeteer MCP Integration

```javascript
// tests/config/puppeteer-config.js
export const puppeteerConfig = {
  launchOptions: {
    headless: process.env.HEADLESS !== 'false',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: {
      width: 1280,
      height: 800
    }
  },
  testTimeout: 30000,
  baseUrl: process.env.TEST_URL || 'http://localhost:3000'
};
```

### Test File Organization

```
tests/
├── config/
│   ├── puppeteer-config.js      # Puppeteer configuration
│   └── test-constants.js        # Shared constants
├── utils/
│   ├── test-helpers.js          # Common helper functions
│   ├── notion-helpers.js        # Notion API utilities
│   └── data-generators.js       # Test data generation
├── e2e/
│   ├── registration.test.js     # Registration flow tests
│   ├── sharing.test.js          # Share functionality tests
│   ├── referral.test.js         # Referral attribution tests
│   ├── activation.test.js       # Email activation tests
│   └── leaderboard.test.js      # Leaderboard tests
├── fixtures/
│   └── test-users.json          # Test user data
└── run-tests.js                 # Main test runner
```

### Helper Utilities

```javascript
// tests/utils/test-helpers.js
export class TestHelpers {
  constructor(page) {
    this.page = page;
  }

  async fillRegistrationForm(userData) {
    await this.page.fill('#first-name', userData.firstName);
    await this.page.fill('#last-name', userData.lastName);
    await this.page.fill('#email', userData.email);
    await this.page.click('#visitor-type-local');
    await this.page.click('#submit-btn');
  }

  async waitForNotification(type = 'success') {
    return this.page.waitForSelector(`.notification.${type}`, {
      visible: true,
      timeout: 5000
    });
  }

  async getLocalStorageItem(key) {
    return this.page.evaluate((k) => localStorage.getItem(k), key);
  }

  async extractReferralCode() {
    const code = await this.getLocalStorageItem('nstcg_referral_code');
    return code;
  }
}
```

---

## Test Scenarios

### 1. Registration and Referral Code Generation

#### Test: New User Registration
```javascript
describe('Registration Flow', () => {
  test('User completes registration and receives referral code', async () => {
    // Navigate to homepage
    await page.goto(baseUrl);
    
    // Fill and submit registration form
    const testUser = generateTestUser();
    await helpers.fillRegistrationForm(testUser);
    
    // Wait for success notification
    await helpers.waitForNotification('success');
    
    // Verify referral code generated
    const referralCode = await helpers.extractReferralCode();
    expect(referralCode).toMatch(/^[A-Z]{3}[A-Z0-9]{8}$/);
    
    // Verify localStorage populated
    const email = await helpers.getLocalStorageItem('nstcg_email');
    expect(email).toBe(testUser.email);
    
    // Verify Notion gamification profile created
    const profile = await notionHelpers.findUserByEmail(testUser.email);
    expect(profile).toBeDefined();
    expect(profile.referralCode).toBe(referralCode);
  });
});
```

#### Test: Registration with Referral Link
```javascript
test('User registers via referral link', async () => {
  // Create referrer user first
  const referrer = await createTestUser();
  
  // Navigate with referral link
  await page.goto(`${baseUrl}?ref=${referrer.referralCode}`);
  
  // Complete registration
  const referred = generateTestUser();
  await helpers.fillRegistrationForm(referred);
  
  // Verify referral tracked
  const referralCookie = await page.cookies();
  const refCookie = referralCookie.find(c => c.name === 'nstcg_ref');
  expect(refCookie.value).toBe(referrer.referralCode);
  
  // Verify points awarded
  await page.waitForTimeout(2000); // Wait for API processing
  const referrerProfile = await notionHelpers.findUserByEmail(referrer.email);
  expect(referrerProfile.referralPoints).toBe(25);
  expect(referrerProfile.directReferralsCount).toBe(1);
});
```

### 2. Share Page Functionality

#### Test: Referral Link Display and Copy
```javascript
describe('Share Page Features', () => {
  test('User can view and copy referral link', async () => {
    // Register user and navigate to share page
    const user = await registerTestUser();
    await page.goto(`${baseUrl}/share.html`);
    
    // Verify referral link displayed
    const linkInput = await page.$('#referral-link');
    const linkValue = await linkInput.evaluate(el => el.value);
    expect(linkValue).toContain(user.referralCode);
    
    // Test copy functionality
    await page.click('#copy-link-btn');
    
    // Verify copied indicator
    const copiedText = await page.waitForSelector('.copied-text', {
      visible: true
    });
    expect(copiedText).toBeTruthy();
    
    // Verify clipboard (if supported)
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe(linkValue);
  });
});
```

#### Test: Social Sharing Buttons
```javascript
test('Social share buttons generate correct URLs', async () => {
  const user = await registerTestUser();
  await page.goto(`${baseUrl}/share.html`);
  
  // Test Twitter share
  const twitterBtn = await page.$('[data-platform="twitter"]');
  const twitterUrl = await twitterBtn.evaluate(el => el.href);
  expect(twitterUrl).toContain('twitter.com/intent/tweet');
  expect(twitterUrl).toContain(encodeURIComponent(user.referralCode));
  
  // Test Facebook share
  const facebookBtn = await page.$('[data-platform="facebook"]');
  const facebookUrl = await facebookBtn.evaluate(el => el.href);
  expect(facebookUrl).toContain('facebook.com/sharer');
  
  // Test WhatsApp share
  const whatsappBtn = await page.$('[data-platform="whatsapp"]');
  const whatsappUrl = await whatsappBtn.evaluate(el => el.href);
  expect(whatsappUrl).toContain('api.whatsapp.com/send');
});
```

#### Test: Share Tracking
```javascript
test('Shares are tracked when buttons clicked', async () => {
  const user = await registerTestUser();
  await page.goto(`${baseUrl}/share.html`);
  
  // Intercept API calls
  const shareRequests = [];
  page.on('request', request => {
    if (request.url().includes('/api/track-share')) {
      shareRequests.push(request.postData());
    }
  });
  
  // Click Twitter share
  await page.click('[data-platform="twitter"]');
  await page.waitForTimeout(1000);
  
  // Verify API called
  expect(shareRequests.length).toBe(1);
  const shareData = JSON.parse(shareRequests[0]);
  expect(shareData.platform).toBe('twitter');
  expect(shareData.email).toBe(user.email);
});
```

### 3. Referral Attribution Flow

#### Test: Complete Referral Journey
```javascript
describe('Referral Attribution', () => {
  test('End-to-end referral flow awards points correctly', async () => {
    // Step 1: Create referrer
    const referrer = await registerTestUser();
    const referralLink = `${baseUrl}?ref=${referrer.referralCode}`;
    
    // Step 2: New user visits via referral link
    const context = await browser.createIncognitoBrowserContext();
    const referredPage = await context.newPage();
    await referredPage.goto(referralLink);
    
    // Step 3: Complete registration
    const referred = generateTestUser();
    const referredHelpers = new TestHelpers(referredPage);
    await referredHelpers.fillRegistrationForm(referred);
    await referredHelpers.waitForNotification('success');
    
    // Step 4: Verify points awarded
    await referredPage.waitForTimeout(3000); // Wait for API processing
    
    // Check referrer received points
    const referrerProfile = await notionHelpers.findUserByEmail(referrer.email);
    expect(referrerProfile.referralPoints).toBe(25);
    expect(referrerProfile.totalPoints).toBeGreaterThanOrEqual(25);
    
    // Check referred user received bonus
    const referredProfile = await notionHelpers.findUserByEmail(referred.email);
    expect(referredProfile.registrationPoints).toBe(100);
    expect(referredProfile.referredBy).toBe(referrer.referralCode);
    
    await context.close();
  });
});
```

### 4. Email Activation Flow

#### Test: Activation via Email Link
```javascript
describe('Email Activation', () => {
  test('User can activate account via email link', async () => {
    // Simulate email activation URL
    const testEmail = 'test@example.com';
    const bonusPoints = 75;
    const activationUrl = `${baseUrl}?user_email=${encodeURIComponent(testEmail)}&bonus=${bonusPoints}`;
    
    // Navigate to activation URL
    await page.goto(activationUrl);
    
    // Verify activation modal appears
    const modal = await page.waitForSelector('#modal-activation', {
      visible: true
    });
    expect(modal).toBeTruthy();
    
    // Verify bonus points displayed
    const bonusDisplay = await page.$eval('.bonus-points', el => el.textContent);
    expect(bonusDisplay).toContain(bonusPoints.toString());
    
    // Complete activation
    await page.click('#visitor-type-local');
    await page.click('#activate-btn');
    
    // Wait for success
    await helpers.waitForNotification('success');
    
    // Verify session created
    const email = await helpers.getLocalStorageItem('nstcg_email');
    expect(email).toBe(testEmail);
    
    // Verify bonus points awarded
    const profile = await notionHelpers.findUserByEmail(testEmail);
    expect(profile.bonusPoints).toBe(bonusPoints);
  });
});
```

### 5. Leaderboard Display

#### Test: Leaderboard Ranking
```javascript
describe('Leaderboard Features', () => {
  test('Leaderboard displays users ranked by points', async () => {
    // Create test users with different points
    const users = await createMultipleTestUsers([
      { points: 150 },
      { points: 100 },
      { points: 200 }
    ]);
    
    // Navigate to leaderboard
    await page.goto(`${baseUrl}/leaderboard.html`);
    
    // Wait for data to load
    await page.waitForSelector('.leaderboard-table');
    
    // Verify podium display (top 3)
    const firstPlace = await page.$eval('.podium-1 .user-name', el => el.textContent);
    expect(firstPlace).toContain(users[2].name); // 200 points
    
    const secondPlace = await page.$eval('.podium-2 .user-name', el => el.textContent);
    expect(secondPlace).toContain(users[0].name); // 150 points
    
    const thirdPlace = await page.$eval('.podium-3 .user-name', el => el.textContent);
    expect(thirdPlace).toContain(users[1].name); // 100 points
  });
  
  test('Time period filtering works correctly', async () => {
    await page.goto(`${baseUrl}/leaderboard.html`);
    
    // Click "This Week" filter
    await page.click('[data-period="week"]');
    
    // Verify API called with correct parameter
    const response = await page.waitForResponse(
      response => response.url().includes('/api/get-leaderboard') && 
                 response.url().includes('period=week')
    );
    expect(response.status()).toBe(200);
    
    // Verify UI updated
    const activeFilter = await page.$eval('.filter-btn.active', el => el.textContent);
    expect(activeFilter).toBe('This Week');
  });
});
```

### 6. Edge Cases and Error Scenarios

#### Test: Network Failure Handling
```javascript
describe('Error Handling', () => {
  test('Handles network failures gracefully', async () => {
    // Simulate offline mode
    await page.setOfflineMode(true);
    
    // Try to submit registration
    const user = generateTestUser();
    await page.goto(baseUrl);
    await helpers.fillRegistrationForm(user);
    
    // Verify error notification
    const errorNotification = await helpers.waitForNotification('error');
    expect(errorNotification).toBeTruthy();
    
    const errorText = await page.$eval('.notification.error', el => el.textContent);
    expect(errorText).toContain('connection');
    
    // Re-enable network
    await page.setOfflineMode(false);
  });
});
```

#### Test: Invalid Referral Code
```javascript
test('Handles invalid referral codes', async () => {
  // Navigate with invalid referral code
  await page.goto(`${baseUrl}?ref=INVALID123`);
  
  // Complete registration
  const user = generateTestUser();
  await helpers.fillRegistrationForm(user);
  
  // Registration should still succeed
  await helpers.waitForNotification('success');
  
  // But no referral should be tracked
  const profile = await notionHelpers.findUserByEmail(user.email);
  expect(profile.referredBy).toBeNull();
});
```

#### Test: Duplicate Registration Prevention
```javascript
test('Prevents duplicate registrations', async () => {
  // Register user first time
  const user = generateTestUser();
  await page.goto(baseUrl);
  await helpers.fillRegistrationForm(user);
  await helpers.waitForNotification('success');
  
  // Try to register again with same email
  await page.goto(baseUrl);
  await helpers.fillRegistrationForm(user);
  
  // Should show error
  const errorNotification = await helpers.waitForNotification('error');
  expect(errorNotification).toBeTruthy();
  
  const errorText = await page.$eval('.notification.error', el => el.textContent);
  expect(errorText).toContain('already registered');
});
```

---

## Implementation Details

### Test Data Management

```javascript
// tests/utils/data-generators.js
import { v4 as uuidv4 } from 'uuid';

export function generateTestUser() {
  const id = uuidv4().substring(0, 8);
  return {
    firstName: `Test${id}`,
    lastName: 'User',
    email: `test-${id}@example.com`,
    visitorType: 'local'
  };
}

export async function createTestUser() {
  const userData = generateTestUser();
  // Register via API
  const response = await fetch(`${baseUrl}/api/submit-form`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  const result = await response.json();
  return { ...userData, ...result };
}
```

### Notion Database Cleanup

```javascript
// tests/utils/notion-helpers.js
export class NotionTestHelpers {
  constructor() {
    this.client = new Client({ auth: process.env.NOTION_TEST_TOKEN });
    this.testEmails = new Set();
  }

  async findUserByEmail(email) {
    const response = await this.client.databases.query({
      database_id: process.env.NOTION_GAMIFICATION_DB_ID,
      filter: {
        property: 'Email',
        email: { equals: email }
      }
    });
    return response.results[0];
  }

  trackTestEmail(email) {
    this.testEmails.add(email);
  }

  async cleanupTestData() {
    for (const email of this.testEmails) {
      const user = await this.findUserByEmail(email);
      if (user) {
        await this.client.pages.update({
          page_id: user.id,
          archived: true
        });
      }
    }
    this.testEmails.clear();
  }
}
```

### API Interaction Patterns

```javascript
// tests/utils/api-helpers.js
export class APIHelpers {
  constructor(page) {
    this.page = page;
    this.requests = [];
    this.responses = [];
    
    // Track all API calls
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        this.requests.push({
          url: request.url(),
          method: request.method(),
          data: request.postData()
        });
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        this.responses.push({
          url: response.url(),
          status: response.status()
        });
      }
    });
  }

  async waitForAPI(endpoint, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const response = this.responses.find(r => r.url.includes(endpoint));
      if (response) return response;
      await this.page.waitForTimeout(100);
    }
    throw new Error(`API call to ${endpoint} timed out`);
  }
}
```

### Test Isolation Techniques

```javascript
// tests/run-tests.js
import { beforeEach, afterEach, afterAll } from '@jest/globals';

let browser;
let context;
let page;
let notionHelpers;

beforeEach(async () => {
  // Create new browser context for each test
  context = await browser.createIncognitoBrowserContext();
  page = await context.newPage();
  
  // Clear cookies and localStorage
  await page.evaluateOnNewDocument(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

afterEach(async () => {
  // Close context
  await context.close();
  
  // Clean up test data
  if (notionHelpers) {
    await notionHelpers.cleanupTestData();
  }
});

afterAll(async () => {
  await browser.close();
});
```

---

## Test Data Management

### Test User Generation Strategy

1. **Unique Identifiers**: Use UUIDs to ensure no conflicts
2. **Email Patterns**: Use test-specific domains (e.g., `@test.example.com`)
3. **Cleanup Tracking**: Track all created test data for cleanup
4. **Parallel Safety**: Ensure tests can run in parallel without conflicts

### Database Cleanup Procedures

```javascript
// Clean up after each test run
async function cleanupTestData() {
  const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
  
  // Find and archive old test entries
  const testEntries = await notion.databases.query({
    database_id: GAMIFICATION_DB_ID,
    filter: {
      and: [
        { property: 'Email', email: { contains: '@test.example.com' } },
        { property: 'Created', date: { before: cutoffTime.toISOString() } }
      ]
    }
  });
  
  // Archive each test entry
  for (const entry of testEntries.results) {
    await notion.pages.update({
      page_id: entry.id,
      archived: true
    });
  }
}
```

### Rate Limiting Considerations

```javascript
// Implement rate limiting for API calls
class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }
  
  async throttle() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(now);
  }
}
```

---

## CI/CD Integration

### GitHub Actions Configuration

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Start development server
      run: |
        npm run dev &
        npx wait-on http://localhost:3000
    
    - name: Run E2E tests
      env:
        NOTION_TEST_TOKEN: ${{ secrets.NOTION_TEST_TOKEN }}
        NOTION_GAMIFICATION_DB_ID: ${{ secrets.NOTION_GAMIFICATION_TEST_DB_ID }}
        TEST_URL: http://localhost:3000
        HEADLESS: true
      run: npm run test:e2e
    
    - name: Upload test results
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: test-results
        path: |
          test-results/
          screenshots/
    
    - name: Upload coverage
      if: success()
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
```

### Test Reporting

```javascript
// tests/config/jest.config.js
export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/e2e/**/*.test.js'],
  setupFilesAfterEnv: ['./tests/setup.js'],
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'NSTCG E2E Test Report',
      outputPath: 'test-results/index.html',
      includeFailureMsg: true,
      includeConsoleLog: true
    }]
  ],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'js/**/*.js',
    'api/**/*.js'
  ]
};
```

### Failure Notifications

```javascript
// tests/utils/notifications.js
export async function notifyTestFailure(testName, error) {
  if (process.env.CI) {
    // Send Slack notification
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `E2E Test Failed: ${testName}`,
        attachments: [{
          color: 'danger',
          fields: [
            { title: 'Test', value: testName, short: true },
            { title: 'Error', value: error.message, short: false },
            { title: 'Build', value: process.env.GITHUB_RUN_ID, short: true }
          ]
        }]
      })
    });
  }
}
```

---

## Performance Benchmarks

### Expected Test Duration

| Test Suite | Expected Duration | Max Duration |
|------------|------------------|--------------|
| Registration Tests | 30s | 60s |
| Share Tests | 45s | 90s |
| Referral Tests | 60s | 120s |
| Activation Tests | 30s | 60s |
| Leaderboard Tests | 30s | 60s |
| **Total** | **~3.5 min** | **5 min** |

### Resource Usage Targets

```javascript
// Monitor resource usage during tests
async function measurePerformance(page, testName) {
  const metrics = await page.metrics();
  const performance = await page.evaluate(() => ({
    memory: performance.memory.usedJSHeapSize / 1024 / 1024, // MB
    domNodes: document.querySelectorAll('*').length,
    jsEventListeners: performance.eventCounts
  }));
  
  console.log(`Performance metrics for ${testName}:`, {
    memory: `${performance.memory.toFixed(2)} MB`,
    domNodes: performance.domNodes,
    jsHeapSize: `${(metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)} MB`
  });
  
  // Assert reasonable limits
  expect(performance.memory).toBeLessThan(100); // 100 MB limit
  expect(performance.domNodes).toBeLessThan(5000); // DOM node limit
}
```

### Optimization Strategies

1. **Parallel Execution**: Run independent test suites in parallel
2. **Smart Waits**: Use explicit waits instead of arbitrary timeouts
3. **Resource Cleanup**: Close pages and contexts after each test
4. **API Mocking**: Mock slow external APIs for unit tests
5. **Screenshot Optimization**: Only capture screenshots on failure

```javascript
// Parallel test execution
// package.json scripts
{
  "scripts": {
    "test:e2e": "jest --maxWorkers=4",
    "test:e2e:serial": "jest --runInBand",
    "test:e2e:watch": "jest --watch"
  }
}
```

---

## Maintenance Guidelines

### Adding New Tests

1. Follow the established pattern in existing test files
2. Use helper functions for common operations
3. Add appropriate cleanup for any test data created
4. Document any new test utilities or patterns
5. Update this specification with new test scenarios

### Debugging Failed Tests

```javascript
// Enable debug mode for detailed logs
DEBUG=puppeteer:* npm run test:e2e

// Take screenshots on failure
afterEach(async () => {
  if (page && currentTest.failed) {
    await page.screenshot({
      path: `screenshots/${currentTest.name}-failure.png`,
      fullPage: true
    });
  }
});

// Pause test execution for debugging
await page.evaluate(() => { debugger; });
```

### Test Maintenance Checklist

- [ ] Review and update tests when features change
- [ ] Remove obsolete tests
- [ ] Refactor duplicated code into helpers
- [ ] Update test data generators as needed
- [ ] Monitor test execution times
- [ ] Review flaky tests monthly

---

## Security Considerations

### Test Environment Isolation

1. Use separate Notion databases for testing
2. Never use production API keys in tests
3. Implement proper cleanup to avoid data leaks
4. Use test-specific email domains
5. Rotate test credentials regularly

### Sensitive Data Handling

```javascript
// Use environment variables for credentials
const config = {
  notionToken: process.env.NOTION_TEST_TOKEN,
  testDbId: process.env.NOTION_TEST_DB_ID,
  // Never hardcode credentials
};

// Mask sensitive data in logs
function maskEmail(email) {
  const [name, domain] = email.split('@');
  return `${name.substring(0, 3)}***@${domain}`;
}
```

---

## Appendix

### Useful Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test suite
npm run test:e2e -- registration.test.js

# Run tests in watch mode
npm run test:e2e:watch

# Run with visible browser
HEADLESS=false npm run test:e2e

# Generate coverage report
npm run test:e2e -- --coverage

# Debug specific test
DEBUG=puppeteer:* npm run test:e2e -- --testNamePattern="User completes registration"
```

### Troubleshooting Guide

| Issue | Solution |
|-------|----------|
| Tests timeout | Increase jest timeout or check for missing `await` |
| Flaky tests | Add explicit waits or improve selectors |
| Memory leaks | Ensure proper cleanup in afterEach hooks |
| Slow tests | Profile and optimize, consider parallelization |
| Network errors | Implement retry logic with exponential backoff |

### Reference Documentation

- [Puppeteer API Documentation](https://pptr.dev/)
- [Jest Testing Framework](https://jestjs.io/)
- [Notion API Reference](https://developers.notion.com/)
- [MCP Puppeteer Tool](https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer)

---

**Document History**
- v1.0 - Initial specification created (December 27, 2024)
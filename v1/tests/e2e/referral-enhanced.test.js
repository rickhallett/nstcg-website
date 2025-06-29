/**
 * Enhanced Referral Attribution E2E Tests
 * 
 * Demonstrates usage of all performance improvements and utilities
 */

import { test, expect } from '@playwright/test';
import { EnhancedTestHelpers } from '../utils/test-helpers-enhanced.js';
import { EnhancedNotionHelpers } from '../utils/notion-helpers-enhanced.js';
import { testDataFactory } from '../utils/test-data-factory.js';
import { setupCustomMatchers, expectElement, AsyncAssertions } from '../utils/custom-matchers.js';
import { performanceMonitor } from '../utils/performance-monitor.js';
import { tags } from '../playwright.config.enhanced.js';
import { puppeteerConfig, selectors } from '../config/puppeteer-config.js';
import { POINTS, TIMEOUTS } from '../config/test-constants.js';

// Setup custom matchers
test.beforeAll(() => {
  setupCustomMatchers();
});

// Test setup
let helpers;
let notionHelpers;
let asyncAssert;
let consoleMonitor;

test.describe('Enhanced Referral Attribution Flow', () => {
  test.beforeEach(async ({ page }) => {
    helpers = new EnhancedTestHelpers(page);
    notionHelpers = new EnhancedNotionHelpers();
    asyncAssert = new AsyncAssertions(page);
    consoleMonitor = helpers.setupConsoleMonitoring();
    
    // Start performance monitoring
    await helpers.startPerformanceMeasure('test-setup');
  });

  test.afterEach(async ({ page }, testInfo) => {
    // End performance monitoring
    const setupMetrics = await helpers.endPerformanceMeasure('test-setup');
    console.log(`Setup took ${setupMetrics.duration}ms`);
    
    // Capture console errors
    const errors = consoleMonitor.getErrors();
    if (errors.length > 0) {
      console.error('Console errors detected:', errors);
    }
    
    // Enhanced screenshot on failure
    if (testInfo.status !== 'passed') {
      await helpers.takeAnnotatedScreenshot(`${testInfo.title}-failure`, {
        annotations: [
          { selector: selectors.errorNotification, text: 'Error here', color: 'red' }
        ]
      });
    }
    
    // Cleanup with retry
    await notionHelpers.cleanupTestData();
  });

  test(`${tags.critical} ${tags.parallel} Complete referral journey with retry logic`, async ({ page }) => {
    // Start test performance measurement
    await helpers.startPerformanceMeasure('complete-referral-journey');
    
    // Step 1: Create referrer with factory
    const referrerData = testDataFactory.generateUserWithTraits({ 
      template: 'newUser' 
    });
    
    const referrer = await helpers.retryOperation(async () => {
      return await testDataFactory.createUserViaAPI(
        puppeteerConfig.baseUrl, 
        referrerData
      );
    });
    
    notionHelpers.trackTestEmail(referrer.email);
    
    // Verify referrer created with custom matcher
    const initialReferrer = await notionHelpers.waitForUser(referrer.email);
    expect(initialReferrer).toBeValidUserProfile();
    expect(initialReferrer.referralCode).toBeValidReferralCode();
    
    // Step 2: Visit with referral link (with network simulation)
    await helpers.setNetworkConditions('fast-3g');
    
    const referralUrl = `${puppeteerConfig.baseUrl}?ref=${referrer.referralCode}`;
    await helpers.measurePageLoad(page, referralUrl);
    
    // Step 3: Verify referral captured
    const cookies = await page.context().cookies();
    expect(cookies).toHaveReferralCookie(referrer.referralCode);
    
    // Step 4: Register referred user with enhanced form filling
    const referredUser = testDataFactory.generateTestUser();
    
    await helpers.fillRegistrationFormWithRetry(referredUser, {
      retries: 2,
      onRetry: async (error, attempt) => {
        console.log(`Registration attempt ${attempt} failed:`, error.message);
        await page.reload();
      }
    });
    
    // Wait for success with retry
    const notification = await helpers.waitForNotificationWithRetry('success');
    expect(notification).toShowNotification('success', 'Welcome');
    
    // Step 5: Verify with enhanced Notion helpers
    await helpers.setNetworkConditions('online'); // Restore network
    
    const referredProfile = await notionHelpers.waitForUser(
      referredUser.email,
      { timeout: 15000 }
    );
    
    notionHelpers.trackTestEmail(referredUser.email);
    
    // Use custom matchers for validation
    expect(referredProfile.registrationPoints).toBe(POINTS.REGISTRATION_REFERRED);
    expect(referredProfile).toHavePointsInRange(100, 200);
    expect(referredProfile.referredBy).toBe(referrer.referralCode);
    
    // Step 6: Verify referrer points with eventual consistency
    await asyncAssert.eventuallyTrue(async () => {
      const updatedReferrer = await notionHelpers.findUserByEmail(
        referrer.email, 
        'gamification',
        { useCache: false }
      );
      expect(updatedReferrer.referralPoints).toBe(POINTS.REFERRAL_BONUS);
    }, { timeout: 10000 });
    
    // Verify referral chain integrity
    const chainValidation = await notionHelpers.verifyReferralChain(
      referrer.email,
      [referredUser.email]
    );
    expect(chainValidation).toBeValidReferralChain();
    
    // End performance measurement
    const testMetrics = await helpers.endPerformanceMeasure('complete-referral-journey');
    expect(testMetrics).toBeFasterThan(20000); // Should complete within 20s
  });

  test(`${tags.smoke} Bulk referral performance test`, async ({ browser }) => {
    // Create referrer
    const referrer = await testDataFactory.createUserViaAPI(
      puppeteerConfig.baseUrl,
      testDataFactory.generateTestUser()
    );
    notionHelpers.trackTestEmail(referrer.email);
    
    // Register multiple users in parallel
    const userCount = 5;
    const registrations = [];
    
    console.log(`Registering ${userCount} users in parallel...`);
    const parallelTimer = performanceMonitor.startTimer('parallel-registrations');
    
    for (let i = 0; i < userCount; i++) {
      registrations.push((async () => {
        const context = await browser.newContext();
        const page = await context.newPage();
        const helpers = new EnhancedTestHelpers(page);
        
        try {
          await page.goto(`${puppeteerConfig.baseUrl}?ref=${referrer.referralCode}`);
          
          const user = testDataFactory.generateTestUser({
            firstName: `Bulk${i}`
          });
          
          await helpers.fillRegistrationForm(user);
          await helpers.waitForNotificationWithRetry('success');
          
          notionHelpers.trackTestEmail(user.email);
          return user;
        } finally {
          await context.close();
        }
      })());
    }
    
    // Wait for all registrations
    const users = await Promise.all(registrations);
    const parallelDuration = parallelTimer.end();
    
    console.log(`Parallel registrations completed in ${parallelDuration}ms`);
    expect(parallelDuration).toBeFasterThan(userCount * 5000); // Should be faster than sequential
    
    // Verify all referrals with batch operation
    const userEmails = users.map(u => u.email);
    const profiles = await notionHelpers.findUsersByEmails(userEmails, 'gamification');
    
    expect(profiles).toHaveLength(userCount);
    profiles.forEach(profile => {
      expect(profile.referredBy).toBe(referrer.referralCode);
    });
    
    // Verify referrer points
    const finalReferrer = await notionHelpers.waitForPointsUpdate(
      referrer.email,
      POINTS.REFERRAL_BONUS * userCount
    );
    
    expect(finalReferrer.directReferrals).toBe(userCount);
  });

  test(`${tags.network} Referral with network failures`, async ({ page }) => {
    // Create referrer
    const referrer = await testDataFactory.createUserViaAPI(
      puppeteerConfig.baseUrl,
      testDataFactory.generateTestUser()
    );
    notionHelpers.trackTestEmail(referrer.email);
    
    // Visit with referral
    await page.goto(`${puppeteerConfig.baseUrl}?ref=${referrer.referralCode}`);
    
    // Simulate network failure during registration
    await helpers.setNetworkConditions('slow-edge');
    
    // Mock API to fail initially
    let attempts = 0;
    await page.route('**/api/submit-form', async route => {
      attempts++;
      if (attempts <= 2) {
        await route.abort('failed');
      } else {
        await route.continue();
      }
    });
    
    // Fill form
    const user = testDataFactory.generateTestUser();
    await helpers.fillRegistrationForm(user);
    
    // Should retry and eventually succeed
    const notification = await helpers.waitForNotificationWithRetry('success', {
      timeout: 30000,
      retries: 3
    });
    
    expect(notification).toBeTruthy();
    expect(attempts).toBeGreaterThanOrEqual(3);
    
    // Restore network
    await helpers.setNetworkConditions('online');
    await page.unroute('**/api/submit-form');
    
    // Verify registration succeeded
    const profile = await notionHelpers.waitForUser(user.email);
    notionHelpers.trackTestEmail(user.email);
    expect(profile.referredBy).toBe(referrer.referralCode);
  });

  test(`${tags.regression} Referral chain validation`, async ({ browser }) => {
    // Create a chain of referrals
    const chain = await testDataFactory.createReferralChain(3, {
      baseUrl: puppeteerConfig.baseUrl,
      createViaAPI: false // We'll create manually for this test
    });
    
    // Register each user in the chain
    for (let i = 0; i < chain.users.length; i++) {
      const user = chain.users[i];
      const referrer = i > 0 ? chain.users[i - 1] : null;
      
      const context = await browser.newContext();
      const page = await context.newPage();
      const helpers = new EnhancedTestHelpers(page);
      
      try {
        // Visit with referral if not root
        const url = referrer 
          ? `${puppeteerConfig.baseUrl}?ref=${referrer.referralCode}`
          : puppeteerConfig.baseUrl;
        
        await page.goto(url);
        
        // Register user
        await helpers.fillRegistrationFormWithRetry(user);
        await helpers.waitForNotificationWithRetry('success');
        
        // Extract generated referral code
        const referralCode = await helpers.getLocalStorageItemSafe('nstcg_referral_code');
        user.referralCode = referralCode;
        
        notionHelpers.trackTestEmail(user.email);
      } finally {
        await context.close();
      }
      
      // Wait between registrations
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Validate the entire chain
    const validation = await notionHelpers.verifyReferralChain(
      chain.root.email,
      chain.users.slice(1).map(u => u.email)
    );
    
    expect(validation).toBeValidReferralChain();
    
    // Verify points cascade
    for (let i = 0; i < chain.users.length - 1; i++) {
      const referrer = await notionHelpers.findUserByEmail(
        chain.users[i].email,
        'gamification'
      );
      
      // Each referrer should have points for users they directly referred
      const expectedReferrals = chain.users.length - i - 1;
      expect(referrer.directReferrals).toBe(1); // Only direct referrals count
      expect(referrer.referralPoints).toBe(POINTS.REFERRAL_BONUS);
    }
  });
});

// Performance benchmark test
test.describe('Referral Performance Benchmarks', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Benchmark only on Chrome');
  
  test(`${tags.slow} Measure referral flow performance`, async ({ page }) => {
    const metrics = await performanceMonitor.measurePageLoad(
      page,
      puppeteerConfig.baseUrl
    );
    
    console.log('Page load metrics:', metrics);
    
    // Benchmark registration
    const registrationTimer = performanceMonitor.startTimer('registration-flow');
    
    const user = testDataFactory.generateTestUser();
    const helpers = new EnhancedTestHelpers(page);
    
    await helpers.fillRegistrationForm(user);
    await helpers.waitForNotificationWithRetry('success');
    
    const registrationDuration = registrationTimer.end();
    
    // Assert performance thresholds
    expect(metrics.loadComplete).toBeLessThan(3000);
    expect(metrics.firstContentfulPaint).toBeLessThan(1500);
    expect(registrationDuration).toBeFasterThan(5000);
    
    // Generate performance report
    await performanceMonitor.generateReport(
      `test-results/performance/referral-benchmark-${Date.now()}.json`
    );
  });
});
/**
 * Referral Attribution E2E Tests
 * 
 * Tests for complete referral flow from sharing to attribution
 */

import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers.js';
import { NotionTestHelpers } from '../utils/notion-helpers.js';
import { generateTestUser, generateReferralCode, createTestUserViaAPI } from '../utils/data-generators.js';
import { puppeteerConfig, selectors } from '../config/puppeteer-config.js';
import { POINTS, TIMEOUTS } from '../config/test-constants.js';

// Test setup
let notionHelpers;

test.describe('Referral Attribution Flow', () => {
  test.beforeEach(async () => {
    notionHelpers = new NotionTestHelpers();
  });

  test.afterEach(async () => {
    await notionHelpers.cleanupTestData();
  });

  test('Complete referral journey awards points correctly', async ({ browser }) => {
    // Step 1: Create referrer user
    const referrer = await createTestUserViaAPI(puppeteerConfig.baseUrl);
    notionHelpers.trackTestEmail(referrer.email);
    
    // Verify referrer has initial state
    const initialReferrer = await notionHelpers.waitForUser(referrer.email);
    expect(initialReferrer.referralCode).toBeTruthy();
    expect(initialReferrer.directReferrals).toBe(0);
    expect(initialReferrer.referralPoints).toBe(0);
    
    // Step 2: Create new browser context for referred user
    const referredContext = await browser.newContext();
    const referredPage = await referredContext.newPage();
    const referredHelpers = new TestHelpers(referredPage);
    
    // Step 3: Visit site with referral link
    const referralUrl = `${puppeteerConfig.baseUrl}?ref=${referrer.referralCode}`;
    await referredPage.goto(referralUrl);
    
    // Verify referral code captured in cookie
    const cookies = await referredContext.cookies();
    const refCookie = cookies.find(c => c.name === 'nstcg_ref');
    expect(refCookie).toBeTruthy();
    expect(refCookie.value).toBe(referrer.referralCode);
    
    // Step 4: Complete registration as referred user
    const referredUser = generateTestUser();
    await referredHelpers.fillRegistrationForm(referredUser);
    await referredHelpers.waitForNotification('success');
    
    // Wait for API processing
    await referredPage.waitForTimeout(TIMEOUTS.NOTION_SYNC);
    
    // Step 5: Verify referred user received bonus points
    const referredProfile = await notionHelpers.waitForUser(referredUser.email);
    notionHelpers.trackTestEmail(referredUser.email);
    
    expect(referredProfile.registrationPoints).toBe(POINTS.REGISTRATION_REFERRED);
    expect(referredProfile.totalPoints).toBeGreaterThanOrEqual(POINTS.REGISTRATION_REFERRED);
    expect(referredProfile.referredBy).toBe(referrer.referralCode);
    
    // Step 6: Verify referrer received referral points
    const updatedReferrer = await notionHelpers.findUserByEmail(referrer.email);
    expect(updatedReferrer.referralPoints).toBe(POINTS.REFERRAL_BONUS);
    expect(updatedReferrer.directReferrals).toBe(1);
    expect(updatedReferrer.totalPoints).toBeGreaterThanOrEqual(POINTS.REFERRAL_BONUS);
    
    // Cleanup
    await referredContext.close();
  });

  test('Multiple referrals from same referrer accumulate correctly', async ({ browser }) => {
    // Create referrer
    const referrer = await createTestUserViaAPI(puppeteerConfig.baseUrl);
    notionHelpers.trackTestEmail(referrer.email);
    
    const referralUrl = `${puppeteerConfig.baseUrl}?ref=${referrer.referralCode}`;
    const referredUsers = [];
    
    // Register 3 users via referral link
    for (let i = 0; i < 3; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const helpers = new TestHelpers(page);
      
      await page.goto(referralUrl);
      
      const user = generateTestUser();
      await helpers.fillRegistrationForm(user);
      await helpers.waitForNotification('success');
      
      referredUsers.push(user);
      notionHelpers.trackTestEmail(user.email);
      
      await context.close();
      
      // Wait between registrations
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Wait for all processing
    await new Promise(resolve => setTimeout(resolve, TIMEOUTS.NOTION_SYNC));
    
    // Verify referrer points accumulated
    const finalReferrer = await notionHelpers.findUserByEmail(referrer.email);
    expect(finalReferrer.directReferrals).toBe(3);
    expect(finalReferrer.referralPoints).toBe(POINTS.REFERRAL_BONUS * 3);
    expect(finalReferrer.totalPoints).toBeGreaterThanOrEqual(POINTS.REFERRAL_BONUS * 3);
    
    // Verify all referred users got their bonuses
    for (const user of referredUsers) {
      const profile = await notionHelpers.findUserByEmail(user.email);
      expect(profile.registrationPoints).toBe(POINTS.REGISTRATION_REFERRED);
      expect(profile.referredBy).toBe(referrer.referralCode);
    }
  });

  test('Referral cookie persists across pages', async ({ page, context }) => {
    // Create referrer
    const referrer = await createTestUserViaAPI(puppeteerConfig.baseUrl);
    notionHelpers.trackTestEmail(referrer.email);
    
    // Visit with referral link
    await page.goto(`${puppeteerConfig.baseUrl}?ref=${referrer.referralCode}`);
    
    // Navigate to different pages
    await page.goto(`${puppeteerConfig.baseUrl}/privacy-policy.html`);
    await page.goto(`${puppeteerConfig.baseUrl}/donate.html`);
    await page.goto(puppeteerConfig.baseUrl); // Back to home
    
    // Verify cookie still exists
    const cookies = await context.cookies();
    const refCookie = cookies.find(c => c.name === 'nstcg_ref');
    expect(refCookie).toBeTruthy();
    expect(refCookie.value).toBe(referrer.referralCode);
    
    // Complete registration
    const helpers = new TestHelpers(page);
    const user = generateTestUser();
    await helpers.fillRegistrationForm(user);
    await helpers.waitForNotification('success');
    
    // Verify referral tracked
    await page.waitForTimeout(TIMEOUTS.NOTION_SYNC);
    const profile = await notionHelpers.findUserByEmail(user.email);
    notionHelpers.trackTestEmail(user.email);
    expect(profile.referredBy).toBe(referrer.referralCode);
  });

  test('Invalid referral codes do not break registration', async ({ page }) => {
    // Try various invalid referral codes
    const invalidCodes = [
      'INVALID',
      '123456789',
      'ABC',
      'TOO-LONG-CODE-123456',
      'special!@#$%'
    ];
    
    for (const code of invalidCodes) {
      await page.goto(`${puppeteerConfig.baseUrl}?ref=${code}`);
      
      const helpers = new TestHelpers(page);
      const user = generateTestUser();
      
      // Registration should still work
      await helpers.fillRegistrationForm(user);
      await helpers.waitForNotification('success');
      
      // Verify user created without referral
      await page.waitForTimeout(TIMEOUTS.NOTION_SYNC);
      const profile = await notionHelpers.findUserByEmail(user.email);
      notionHelpers.trackTestEmail(user.email);
      
      expect(profile).toBeTruthy();
      expect(profile.referredBy).toBeFalsy();
      expect(profile.registrationPoints).toBe(POINTS.REGISTRATION_DIRECT);
      
      // Clear for next test
      await helpers.clearLocalStorage();
    }
  });

  test('Self-referral is prevented', async ({ page }) => {
    // Create user
    const user = await createTestUserViaAPI(puppeteerConfig.baseUrl);
    notionHelpers.trackTestEmail(user.email);
    
    // Try to use own referral code
    await page.goto(`${puppeteerConfig.baseUrl}?ref=${user.referralCode}`);
    
    // Set localStorage to simulate same user
    const helpers = new TestHelpers(page);
    await helpers.setLocalStorageItem('nstcg_email', user.email);
    await helpers.setLocalStorageItem('nstcg_referral_code', user.referralCode);
    await helpers.setLocalStorageItem('nstcg_user_registered', 'true');
    
    // Navigate to home (should detect existing user)
    await page.goto(puppeteerConfig.baseUrl);
    
    // Verify no additional points awarded
    await page.waitForTimeout(TIMEOUTS.NOTION_SYNC);
    const profile = await notionHelpers.findUserByEmail(user.email);
    expect(profile.referralPoints).toBe(0);
    expect(profile.directReferrals).toBe(0);
  });

  test('Referral attribution works with special characters in name', async ({ browser }) => {
    // Create referrer with special characters
    const referrer = await createTestUserViaAPI(puppeteerConfig.baseUrl, {
      firstName: "O'Connor",
      lastName: "José-María"
    });
    notionHelpers.trackTestEmail(referrer.email);
    
    // Use referral link
    const context = await browser.newContext();
    const page = await context.newPage();
    const helpers = new TestHelpers(page);
    
    await page.goto(`${puppeteerConfig.baseUrl}?ref=${referrer.referralCode}`);
    
    // Register new user
    const user = generateTestUser();
    await helpers.fillRegistrationForm(user);
    await helpers.waitForNotification('success');
    
    // Verify attribution worked
    await page.waitForTimeout(TIMEOUTS.NOTION_SYNC);
    const referredProfile = await notionHelpers.findUserByEmail(user.email);
    notionHelpers.trackTestEmail(user.email);
    
    expect(referredProfile.referredBy).toBe(referrer.referralCode);
    
    const updatedReferrer = await notionHelpers.findUserByEmail(referrer.email);
    expect(updatedReferrer.directReferrals).toBe(1);
    
    await context.close();
  });

  test('Referral tracking handles concurrent registrations', async ({ browser }) => {
    // Create referrer
    const referrer = await createTestUserViaAPI(puppeteerConfig.baseUrl);
    notionHelpers.trackTestEmail(referrer.email);
    
    // Register 5 users concurrently
    const registrations = [];
    
    for (let i = 0; i < 5; i++) {
      registrations.push((async () => {
        const context = await browser.newContext();
        const page = await context.newPage();
        const helpers = new TestHelpers(page);
        
        await page.goto(`${puppeteerConfig.baseUrl}?ref=${referrer.referralCode}`);
        
        const user = generateTestUser();
        await helpers.fillRegistrationForm(user);
        await helpers.waitForNotification('success');
        
        notionHelpers.trackTestEmail(user.email);
        await context.close();
        
        return user;
      })());
    }
    
    // Wait for all registrations
    const users = await Promise.all(registrations);
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, TIMEOUTS.NOTION_SYNC * 2));
    
    // Verify all referrals tracked
    const finalReferrer = await notionHelpers.findUserByEmail(referrer.email);
    expect(finalReferrer.directReferrals).toBe(5);
    expect(finalReferrer.referralPoints).toBe(POINTS.REFERRAL_BONUS * 5);
    
    // Verify all users attributed correctly
    for (const user of users) {
      const profile = await notionHelpers.findUserByEmail(user.email);
      expect(profile.referredBy).toBe(referrer.referralCode);
    }
  });

  test('Referral cookie has correct expiration', async ({ page, context }) => {
    // Create referrer
    const referrer = await createTestUserViaAPI(puppeteerConfig.baseUrl);
    notionHelpers.trackTestEmail(referrer.email);
    
    // Visit with referral link
    await page.goto(`${puppeteerConfig.baseUrl}?ref=${referrer.referralCode}`);
    
    // Check cookie details
    const cookies = await context.cookies();
    const refCookie = cookies.find(c => c.name === 'nstcg_ref');
    
    expect(refCookie).toBeTruthy();
    expect(refCookie.value).toBe(referrer.referralCode);
    expect(refCookie.expires).toBeGreaterThan(Date.now() / 1000); // Not expired
    
    // Cookie should expire in 30 days
    const expirationTime = refCookie.expires * 1000;
    const expectedExpiration = Date.now() + (30 * 24 * 60 * 60 * 1000);
    expect(expirationTime).toBeCloseTo(expectedExpiration, -100000); // Within ~1 day
  });

  test('Direct registration (no referral) awards no bonus points', async ({ page }) => {
    // Visit without referral link
    await page.goto(puppeteerConfig.baseUrl);
    
    // Verify no referral cookie set
    const helpers = new TestHelpers(page);
    const cookies = await page.context().cookies();
    const refCookie = cookies.find(c => c.name === 'nstcg_ref');
    expect(refCookie).toBeFalsy();
    
    // Complete registration
    const user = generateTestUser();
    await helpers.fillRegistrationForm(user);
    await helpers.waitForNotification('success');
    
    // Verify no bonus points
    await page.waitForTimeout(TIMEOUTS.NOTION_SYNC);
    const profile = await notionHelpers.findUserByEmail(user.email);
    notionHelpers.trackTestEmail(user.email);
    
    expect(profile.registrationPoints).toBe(POINTS.REGISTRATION_DIRECT);
    expect(profile.referredBy).toBeFalsy();
    expect(profile.totalPoints).toBe(POINTS.REGISTRATION_DIRECT);
  });

  test('Referral link works across different browsers', async ({ browser, browserName }) => {
    // Create referrer
    const referrer = await createTestUserViaAPI(puppeteerConfig.baseUrl);
    notionHelpers.trackTestEmail(referrer.email);
    
    // Test in incognito/private mode (simulates different browser)
    const privateContext = await browser.newContext();
    const privatePage = await privateContext.newPage();
    const helpers = new TestHelpers(privatePage);
    
    // Visit with referral link
    await privatePage.goto(`${puppeteerConfig.baseUrl}?ref=${referrer.referralCode}`);
    
    // Register user
    const user = generateTestUser();
    await helpers.fillRegistrationForm(user);
    await helpers.waitForNotification('success');
    
    // Verify referral tracked
    await privatePage.waitForTimeout(TIMEOUTS.NOTION_SYNC);
    const profile = await notionHelpers.findUserByEmail(user.email);
    notionHelpers.trackTestEmail(user.email);
    
    expect(profile.referredBy).toBe(referrer.referralCode);
    
    const updatedReferrer = await notionHelpers.findUserByEmail(referrer.email);
    expect(updatedReferrer.directReferrals).toBe(1);
    
    await privateContext.close();
  });
});
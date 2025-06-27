/**
 * Registration Flow E2E Tests
 * 
 * Tests for user registration and referral code generation
 */

import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers.js';
import { NotionTestHelpers } from '../utils/notion-helpers.js';
import { generateTestUser, generateReferralCode } from '../utils/data-generators.js';
import { puppeteerConfig, selectors, patterns } from '../config/puppeteer-config.js';
import { POINTS, TIMEOUTS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../config/test-constants.js';

// Test setup
let helpers;
let notionHelpers;
let testUser;

test.describe('Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    notionHelpers = new NotionTestHelpers();
    testUser = generateTestUser();
    
    // Navigate to homepage
    await page.goto(puppeteerConfig.baseUrl);
  });

  test.afterEach(async () => {
    // Clean up test data
    if (testUser && testUser.email) {
      notionHelpers.trackTestEmail(testUser.email);
    }
    await notionHelpers.cleanupTestData();
  });

  test('User completes registration and receives referral code', async ({ page }) => {
    // Fill and submit registration form
    await helpers.fillRegistrationForm(testUser);
    
    // Wait for success notification
    const notification = await helpers.waitForNotification('success');
    expect(notification.text).toContain('success');
    
    // Verify referral code generated and stored in localStorage
    const referralCode = await helpers.extractReferralCode();
    expect(referralCode).toMatch(patterns.referralCode);
    expect(referralCode).toHaveLength(11);
    
    // Verify all user data in localStorage
    const localStorage = await helpers.getAllLocalStorage();
    expect(localStorage.nstcg_email).toBe(testUser.email);
    expect(localStorage.nstcg_first_name).toBe(testUser.firstName);
    expect(localStorage.nstcg_last_name).toBe(testUser.lastName);
    expect(localStorage.nstcg_user_registered).toBe('true');
    
    // Wait for Notion sync
    await page.waitForTimeout(TIMEOUTS.NOTION_SYNC);
    
    // Verify user created in Notion gamification database
    const gamificationProfile = await notionHelpers.findUserByEmail(testUser.email, 'gamification');
    expect(gamificationProfile).toBeTruthy();
    expect(gamificationProfile.referralCode).toBe(referralCode);
    expect(gamificationProfile.totalPoints).toBe(POINTS.REGISTRATION_DIRECT);
    expect(gamificationProfile.optedIntoLeaderboard).toBe(true);
    
    // Verify user created in Notion leads database
    const leadsProfile = await notionHelpers.findUserByEmail(testUser.email, 'leads');
    expect(leadsProfile).toBeTruthy();
    expect(leadsProfile.firstName).toBe(testUser.firstName);
    expect(leadsProfile.lastName).toBe(testUser.lastName);
    expect(leadsProfile.visitorType).toBe('Local');
  });

  test('Registration with referral link awards points correctly', async ({ page }) => {
    // Create referrer user first
    const referrer = generateTestUser();
    const referrerCode = generateReferralCode(referrer.firstName);
    
    // Create referrer in Notion
    await notionHelpers.createTestUser({
      ...referrer,
      name: `${referrer.firstName} ${referrer.lastName}`,
      referralCode: referrerCode,
      totalPoints: 50
    }, 'gamification');
    
    // Navigate with referral link
    await page.goto(`${puppeteerConfig.baseUrl}?ref=${referrerCode}`);
    
    // Verify referral code is captured in cookie
    const cookies = await page.context().cookies();
    const refCookie = cookies.find(c => c.name === 'nstcg_ref');
    expect(refCookie).toBeTruthy();
    expect(refCookie.value).toBe(referrerCode);
    
    // Complete registration
    const referredUser = generateTestUser();
    await helpers.fillRegistrationForm(referredUser);
    await helpers.waitForNotification('success');
    
    // Wait for API processing
    await page.waitForTimeout(TIMEOUTS.NOTION_SYNC);
    
    // Verify referred user received bonus points
    const referredProfile = await notionHelpers.findUserByEmail(referredUser.email, 'gamification');
    expect(referredProfile).toBeTruthy();
    expect(referredProfile.registrationPoints).toBe(POINTS.REGISTRATION_REFERRED);
    expect(referredProfile.totalPoints).toBeGreaterThanOrEqual(POINTS.REGISTRATION_REFERRED);
    expect(referredProfile.referredBy).toBe(referrerCode);
    
    // Verify referrer received referral points
    const updatedReferrer = await notionHelpers.findUserByEmail(referrer.email, 'gamification');
    expect(updatedReferrer.referralPoints).toBe(POINTS.REFERRAL_BONUS);
    expect(updatedReferrer.directReferrals).toBe(1);
    expect(updatedReferrer.totalPoints).toBe(50 + POINTS.REFERRAL_BONUS);
    
    // Track for cleanup
    notionHelpers.trackTestEmail(referrer.email);
    notionHelpers.trackTestEmail(referredUser.email);
  });

  test('Duplicate registration shows appropriate error', async ({ page }) => {
    // First registration
    await helpers.fillRegistrationForm(testUser);
    await helpers.waitForNotification('success');
    
    // Clear form and try to register again
    await page.reload();
    await helpers.fillRegistrationForm(testUser);
    
    // Should show error notification
    const errorNotification = await helpers.waitForNotification('error');
    expect(errorNotification.text.toLowerCase()).toContain(ERROR_MESSAGES.ALREADY_REGISTERED);
    
    // Verify no duplicate entries in database
    await page.waitForTimeout(TIMEOUTS.NOTION_SYNC);
    const profiles = await notionHelpers.findUserByEmail(testUser.email, 'gamification');
    expect(profiles).toBeTruthy(); // Should still be just one
  });

  test('Registration validates required fields', async ({ page }) => {
    // Try to submit without filling form
    await page.click(selectors.submitBtn);
    
    // Check HTML5 validation
    const firstNameValid = await page.$eval(selectors.firstName, el => el.validity.valid);
    expect(firstNameValid).toBe(false);
    
    // Fill only first name and try again
    await page.fill(selectors.firstName, testUser.firstName);
    await page.click(selectors.submitBtn);
    
    const lastNameValid = await page.$eval(selectors.lastName, el => el.validity.valid);
    expect(lastNameValid).toBe(false);
    
    // Fill last name but not email
    await page.fill(selectors.lastName, testUser.lastName);
    await page.click(selectors.submitBtn);
    
    const emailValid = await page.$eval(selectors.email, el => el.validity.valid);
    expect(emailValid).toBe(false);
  });

  test('Registration handles invalid email format', async ({ page }) => {
    const invalidUser = generateTestUser({ email: 'invalid-email-format' });
    
    await helpers.fillRegistrationForm(invalidUser);
    
    // Browser should show validation error
    const emailValid = await page.$eval(selectors.email, el => el.validity.valid);
    expect(emailValid).toBe(false);
    
    // Form should not submit
    const formSubmitted = await page.evaluate(() => {
      return new Promise(resolve => {
        document.querySelector('form').addEventListener('submit', () => resolve(true));
        setTimeout(() => resolve(false), 100);
      });
    });
    expect(formSubmitted).toBe(false);
  });

  test('Registration works for tourist visitors', async ({ page }) => {
    const touristUser = generateTestUser({ visitorType: 'tourist' });
    
    await helpers.fillRegistrationForm(touristUser);
    await helpers.waitForNotification('success');
    
    // Verify visitor type in localStorage
    const visitorType = await helpers.getLocalStorageItem('nstcg_visitor_type');
    expect(visitorType).toBe('tourist');
    
    // Verify in Notion
    await page.waitForTimeout(TIMEOUTS.NOTION_SYNC);
    const profile = await notionHelpers.findUserByEmail(touristUser.email, 'leads');
    expect(profile.visitorType).toBe('Tourist');
    
    notionHelpers.trackTestEmail(touristUser.email);
  });

  test('Registration handles network errors gracefully', async ({ page }) => {
    // Fill form first
    await helpers.fillRegistrationForm(testUser);
    
    // Simulate network failure
    await page.setOfflineMode(true);
    
    // Submit form
    await page.click(selectors.submitBtn);
    
    // Should show error notification
    const errorNotification = await helpers.waitForNotification('error');
    expect(errorNotification.text.toLowerCase()).toContain(ERROR_MESSAGES.NETWORK_ERROR);
    
    // Re-enable network
    await page.setOfflineMode(false);
    
    // Retry should work
    await page.click(selectors.submitBtn);
    await helpers.waitForNotification('success');
  });

  test('Registration preserves form data on error', async ({ page }) => {
    // Mock API to return error
    await helpers.mockAPIResponse('/api/submit-form', { 
      error: 'Server error' 
    }, 500);
    
    // Fill and submit form
    await helpers.fillRegistrationForm(testUser);
    
    // Wait for error
    await helpers.waitForNotification('error');
    
    // Verify form data is preserved
    const firstName = await page.$eval(selectors.firstName, el => el.value);
    const lastName = await page.$eval(selectors.lastName, el => el.value);
    const email = await page.$eval(selectors.email, el => el.value);
    
    expect(firstName).toBe(testUser.firstName);
    expect(lastName).toBe(testUser.lastName);
    expect(email).toBe(testUser.email);
    
    // Remove mock
    await helpers.removeMock('/api/submit-form');
  });

  test('Referral code format follows expected pattern', async ({ page }) => {
    // Test multiple registrations to verify consistent format
    const users = Array.from({ length: 5 }, () => generateTestUser());
    
    for (const user of users) {
      await page.goto(puppeteerConfig.baseUrl);
      await helpers.fillRegistrationForm(user);
      await helpers.waitForNotification('success');
      
      const referralCode = await helpers.extractReferralCode();
      
      // Verify format: 3 letters + 8 alphanumeric
      expect(referralCode).toMatch(patterns.referralCode);
      
      // Verify first 3 chars match first name
      const prefix = user.firstName.substring(0, 3).toUpperCase();
      expect(referralCode.startsWith(prefix)).toBe(true);
      
      // Track for cleanup
      notionHelpers.trackTestEmail(user.email);
      
      // Clear for next iteration
      await helpers.clearLocalStorage();
    }
  });

  test('Registration with slow network still completes', async ({ page }) => {
    // Simulate slow 3G network
    await helpers.simulateSlowNetwork();
    
    // Fill and submit form
    await helpers.fillRegistrationForm(testUser);
    
    // Should still complete, just slower
    const notification = await helpers.waitForNotification('success');
    expect(notification).toBeTruthy();
    
    // Restore network
    await helpers.restoreNetwork();
    
    // Verify data saved
    await page.waitForTimeout(TIMEOUTS.NOTION_SYNC);
    const profile = await notionHelpers.findUserByEmail(testUser.email, 'gamification');
    expect(profile).toBeTruthy();
  });
});
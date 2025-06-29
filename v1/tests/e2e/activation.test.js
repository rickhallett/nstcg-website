/**
 * Email Activation E2E Tests
 * 
 * Tests for email campaign activation flow with bonus points
 */

import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers.js';
import { NotionTestHelpers } from '../utils/notion-helpers.js';
import { generateTestUser, generateBonusPoints, generateActivationUrl } from '../utils/data-generators.js';
import { puppeteerConfig, selectors } from '../config/puppeteer-config.js';
import { POINTS, TIMEOUTS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../config/test-constants.js';

// Test setup
let helpers;
let notionHelpers;

test.describe('Email Activation Flow', () => {
  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    notionHelpers = new NotionTestHelpers();
  });

  test.afterEach(async () => {
    await notionHelpers.cleanupTestData();
  });

  test('User can activate account via email link with bonus points', async ({ page }) => {
    // Generate test data
    const testEmail = 'activation-test@example.com';
    const bonusPoints = 75;
    const activationUrl = generateActivationUrl(testEmail, bonusPoints, puppeteerConfig.baseUrl);

    // Navigate to activation URL
    await page.goto(activationUrl);

    // Wait for activation modal to appear
    await page.waitForSelector(selectors.activationModal, { visible: true });

    // Verify email is pre-filled
    const modalEmail = await page.$eval('#modal-activation .user-email', el => el.textContent);
    expect(modalEmail).toContain(testEmail);

    // Verify bonus points displayed
    const bonusDisplay = await page.$eval('.bonus-points-display', el => el.textContent);
    expect(bonusDisplay).toContain(bonusPoints.toString());
    expect(bonusDisplay).toContain('bonus points');

    // Select visitor type
    await page.click('#modal-visitor-type-local');

    // Submit activation
    await page.click('#activate-btn');

    // Wait for success
    await helpers.waitForNotification('success');

    // Verify localStorage populated
    const localStorage = await helpers.getAllLocalStorage();
    expect(localStorage.nstcg_email).toBe(testEmail);
    expect(localStorage.nstcg_user_registered).toBe('true');
    expect(localStorage.nstcg_visitor_type).toBe('local');

    // Wait for Notion sync
    await page.waitForTimeout(TIMEOUTS.NOTION_SYNC);

    // Verify user created with bonus points
    const profile = await notionHelpers.findUserByEmail(testEmail, 'gamification');
    notionHelpers.trackTestEmail(testEmail);

    expect(profile).toBeTruthy();
    expect(profile.bonusPoints).toBe(bonusPoints);
    expect(profile.totalPoints).toBeGreaterThanOrEqual(bonusPoints);

    // Verify page reloaded to show registered state
    await page.waitForSelector('.user-registered-indicator', { timeout: 5000 });
  });

  test('Activation handles various bonus point values', async ({ page }) => {
    // Test different bonus point values
    const testCases = [
      { points: POINTS.EMAIL_BONUS_MIN, email: 'min-bonus@example.com' },
      { points: POINTS.EMAIL_BONUS_MAX, email: 'max-bonus@example.com' },
      { points: 35, email: 'mid-bonus@example.com' }
    ];

    for (const testCase of testCases) {
      // Fresh page for each test
      await page.goto('about:blank');

      const activationUrl = generateActivationUrl(
        testCase.email,
        testCase.points,
        puppeteerConfig.baseUrl
      );

      await page.goto(activationUrl);
      await page.waitForSelector(selectors.activationModal, { visible: true });

      // Verify bonus points
      const bonusDisplay = await page.$eval('.bonus-points-display', el => el.textContent);
      expect(bonusDisplay).toContain(testCase.points.toString());

      // Complete activation
      await page.click('#modal-visitor-type-local');
      await page.click('#activate-btn');
      await helpers.waitForNotification('success');

      // Verify in database
      await page.waitForTimeout(TIMEOUTS.NOTION_SYNC);
      const profile = await notionHelpers.findUserByEmail(testCase.email, 'gamification');
      notionHelpers.trackTestEmail(testCase.email);

      expect(profile.bonusPoints).toBe(testCase.points);

      // Clear for next iteration
      await helpers.clearLocalStorage();
    }
  });

  test('Activation validates bonus points range', async ({ page }) => {
    // Test invalid bonus point values
    const invalidCases = [
      { points: 5, expected: POINTS.EMAIL_BONUS_MIN },    // Too low
      { points: 100, expected: POINTS.EMAIL_BONUS_MAX },  // Too high
      { points: -10, expected: POINTS.EMAIL_BONUS_MIN },  // Negative
      { points: 'abc', expected: 25 }              // Non-numeric
    ];

    for (const testCase of invalidCases) {
      const email = `invalid-bonus-${testCase.points}@example.com`;
      const url = `${puppeteerConfig.baseUrl}?user_email=${encodeURIComponent(email)}&bonus=${testCase.points}`;

      await page.goto(url);
      await page.waitForSelector(selectors.activationModal, { visible: true });

      // Should show adjusted/default value
      const bonusDisplay = await page.$eval('.bonus-points-display', el => el.textContent);
      const displayedPoints = parseInt(bonusDisplay.match(/\d+/)[0]);

      expect(displayedPoints).toBeGreaterThanOrEqual(POINTS.EMAIL_BONUS_MIN);
      expect(displayedPoints).toBeLessThanOrEqual(POINTS.EMAIL_BONUS_MAX);

      // Close modal
      await page.keyboard.press('Escape');
      await helpers.waitForHidden(selectors.activationModal);
    }
  });

  test('Activation requires visitor type selection', async ({ page }) => {
    const email = 'visitor-type-test@example.com';
    const activationUrl = generateActivationUrl(email, 30, puppeteerConfig.baseUrl);

    await page.goto(activationUrl);
    await page.waitForSelector(selectors.activationModal, { visible: true });

    // Try to submit without selecting visitor type
    await page.click('#activate-btn');

    // Should show validation error
    const validationError = await page.waitForSelector('.visitor-type-error', {
      visible: true,
      timeout: 2000
    });
    expect(validationError).toBeTruthy();

    // Select visitor type and retry
    await page.click('#modal-visitor-type-tourist');
    await page.click('#activate-btn');

    // Should succeed now
    await helpers.waitForNotification('success');

    // Verify visitor type saved
    const visitorType = await helpers.getLocalStorageItem('nstcg_visitor_type');
    expect(visitorType).toBe('tourist');

    notionHelpers.trackTestEmail(email);
  });

  test('Activation handles special characters in email', async ({ page }) => {
    // Test emails with special characters
    const specialEmails = [
      'test+tag@example.com',
      'test.name@example.com',
      'test_user@example.com',
      'test123@example.com'
    ];

    for (const email of specialEmails) {
      await page.goto('about:blank');

      const activationUrl = generateActivationUrl(email, 25, puppeteerConfig.baseUrl);
      await page.goto(activationUrl);

      await page.waitForSelector(selectors.activationModal, { visible: true });

      // Verify email displayed correctly
      const modalEmail = await page.$eval('#modal-activation .user-email', el => el.textContent);
      expect(modalEmail).toContain(email);

      // Complete activation
      await page.click('#modal-visitor-type-local');
      await page.click('#activate-btn');
      await helpers.waitForNotification('success');

      // Verify saved correctly
      const savedEmail = await helpers.getLocalStorageItem('nstcg_email');
      expect(savedEmail).toBe(email);

      notionHelpers.trackTestEmail(email);
      await helpers.clearLocalStorage();
    }
  });

  test('Activation handles existing user gracefully', async ({ page }) => {
    // Create existing user
    const existingUser = generateTestUser();
    await notionHelpers.createTestUser({
      ...existingUser,
      name: `${existingUser.firstName} ${existingUser.lastName}`,
      totalPoints: 100
    }, 'gamification');

    // Try to activate same email
    const activationUrl = generateActivationUrl(existingUser.email, 25, puppeteerConfig.baseUrl);
    await page.goto(activationUrl);

    await page.waitForSelector(selectors.activationModal, { visible: true });
    await page.click('#modal-visitor-type-local');
    await page.click('#activate-btn');

    // Should show appropriate message
    const notification = await helpers.waitForNotification('success');
    expect(notification.text).toContain('activated');

    // Verify only one bonus awarded (no duplication)
    await page.waitForTimeout(TIMEOUTS.NOTION_SYNC);
    const profile = await notionHelpers.findUserByEmail(existingUser.email, 'gamification');

    // Should have original points plus one bonus
    expect(profile.totalPoints).toBeLessThanOrEqual(125); // Max one bonus

    notionHelpers.trackTestEmail(existingUser.email);
  });

  test('Activation modal can be closed without completing', async ({ page }) => {
    const email = 'cancel-test@example.com';
    const activationUrl = generateActivationUrl(email, 30, puppeteerConfig.baseUrl);

    await page.goto(activationUrl);
    await page.waitForSelector(selectors.activationModal, { visible: true });

    // Close with X button
    await page.click('#modal-activation .modal__close');
    await helpers.waitForHidden(selectors.activationModal);

    // Verify no data saved
    const savedEmail = await helpers.getLocalStorageItem('nstcg_email');
    expect(savedEmail).toBeFalsy();

    // Reopen by refreshing page
    await page.reload();
    await page.waitForSelector(selectors.activationModal, { visible: true });

    // Close with Escape key
    await page.keyboard.press('Escape');
    await helpers.waitForHidden(selectors.activationModal);
  });

  test('Activation works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await helpers.setMobileViewport();

    const email = 'mobile-activation@example.com';
    const activationUrl = generateActivationUrl(email, 35, puppeteerConfig.baseUrl);

    await page.goto(activationUrl);
    await page.waitForSelector(selectors.activationModal, { visible: true });

    // Verify modal is responsive
    const modalWidth = await page.$eval(selectors.activationModal, el => {
      const rect = el.getBoundingClientRect();
      return rect.width;
    });
    expect(modalWidth).toBeLessThan(375); // Should fit mobile width

    // Complete activation
    await page.click('#modal-visitor-type-local');
    await page.click('#activate-btn');
    await helpers.waitForNotification('success');

    notionHelpers.trackTestEmail(email);
  });

  test('Activation handles network errors', async ({ page }) => {
    const email = 'network-error-test@example.com';
    const activationUrl = generateActivationUrl(email, 25, puppeteerConfig.baseUrl);

    await page.goto(activationUrl);
    await page.waitForSelector(selectors.activationModal, { visible: true });

    // Mock API error
    await helpers.mockAPIResponse('/api/activate-user', {
      error: 'Network error'
    }, 500);

    // Try to activate
    await page.click('#modal-visitor-type-local');
    await page.click('#activate-btn');

    // Should show error notification
    const errorNotification = await helpers.waitForNotification('error');
    expect(errorNotification.text).toContain('error');

    // Remove mock and retry
    await helpers.removeMock('/api/activate-user');
    await page.click('#activate-btn');

    // Should succeed now
    await helpers.waitForNotification('success');

    notionHelpers.trackTestEmail(email);
  });

  test('Activation preserves referral if present', async ({ page }) => {
    // Create referrer
    const referrer = generateTestUser();
    const referrerCode = referrer.referralCode || 'REF123ABCD';
    await notionHelpers.createTestUser({
      ...referrer,
      referralCode: referrerCode,
      name: `${referrer.firstName} ${referrer.lastName}`
    }, 'gamification');

    // Visit with both referral and activation parameters
    const email = 'referred-activation@example.com';
    const url = `${puppeteerConfig.baseUrl}?ref=${referrerCode}&user_email=${encodeURIComponent(email)}&bonus=75`;

    await page.goto(url);
    await page.waitForSelector(selectors.activationModal, { visible: true });

    // Complete activation
    await page.click('#modal-visitor-type-local');
    await page.click('#activate-btn');
    await helpers.waitForNotification('success');

    // Verify both bonus and referral tracked
    await page.waitForTimeout(TIMEOUTS.NOTION_SYNC);
    const profile = await notionHelpers.findUserByEmail(email, 'gamification');

    expect(profile.bonusPoints).toBe(75);
    expect(profile.referredBy).toBe(referrerCode);
    expect(profile.registrationPoints).toBe(POINTS.REGISTRATION_REFERRED);
    expect(profile.totalPoints).toBe(30 + POINTS.REGISTRATION_REFERRED);

    // Verify referrer got points
    const updatedReferrer = await notionHelpers.findUserByEmail(referrer.email, 'gamification');
    expect(updatedReferrer.referralPoints).toBe(POINTS.REFERRAL_BONUS);

    notionHelpers.trackTestEmail(email);
    notionHelpers.trackTestEmail(referrer.email);
  });

  test('Multiple activation attempts show appropriate messaging', async ({ page }) => {
    const email = 'multiple-activation@example.com';
    const activationUrl = generateActivationUrl(email, 40, puppeteerConfig.baseUrl);

    // First activation
    await page.goto(activationUrl);
    await page.waitForSelector(selectors.activationModal, { visible: true });
    await page.click('#modal-visitor-type-local');
    await page.click('#activate-btn');
    await helpers.waitForNotification('success');

    // Try to activate again
    await page.goto(activationUrl);

    // Should either not show modal or show already activated message
    const modalVisible = await helpers.elementExists(selectors.activationModal);
    if (modalVisible) {
      await page.click('#modal-visitor-type-local');
      await page.click('#activate-btn');

      const notification = await helpers.waitForNotification('success');
      expect(notification.text.toLowerCase()).toContain('already');
    } else {
      // Page should show registered state
      await page.waitForSelector('.user-registered-indicator');
    }

    notionHelpers.trackTestEmail(email);
  });

  test('Activation URL parameters are cleared after success', async ({ page }) => {
    const email = 'url-cleanup@example.com';
    const activationUrl = generateActivationUrl(email, 25, puppeteerConfig.baseUrl);

    await page.goto(activationUrl);
    await page.waitForSelector(selectors.activationModal, { visible: true });

    // Complete activation
    await page.click('#modal-visitor-type-local');
    await page.click('#activate-btn');
    await helpers.waitForNotification('success');

    // Wait for page reload/update
    await page.waitForTimeout(1000);

    // Check URL has been cleaned
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('user_email=');
    expect(currentUrl).not.toContain('bonus=');

    // But should preserve any referral parameter if present
    if (currentUrl.includes('ref=')) {
      expect(currentUrl).toMatch(/\?ref=[A-Z0-9]+$/);
    }

    notionHelpers.trackTestEmail(email);
  });
});
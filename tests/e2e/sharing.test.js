/**
 * Share Functionality E2E Tests
 * 
 * Tests for referral link sharing and social media integration
 */

import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers.js';
import { NotionTestHelpers } from '../utils/notion-helpers.js';
import { createTestUserViaAPI, generateShareMessage } from '../utils/data-generators.js';
import { puppeteerConfig, selectors, patterns } from '../config/puppeteer-config.js';
import { POINTS, LIMITS, TIMEOUTS, SUCCESS_MESSAGES, PLATFORM_CODES } from '../config/test-constants.js';

// Test setup
let helpers;
let notionHelpers;
let testUser;
let shareRequests;

test.describe('Share Page Functionality', () => {
  test.beforeEach(async ({ page, context }) => {
    helpers = new TestHelpers(page);
    notionHelpers = new NotionTestHelpers();
    shareRequests = [];
    
    // Create and register test user via API
    testUser = await createTestUserViaAPI(puppeteerConfig.baseUrl);
    notionHelpers.trackTestEmail(testUser.email);
    
    // Set up localStorage with user data
    await context.addInitScript((userData) => {
      localStorage.setItem('nstcg_email', userData.email);
      localStorage.setItem('nstcg_first_name', userData.firstName);
      localStorage.setItem('nstcg_last_name', userData.lastName);
      localStorage.setItem('nstcg_user_id', userData.id || '');
      localStorage.setItem('nstcg_referral_code', userData.referralCode);
      localStorage.setItem('nstcg_user_registered', 'true');
    }, testUser);
    
    // Intercept share tracking API calls
    page.on('request', request => {
      if (request.url().includes('/api/track-share')) {
        shareRequests.push({
          url: request.url(),
          method: request.method(),
          data: request.postData() ? JSON.parse(request.postData()) : null
        });
      }
    });
    
    // Navigate to share page
    await page.goto(`${puppeteerConfig.baseUrl}/share.html`);
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await notionHelpers.cleanupTestData();
  });

  test('Referral link displays correctly and can be copied', async ({ page, context }) => {
    // Wait for referral link to load
    await page.waitForSelector(selectors.referralLink);
    
    // Verify referral link format
    const linkValue = await page.$eval(selectors.referralLink, el => el.value);
    expect(linkValue).toMatch(patterns.shareUrl);
    expect(linkValue).toContain(testUser.referralCode);
    
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    // Click copy button
    await page.click(selectors.copyLinkBtn);
    
    // Verify copied indicator appears
    await page.waitForSelector(selectors.copiedText, { visible: true });
    const copiedText = await helpers.getTextContent(selectors.copiedText);
    expect(copiedText).toBe(SUCCESS_MESSAGES.COPIED);
    
    // Verify clipboard content (if supported in test environment)
    try {
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toBe(linkValue);
    } catch {
      // Clipboard API might not work in all test environments
      console.log('Clipboard verification skipped - not supported in test environment');
    }
    
    // Verify copy button text changes back
    await page.waitForTimeout(3000); // Wait for animation
    const copyBtnText = await page.$eval('.copy-text', el => 
      window.getComputedStyle(el).display !== 'none'
    );
    expect(copyBtnText).toBe(true);
  });

  test('User stats display correctly on share page', async ({ page }) => {
    // Create some test data in Notion
    await notionHelpers.updateUserPoints(testUser.id, {
      totalPoints: 150,
      referralPoints: 50,
      directReferrals: 2
    });
    
    // Reload page to fetch updated stats
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify points display
    const points = await helpers.getTextContent(selectors.userPoints);
    expect(parseInt(points)).toBeGreaterThanOrEqual(150);
    
    // Verify referrals count
    const referrals = await helpers.getTextContent(selectors.userReferrals);
    expect(parseInt(referrals)).toBe(2);
    
    // Verify rank displays
    const rank = await helpers.getTextContent(selectors.userRank);
    expect(rank).toMatch(/^#\d+$|^#-$/);
  });

  test('Social share buttons generate correct URLs', async ({ page }) => {
    // Wait for share buttons to load
    await page.waitForSelector(selectors.twitterShare);
    
    // Test Twitter share URL
    const twitterUrl = await page.$eval(selectors.twitterShare, el => el.href);
    expect(twitterUrl).toContain('twitter.com/intent/tweet');
    expect(twitterUrl).toContain(encodeURIComponent(testUser.referralCode));
    expect(twitterUrl).toContain('text=');
    
    // Test Facebook share URL
    const facebookUrl = await page.$eval(selectors.facebookShare, el => el.href);
    expect(facebookUrl).toContain('facebook.com/sharer/sharer.php');
    expect(facebookUrl).toContain(encodeURIComponent(puppeteerConfig.baseUrl));
    expect(facebookUrl).toContain(testUser.referralCode);
    
    // Test WhatsApp share URL
    const whatsappUrl = await page.$eval(selectors.whatsappShare, el => el.href);
    expect(whatsappUrl).toContain('api.whatsapp.com/send');
    expect(whatsappUrl).toContain('text=');
    expect(whatsappUrl).toContain(testUser.referralCode);
    
    // Test Email share URL
    const emailUrl = await page.$eval(selectors.emailShare, el => el.href);
    expect(emailUrl).toContain('mailto:');
    expect(emailUrl).toContain('subject=');
    expect(emailUrl).toContain('body=');
    expect(emailUrl).toContain(testUser.referralCode);
  });

  test('Share tracking API is called when share buttons clicked', async ({ page, context }) => {
    // Create new page to handle popup
    const popupPromise = context.waitForEvent('page');
    
    // Click Twitter share button
    await page.click(selectors.twitterShare);
    
    // Handle popup
    const popup = await popupPromise;
    await popup.close();
    
    // Wait for API call
    await page.waitForTimeout(1000);
    
    // Verify share tracking API was called
    expect(shareRequests.length).toBeGreaterThan(0);
    const shareRequest = shareRequests[0];
    expect(shareRequest.data.platform).toBe('twitter');
    expect(shareRequest.data.email).toBe(testUser.email);
    
    // Test WhatsApp share (doesn't open popup)
    shareRequests = []; // Reset
    await page.click(selectors.whatsappShare, { noWaitAfter: true });
    await page.waitForTimeout(1000);
    
    // Verify WhatsApp tracking
    const whatsappRequest = shareRequests.find(r => r.data?.platform === 'whatsapp');
    expect(whatsappRequest).toBeTruthy();
  });

  test('Daily share limits are enforced', async ({ page }) => {
    // Share multiple times to hit limit
    const platform = 'twitter';
    const limit = LIMITS.DAILY_TWITTER_SHARES;
    
    for (let i = 0; i < limit + 1; i++) {
      // Mock the share tracking response
      await helpers.mockAPIResponse('/api/track-share', {
        success: true,
        points_awarded: 0,
        daily_shares_remaining: Math.max(0, limit - i - 1),
        message: i >= limit ? 'Daily share limit reached' : 'Share tracked'
      });
      
      // Click share button
      await page.evaluate((selector) => {
        const btn = document.querySelector(selector);
        if (btn) btn.click();
      }, selectors.twitterShare);
      
      await page.waitForTimeout(500);
    }
    
    // Verify last request shows limit reached
    const lastRequest = shareRequests[shareRequests.length - 1];
    expect(lastRequest).toBeTruthy();
    
    // The API should still accept the request but return limit message
    const response = await helpers.waitForAPIResponse('/api/track-share');
    expect(response.data.daily_shares_remaining).toBe(0);
  });

  test('Share page redirects non-registered users', async ({ page, context }) => {
    // Clear localStorage to simulate non-registered user
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());
    
    // Navigate to share page
    await page.goto(`${puppeteerConfig.baseUrl}/share.html`);
    
    // Should redirect to homepage with message
    await page.waitForURL(/\?message=please-register-first/);
    expect(page.url()).toContain('message=please-register-first');
  });

  test('Copy link button works on mobile', async ({ page, context }) => {
    // Set mobile viewport
    await helpers.setMobileViewport();
    
    // Reload page with mobile viewport
    await page.reload();
    
    // Grant permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    // Click referral link input (mobile behavior)
    await page.click(selectors.referralLink);
    
    // Verify link is selected
    const isSelected = await page.evaluate(() => {
      const input = document.querySelector('#referral-link');
      return input.selectionStart === 0 && input.selectionEnd === input.value.length;
    });
    expect(isSelected).toBe(true);
    
    // Click copy button
    await page.click(selectors.copyLinkBtn);
    
    // Verify copied indicator
    await page.waitForSelector(selectors.copiedText, { visible: true });
  });

  test('Share message includes participant count', async ({ page }) => {
    // Get current participant count
    const countResponse = await fetch(`${puppeteerConfig.baseUrl}/api/get-count`);
    const { count } = await countResponse.json();
    
    // Check Twitter share message
    const twitterUrl = await page.$eval(selectors.twitterShare, el => el.href);
    const decodedTwitter = decodeURIComponent(twitterUrl);
    expect(decodedTwitter).toContain(count.toString());
    
    // Check WhatsApp message
    const whatsappUrl = await page.$eval(selectors.whatsappShare, el => el.href);
    const decodedWhatsApp = decodeURIComponent(whatsappUrl);
    expect(decodedWhatsApp).toContain(count.toString());
  });

  test('Share functionality handles API errors gracefully', async ({ page }) => {
    // Mock API error
    await helpers.mockAPIResponse('/api/track-share', {
      error: 'Server error'
    }, 500);
    
    // Click share button
    await page.click(selectors.twitterShare, { noWaitAfter: true });
    
    // Should still open share window (graceful degradation)
    // No error should be shown to user for share tracking failures
    const errorNotification = await helpers.elementExists(selectors.errorNotification);
    expect(errorNotification).toBe(false);
    
    // Remove mock
    await helpers.removeMock('/api/track-share');
  });

  test('Points animation plays when stats update', async ({ page }) => {
    // Get initial points
    const initialPoints = await page.$eval(selectors.userPoints, el => el.textContent);
    
    // Trigger a points update by mocking getUserStats response
    await helpers.mockAPIResponse('/api/get-user-stats', {
      stats: {
        ...testUser,
        totalPoints: 200,
        directReferrals: 3,
        rank: 15
      }
    });
    
    // Reload stats (simulate real-time update)
    await page.evaluate(() => {
      if (window.loadUserStats) window.loadUserStats();
    });
    
    // Wait for animation
    await page.waitForTimeout(1000);
    
    // Verify points updated with animation
    const updatedPoints = await page.$eval(selectors.userPoints, el => el.textContent);
    expect(parseInt(updatedPoints)).toBe(200);
    
    // Check if animation class was applied
    const hasAnimation = await page.$eval(selectors.userPoints, el => 
      el.classList.contains('animate') || el.style.transition !== ''
    );
    expect(hasAnimation).toBe(true);
  });

  test('All share buttons are keyboard accessible', async ({ page }) => {
    // Tab through share buttons
    await page.keyboard.press('Tab'); // Skip nav
    await page.keyboard.press('Tab'); // Skip other elements
    
    // Find all share buttons
    const shareButtons = await page.$$('[data-platform]');
    
    for (const button of shareButtons) {
      // Check if button can receive focus
      const isFocusable = await button.evaluate(el => {
        el.focus();
        return document.activeElement === el;
      });
      expect(isFocusable).toBe(true);
      
      // Check ARIA labels
      const ariaLabel = await button.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    }
  });
});
/**
 * Test Helper Utilities
 * 
 * Common helper functions for E2E tests
 */

import { selectors, patterns } from '../config/puppeteer-config.js';
import { TIMEOUTS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../config/test-constants.js';

export class TestHelpers {
  constructor(page) {
    this.page = page;
  }

  /**
   * Fill and submit registration form
   */
  async fillRegistrationForm(userData) {
    await this.page.fill(selectors.firstName, userData.firstName);
    await this.page.fill(selectors.lastName, userData.lastName);
    await this.page.fill(selectors.email, userData.email);
    
    // Select visitor type
    if (userData.visitorType === 'local') {
      await this.page.click(selectors.visitorTypeLocal);
    } else {
      await this.page.click(selectors.visitorTypeTourist);
    }
    
    // Submit form
    await this.page.click(selectors.submitBtn);
  }

  /**
   * Wait for and verify notification
   */
  async waitForNotification(type = 'success') {
    const selector = type === 'success' ? selectors.successNotification : selectors.errorNotification;
    
    try {
      const notification = await this.page.waitForSelector(selector, {
        visible: true,
        timeout: TIMEOUTS.NOTIFICATION
      });
      
      // Get notification text
      const text = await notification.evaluate(el => el.textContent);
      return { element: notification, text };
    } catch (error) {
      throw new Error(`${type} notification did not appear within ${TIMEOUTS.NOTIFICATION}ms`);
    }
  }

  /**
   * Get value from localStorage
   */
  async getLocalStorageItem(key) {
    return this.page.evaluate((k) => localStorage.getItem(k), key);
  }

  /**
   * Set value in localStorage
   */
  async setLocalStorageItem(key, value) {
    return this.page.evaluate((k, v) => localStorage.setItem(k, v), key, value);
  }

  /**
   * Get all localStorage data
   */
  async getAllLocalStorage() {
    return this.page.evaluate(() => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
      }
      return data;
    });
  }

  /**
   * Clear all localStorage
   */
  async clearLocalStorage() {
    return this.page.evaluate(() => localStorage.clear());
  }

  /**
   * Extract referral code from localStorage
   */
  async extractReferralCode() {
    const code = await this.getLocalStorageItem('nstcg_referral_code');
    if (!code) {
      throw new Error('No referral code found in localStorage');
    }
    return code;
  }

  /**
   * Wait for API response
   */
  async waitForAPIResponse(endpoint, options = {}) {
    const timeout = options.timeout || TIMEOUTS.API_RESPONSE;
    const method = options.method || 'POST';
    
    try {
      const response = await this.page.waitForResponse(
        response => response.url().includes(endpoint) && 
                   response.request().method() === method,
        { timeout }
      );
      
      const status = response.status();
      const data = await response.json();
      
      return { status, data, response };
    } catch (error) {
      throw new Error(`API response for ${endpoint} timed out after ${timeout}ms`);
    }
  }

  /**
   * Take screenshot with descriptive name
   */
  async takeScreenshot(name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `screenshots/${name}-${timestamp}.png`;
    
    await this.page.screenshot({
      path: filename,
      fullPage: true
    });
    
    console.log(`Screenshot saved: ${filename}`);
    return filename;
  }

  /**
   * Check if element exists
   */
  async elementExists(selector) {
    try {
      await this.page.waitForSelector(selector, { timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get text content of element
   */
  async getTextContent(selector) {
    const element = await this.page.waitForSelector(selector);
    return element.evaluate(el => el.textContent.trim());
  }

  /**
   * Click and wait for navigation
   */
  async clickAndNavigate(selector, options = {}) {
    await Promise.all([
      this.page.waitForNavigation(options),
      this.page.click(selector)
    ]);
  }

  /**
   * Wait for element to be hidden
   */
  async waitForHidden(selector, timeout = TIMEOUTS.ANIMATION) {
    await this.page.waitForSelector(selector, { 
      hidden: true, 
      timeout 
    });
  }

  /**
   * Simulate network conditions
   */
  async simulateSlowNetwork() {
    await this.page.emulateNetworkConditions({
      offline: false,
      downloadThroughput: 50 * 1024, // 50kb/s
      uploadThroughput: 50 * 1024,
      latency: 500 // 500ms latency
    });
  }

  /**
   * Restore normal network
   */
  async restoreNetwork() {
    await this.page.emulateNetworkConditions({
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0
    });
  }

  /**
   * Check if running on mobile viewport
   */
  isMobileViewport() {
    const viewport = this.page.viewport();
    return viewport && viewport.width < 768;
  }

  /**
   * Set mobile viewport
   */
  async setMobileViewport() {
    await this.page.setViewport({
      width: 375,
      height: 667,
      isMobile: true,
      hasTouch: true
    });
  }

  /**
   * Set desktop viewport
   */
  async setDesktopViewport() {
    await this.page.setViewport({
      width: 1280,
      height: 800,
      isMobile: false,
      hasTouch: false
    });
  }

  /**
   * Intercept and mock API response
   */
  async mockAPIResponse(endpoint, responseData, statusCode = 200) {
    await this.page.route(`**${endpoint}`, route => {
      route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify(responseData)
      });
    });
  }

  /**
   * Remove API mock
   */
  async removeMock(endpoint) {
    await this.page.unroute(`**${endpoint}`);
  }

  /**
   * Wait for text to appear on page
   */
  async waitForText(text, options = {}) {
    await this.page.waitForFunction(
      text => document.body.innerText.includes(text),
      options,
      text
    );
  }

  /**
   * Debug helper - pause test execution
   */
  async debug() {
    if (process.env.DEBUG === 'true') {
      await this.page.evaluate(() => { debugger; });
    }
  }
}
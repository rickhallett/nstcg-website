/**
 * Enhanced Test Helper Utilities
 * 
 * Common helper functions with retry logic and improved reliability
 */

import { selectors, patterns } from '../config/puppeteer-config.js';
import { TIMEOUTS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../config/test-constants.js';

export class EnhancedTestHelpers {
  constructor(page) {
    this.page = page;
    this.performanceMarks = new Map();
  }

  /**
   * Retry an operation with exponential backoff
   */
  async retryOperation(operation, options = {}) {
    const { 
      retries = 3, 
      initialDelay = 1000,
      maxDelay = 10000,
      onRetry = null 
    } = options;
    
    let lastError;
    
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (i < retries - 1) {
          const delay = Math.min(initialDelay * Math.pow(2, i), maxDelay);
          
          if (onRetry) {
            await onRetry(error, i + 1, retries);
          }
          
          console.log(`Retry ${i + 1}/${retries} after ${delay}ms. Error: ${error.message}`);
          await this.page.waitForTimeout(delay);
        }
      }
    }
    
    throw new Error(`Operation failed after ${retries} retries: ${lastError.message}`);
  }

  /**
   * Fill and submit registration form with retry
   */
  async fillRegistrationFormWithRetry(userData, options = {}) {
    return this.retryOperation(async () => {
      await this.fillRegistrationForm(userData);
    }, options);
  }

  /**
   * Fill and submit registration form
   */
  async fillRegistrationForm(userData) {
    // Wait for form to be ready
    await this.waitForFormReady();
    
    await this.page.fill(selectors.firstName, userData.firstName);
    await this.page.fill(selectors.lastName, userData.lastName);
    await this.page.fill(selectors.email, userData.email);
    
    // Select visitor type with verification
    const visitorTypeSelector = userData.visitorType === 'local' 
      ? selectors.visitorTypeLocal 
      : selectors.visitorTypeTourist;
    
    await this.page.click(visitorTypeSelector);
    
    // Verify selection
    const isSelected = await this.page.isChecked(visitorTypeSelector);
    if (!isSelected) {
      throw new Error(`Failed to select visitor type: ${userData.visitorType}`);
    }
    
    // Submit form
    await this.page.click(selectors.submitBtn);
  }

  /**
   * Wait for form to be interactive
   */
  async waitForFormReady() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector(selectors.firstName, { state: 'visible' });
    await this.page.waitForSelector(selectors.submitBtn, { state: 'enabled' });
  }

  /**
   * Enhanced notification wait with better error messages
   */
  async waitForNotificationWithRetry(type = 'success', options = {}) {
    const { timeout = TIMEOUTS.NOTIFICATION, retries = 2 } = options;
    
    return this.retryOperation(async () => {
      const selector = type === 'success' 
        ? selectors.successNotification 
        : selectors.errorNotification;
      
      const notification = await this.page.waitForSelector(selector, {
        visible: true,
        timeout
      });
      
      const text = await notification.evaluate(el => el.textContent);
      
      // Verify it's the expected notification type
      if (type === 'success' && text.toLowerCase().includes('error')) {
        throw new Error(`Expected success notification but got error: ${text}`);
      }
      
      return { element: notification, text };
    }, { retries, onRetry: async () => await this.page.reload() });
  }

  /**
   * Wait for API response with retry
   */
  async waitForAPIResponseWithRetry(endpoint, options = {}) {
    const { 
      timeout = TIMEOUTS.API_RESPONSE,
      method = 'POST',
      retries = 2,
      validateResponse = null
    } = options;
    
    return this.retryOperation(async () => {
      const responsePromise = this.page.waitForResponse(
        response => response.url().includes(endpoint) && 
                   response.request().method() === method,
        { timeout }
      );
      
      const response = await responsePromise;
      const status = response.status();
      const data = await response.json();
      
      // Custom validation
      if (validateResponse && !validateResponse(status, data)) {
        throw new Error(`Invalid response from ${endpoint}: ${JSON.stringify(data)}`);
      }
      
      // Default validation
      if (status >= 400) {
        throw new Error(`API error ${status} from ${endpoint}: ${data.error || 'Unknown error'}`);
      }
      
      return { status, data, response };
    }, { retries });
  }

  /**
   * Performance measurement helpers
   */
  async startPerformanceMeasure(name) {
    await this.page.evaluate((measureName) => {
      window.performance.mark(`${measureName}-start`);
    }, name);
    
    this.performanceMarks.set(name, Date.now());
  }

  async endPerformanceMeasure(name) {
    const startTime = this.performanceMarks.get(name);
    if (!startTime) {
      console.warn(`No start mark found for ${name}`);
      return null;
    }
    
    const duration = Date.now() - startTime;
    
    await this.page.evaluate((measureName) => {
      window.performance.mark(`${measureName}-end`);
      window.performance.measure(
        measureName, 
        `${measureName}-start`, 
        `${measureName}-end`
      );
    }, name);
    
    this.performanceMarks.delete(name);
    
    return {
      name,
      duration,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Wait for element with custom polling
   */
  async waitForCondition(condition, options = {}) {
    const { 
      timeout = 30000, 
      pollInterval = 100,
      message = 'Condition not met'
    } = options;
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const result = await condition();
        if (result) return result;
      } catch (error) {
        // Continue polling
      }
      
      await this.page.waitForTimeout(pollInterval);
    }
    
    throw new Error(`${message} after ${timeout}ms`);
  }

  /**
   * Enhanced localStorage operations with validation
   */
  async getLocalStorageItemSafe(key) {
    try {
      const value = await this.page.evaluate((k) => localStorage.getItem(k), key);
      return value;
    } catch (error) {
      console.error(`Failed to get localStorage item ${key}:`, error);
      return null;
    }
  }

  async setLocalStorageItemSafe(key, value) {
    try {
      await this.page.evaluate((k, v) => {
        localStorage.setItem(k, v);
        // Verify it was set
        if (localStorage.getItem(k) !== v) {
          throw new Error(`Failed to set localStorage item ${k}`);
        }
      }, key, value);
      return true;
    } catch (error) {
      console.error(`Failed to set localStorage item ${key}:`, error);
      return false;
    }
  }

  /**
   * Batch localStorage operations
   */
  async setMultipleLocalStorageItems(items) {
    return this.page.evaluate((itemsToSet) => {
      const results = {};
      for (const [key, value] of Object.entries(itemsToSet)) {
        try {
          localStorage.setItem(key, value);
          results[key] = true;
        } catch (error) {
          results[key] = false;
        }
      }
      return results;
    }, items);
  }

  /**
   * Smart screenshot with annotations
   */
  async takeAnnotatedScreenshot(name, options = {}) {
    const { fullPage = true, annotations = [] } = options;
    
    // Add visual annotations
    if (annotations.length > 0) {
      await this.page.evaluate((items) => {
        items.forEach(({ selector, text, color = 'red' }) => {
          const element = document.querySelector(selector);
          if (element) {
            const annotation = document.createElement('div');
            annotation.style.cssText = `
              position: absolute;
              background: ${color};
              color: white;
              padding: 4px 8px;
              font-size: 12px;
              z-index: 10000;
              pointer-events: none;
            `;
            annotation.textContent = text;
            
            const rect = element.getBoundingClientRect();
            annotation.style.left = `${rect.left}px`;
            annotation.style.top = `${rect.top - 25}px`;
            
            document.body.appendChild(annotation);
            setTimeout(() => annotation.remove(), 5000);
          }
        });
      }, annotations);
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `screenshots/${name}-${timestamp}.png`;
    
    await this.page.screenshot({
      path: filename,
      fullPage
    });
    
    console.log(`Screenshot saved: ${filename}`);
    return filename;
  }

  /**
   * Wait for element to be stable (no changes)
   */
  async waitForElementStable(selector, options = {}) {
    const { timeout = 5000, checkInterval = 100 } = options;
    
    await this.page.waitForSelector(selector, { visible: true });
    
    return this.waitForCondition(async () => {
      const element = await this.page.$(selector);
      if (!element) return false;
      
      const text1 = await element.textContent();
      await this.page.waitForTimeout(checkInterval);
      const text2 = await element.textContent();
      
      return text1 === text2;
    }, { timeout, message: `Element ${selector} did not stabilize` });
  }

  /**
   * Network condition presets
   */
  async setNetworkConditions(preset) {
    const conditions = {
      'slow-3g': {
        offline: false,
        downloadThroughput: 50 * 1024,
        uploadThroughput: 50 * 1024,
        latency: 2000
      },
      'fast-3g': {
        offline: false,
        downloadThroughput: 180 * 1024,
        uploadThroughput: 84 * 1024,
        latency: 562
      },
      'slow-edge': {
        offline: false,
        downloadThroughput: 30 * 1024,
        uploadThroughput: 15 * 1024,
        latency: 3000
      },
      'offline': {
        offline: true,
        downloadThroughput: 0,
        uploadThroughput: 0,
        latency: 0
      },
      'online': {
        offline: false,
        downloadThroughput: -1,
        uploadThroughput: -1,
        latency: 0
      }
    };
    
    const condition = conditions[preset] || conditions.online;
    await this.page.emulateNetworkConditions(condition);
  }

  /**
   * Check element visibility with retry
   */
  async isElementVisibleWithRetry(selector, options = {}) {
    const { retries = 3, delay = 500 } = options;
    
    return this.retryOperation(async () => {
      const element = await this.page.$(selector);
      if (!element) return false;
      
      const isVisible = await element.isVisible();
      if (!isVisible) {
        throw new Error(`Element ${selector} not visible`);
      }
      
      return true;
    }, { retries, initialDelay: delay });
  }

  /**
   * Scroll element into view safely
   */
  async scrollIntoViewSafe(selector) {
    try {
      await this.page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center', 
            inline: 'center' 
          });
        }
      }, selector);
      
      // Wait for scroll to complete
      await this.page.waitForTimeout(500);
    } catch (error) {
      console.warn(`Failed to scroll to ${selector}:`, error);
    }
  }

  /**
   * Get all console messages during test
   */
  setupConsoleMonitoring() {
    const consoleLogs = [];
    
    this.page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      });
    });
    
    return {
      getLogs: () => consoleLogs,
      getErrors: () => consoleLogs.filter(log => log.type === 'error'),
      getWarnings: () => consoleLogs.filter(log => log.type === 'warning'),
      clear: () => consoleLogs.length = 0
    };
  }

  /**
   * Mock API responses with validation
   */
  async mockAPIResponseEnhanced(endpoint, responseData, options = {}) {
    const { 
      statusCode = 200, 
      delay = 0,
      persist = false 
    } = options;
    
    await this.page.route(`**${endpoint}`, async route => {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      await route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify(responseData)
      });
      
      if (!persist) {
        // Remove route after first use
        await this.page.unroute(`**${endpoint}`);
      }
    });
  }
}

// Export both the enhanced and original helpers
export { TestHelpers } from './test-helpers.js';
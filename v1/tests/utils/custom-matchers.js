/**
 * Custom Playwright Matchers
 * 
 * Domain-specific assertions for NSTCG tests
 */

import { expect } from '@playwright/test';
import { patterns } from '../config/puppeteer-config.js';

// Extend Playwright's expect with custom matchers
export function setupCustomMatchers() {
  
  // Referral code validation
  expect.extend({
    toBeValidReferralCode(received) {
      const pass = /^[A-Z]{3}[A-Z0-9]{8}$/.test(received);
      
      return {
        pass,
        message: () => pass
          ? `Expected ${received} not to be a valid referral code`
          : `Expected ${received} to be a valid referral code (format: XXXAAAAAAAA)`
      };
    }
  });

  // Email format validation for test emails
  expect.extend({
    toBeTestEmail(received) {
      const pass = received.includes('@e2e.example.com') || 
                   received.includes('@test.example.com') ||
                   received.includes('@example.com');
      
      return {
        pass,
        message: () => pass
          ? `Expected ${received} not to be a test email`
          : `Expected ${received} to be a test email (should contain @example.com)`
      };
    }
  });

  // Points validation
  expect.extend({
    toHavePointsInRange(received, min, max) {
      const points = typeof received === 'object' ? received.totalPoints : received;
      const pass = points >= min && points <= max;
      
      return {
        pass,
        message: () => pass
          ? `Expected points ${points} not to be between ${min} and ${max}`
          : `Expected points ${points} to be between ${min} and ${max}`
      };
    }
  });

  // User profile validation
  expect.extend({
    toBeValidUserProfile(received) {
      const requiredFields = ['email', 'referralCode', 'totalPoints'];
      const missingFields = requiredFields.filter(field => !(field in received));
      const pass = missingFields.length === 0;
      
      return {
        pass,
        message: () => pass
          ? `Expected profile not to be valid`
          : `Expected valid user profile. Missing fields: ${missingFields.join(', ')}`
      };
    }
  });

  // Share URL validation
  expect.extend({
    toBeValidShareUrl(received, platform, referralCode) {
      let pass = false;
      let expectedPattern = '';
      
      switch (platform) {
        case 'twitter':
          expectedPattern = 'twitter.com/intent/tweet';
          pass = received.includes(expectedPattern) && 
                 received.includes(encodeURIComponent(referralCode));
          break;
        case 'facebook':
          expectedPattern = 'facebook.com/sharer';
          pass = received.includes(expectedPattern);
          break;
        case 'whatsapp':
          expectedPattern = 'api.whatsapp.com/send';
          pass = received.includes(expectedPattern) && 
                 received.includes(referralCode);
          break;
        case 'email':
          expectedPattern = 'mailto:';
          pass = received.includes(expectedPattern) && 
                 received.includes(referralCode);
          break;
      }
      
      return {
        pass,
        message: () => pass
          ? `Expected ${received} not to be a valid ${platform} share URL`
          : `Expected ${received} to be a valid ${platform} share URL containing ${expectedPattern}`
      };
    }
  });

  // API response validation
  expect.extend({
    toBeSuccessfulAPIResponse(received) {
      const pass = received.status >= 200 && 
                   received.status < 300 && 
                   received.data && 
                   !received.data.error;
      
      return {
        pass,
        message: () => pass
          ? `Expected response not to be successful`
          : `Expected successful API response, got status ${received.status} with data: ${JSON.stringify(received.data)}`
      };
    }
  });

  // Notification validation
  expect.extend({
    toShowNotification(received, type, expectedText = null) {
      const element = received.element || received;
      const text = received.text || '';
      
      let pass = element !== null;
      
      if (pass && expectedText) {
        pass = text.toLowerCase().includes(expectedText.toLowerCase());
      }
      
      return {
        pass,
        message: () => pass
          ? `Expected not to show ${type} notification${expectedText ? ` with text "${expectedText}"` : ''}`
          : `Expected to show ${type} notification${expectedText ? ` with text "${expectedText}"` : ''}, got: "${text}"`
      };
    }
  });

  // Cookie validation
  expect.extend({
    toHaveReferralCookie(received, expectedCode) {
      const refCookie = received.find(c => c.name === 'nstcg_ref');
      const pass = refCookie && refCookie.value === expectedCode;
      
      return {
        pass,
        message: () => pass
          ? `Expected not to have referral cookie with code ${expectedCode}`
          : `Expected referral cookie with code ${expectedCode}, got: ${refCookie?.value || 'no cookie'}`
      };
    }
  });

  // localStorage validation
  expect.extend({
    toHaveLocalStorageItem(received, key, expectedValue = null) {
      const hasItem = key in received;
      let pass = hasItem;
      
      if (pass && expectedValue !== null) {
        pass = received[key] === expectedValue;
      }
      
      return {
        pass,
        message: () => pass
          ? `Expected localStorage not to have ${key}${expectedValue ? ` with value ${expectedValue}` : ''}`
          : `Expected localStorage to have ${key}${expectedValue ? ` with value ${expectedValue}` : ''}, got: ${received[key] || 'undefined'}`
      };
    }
  });

  // Referral chain validation
  expect.extend({
    toBeValidReferralChain(received) {
      const { valid, errors } = received;
      const pass = valid === true && errors.length === 0;
      
      return {
        pass,
        message: () => pass
          ? `Expected referral chain not to be valid`
          : `Expected valid referral chain. Errors: ${JSON.stringify(errors, null, 2)}`
      };
    }
  });

  // Time-based assertions
  expect.extend({
    toBeWithinLastMinutes(received, minutes) {
      const timestamp = new Date(received).getTime();
      const now = Date.now();
      const diff = now - timestamp;
      const pass = diff >= 0 && diff <= (minutes * 60 * 1000);
      
      return {
        pass,
        message: () => pass
          ? `Expected ${received} not to be within last ${minutes} minutes`
          : `Expected ${received} to be within last ${minutes} minutes (was ${Math.floor(diff / 60000)} minutes ago)`
      };
    }
  });

  // Performance assertions
  expect.extend({
    toBeFasterThan(received, maxDuration) {
      const duration = received.duration || received;
      const pass = duration < maxDuration;
      
      return {
        pass,
        message: () => pass
          ? `Expected operation not to complete within ${maxDuration}ms`
          : `Expected operation to complete within ${maxDuration}ms, took ${duration}ms`
      };
    }
  });
}

// Helper function to use in tests
export function expectElement(locator) {
  return {
    async toBeVisibleWithText(text) {
      await expect(locator).toBeVisible();
      await expect(locator).toContainText(text);
    },
    
    async toBeEnabledWithLabel(label) {
      await expect(locator).toBeEnabled();
      const ariaLabel = await locator.getAttribute('aria-label');
      expect(ariaLabel).toBe(label);
    },
    
    async toHaveValidationError(errorText) {
      const errorId = await locator.getAttribute('aria-describedby');
      if (errorId) {
        const errorElement = locator.page().locator(`#${errorId}`);
        await expect(errorElement).toBeVisible();
        await expect(errorElement).toContainText(errorText);
      } else {
        throw new Error('No validation error element found');
      }
    }
  };
}

// Async assertions helper
export class AsyncAssertions {
  constructor(page) {
    this.page = page;
  }

  async eventuallyTrue(assertion, options = {}) {
    const { timeout = 5000, interval = 100 } = options;
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        await assertion();
        return true;
      } catch (error) {
        await this.page.waitForTimeout(interval);
      }
    }
    
    // Final attempt with original error
    await assertion();
  }

  async eventuallyEquals(getter, expected, options = {}) {
    return this.eventuallyTrue(async () => {
      const actual = await getter();
      expect(actual).toBe(expected);
    }, options);
  }

  async eventuallyContains(getter, substring, options = {}) {
    return this.eventuallyTrue(async () => {
      const actual = await getter();
      expect(actual).toContain(substring);
    }, options);
  }
}
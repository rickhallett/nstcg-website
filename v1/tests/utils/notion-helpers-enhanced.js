/**
 * Enhanced Notion Test Helpers
 * 
 * Improved Notion API utilities with retry logic and performance optimizations
 */

import { Client } from '@notionhq/client';
import { TIMEOUTS } from '../config/test-constants.js';

export class EnhancedNotionHelpers {
  constructor() {
    this.client = new Client({ auth: process.env.NOTION_TEST_TOKEN || process.env.NOTION_TOKEN });
    this.testEmails = new Set();
    this.cache = new Map();
    this.cacheTimeout = 5000; // 5 seconds cache
    
    // Database IDs
    this.mainDbId = process.env.NOTION_TEST_DATABASE_ID || process.env.NOTION_DATABASE_ID;
    this.gamificationDbId = process.env.NOTION_TEST_GAMIFICATION_DB_ID || process.env.NOTION_GAMIFICATION_DB_ID;
  }

  /**
   * Find user by email with caching and retry
   */
  async findUserByEmail(email, dbType = 'main', options = {}) {
    const { useCache = true, retries = 3 } = options;
    const cacheKey = `${dbType}-${email}`;
    
    // Check cache
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }
    
    // Retry logic
    for (let i = 0; i < retries; i++) {
      try {
        const databaseId = dbType === 'gamification' ? this.gamificationDbId : this.mainDbId;
        
        const response = await this.client.databases.query({
          database_id: databaseId,
          filter: {
            property: 'Email',
            email: { equals: email }
          },
          page_size: 1
        });
        
        const result = response.results[0] || null;
        const userData = result ? this.parseUserData(result, dbType) : null;
        
        // Cache result
        this.cache.set(cacheKey, {
          data: userData,
          timestamp: Date.now()
        });
        
        return userData;
      } catch (error) {
        console.error(`Attempt ${i + 1}/${retries} failed for ${email}:`, error.message);
        
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Wait for user to appear in database with polling
   */
  async waitForUser(email, options = {}) {
    const {
      timeout = TIMEOUTS.NOTION_SYNC,
      pollInterval = 500,
      dbType = 'gamification'
    } = options;
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const user = await this.findUserByEmail(email, dbType, { useCache: false });
      if (user) return user;
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error(`User ${email} not found in ${dbType} database after ${timeout}ms`);
  }

  /**
   * Batch find multiple users
   */
  async findUsersByEmails(emails, dbType = 'main') {
    const databaseId = dbType === 'gamification' ? this.gamificationDbId : this.mainDbId;
    const batchSize = 10; // Notion API limit
    const results = [];
    
    // Process in batches
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      try {
        const response = await this.client.databases.query({
          database_id: databaseId,
          filter: {
            or: batch.map(email => ({
              property: 'Email',
              email: { equals: email }
            }))
          },
          page_size: 100
        });
        
        results.push(...response.results);
      } catch (error) {
        console.error(`Failed to fetch batch ${i / batchSize + 1}:`, error);
      }
    }
    
    return results.map(result => this.parseUserData(result, dbType));
  }

  /**
   * Parse user data from Notion response
   */
  parseUserData(result, dbType) {
    const props = result.properties;
    
    if (dbType === 'gamification') {
      return {
        id: result.id,
        email: props['Email']?.email,
        name: props['Name']?.title[0]?.text?.content || '',
        displayName: props['Display Name']?.rich_text[0]?.text?.content || '',
        referralCode: props['Referral Code']?.rich_text[0]?.text?.content || '',
        totalPoints: props['Total Points']?.number || 0,
        registrationPoints: props['Registration Points']?.number || 0,
        sharePoints: props['Share Points']?.number || 0,
        referralPoints: props['Referral Points']?.number || 0,
        bonusPoints: props['Bonus Points']?.number || 0,
        directReferrals: props['Direct Referrals Count']?.number || 0,
        referredBy: props['Referred By']?.rich_text[0]?.text?.content || null,
        lastActivity: props['Last Activity Date']?.date?.start || null
      };
    } else {
      return {
        id: result.id,
        email: props['Email']?.email,
        name: props['Name']?.rich_text[0]?.text?.content || '',
        firstName: props['First Name']?.rich_text[0]?.text?.content || '',
        lastName: props['Last Name']?.rich_text[0]?.text?.content || '',
        userId: props['User ID']?.rich_text[0]?.text?.content || '',
        referrer: props['Referrer']?.rich_text[0]?.text?.content || null,
        timestamp: props['Timestamp']?.date?.start || null
      };
    }
  }

  /**
   * Create test user with retry
   */
  async createTestUser(userData, dbType = 'gamification') {
    const databaseId = dbType === 'gamification' ? this.gamificationDbId : this.mainDbId;
    
    // Track for cleanup
    this.trackTestEmail(userData.email);
    
    // Retry logic
    for (let i = 0; i < 3; i++) {
      try {
        const properties = dbType === 'gamification' 
          ? this.buildGamificationProperties(userData)
          : this.buildMainProperties(userData);
        
        const response = await this.client.pages.create({
          parent: { database_id: databaseId },
          properties
        });
        
        return this.parseUserData(response, dbType);
      } catch (error) {
        console.error(`Create user attempt ${i + 1}/3 failed:`, error);
        
        if (i < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Build properties for gamification database
   */
  buildGamificationProperties(userData) {
    return {
      'Email': { email: userData.email },
      'Name': { title: [{ text: { content: userData.name || userData.email } }] },
      'Display Name': { rich_text: [{ text: { content: userData.displayName || userData.firstName || '' } }] },
      'User ID': { rich_text: [{ text: { content: userData.userId || '' } }] },
      'Referral Code': { rich_text: [{ text: { content: userData.referralCode || '' } }] },
      'Total Points': { number: userData.totalPoints || 0 },
      'Registration Points': { number: userData.registrationPoints || 0 },
      'Share Points': { number: userData.sharePoints || 0 },
      'Referral Points': { number: userData.referralPoints || 0 },
      'Bonus Points': { number: userData.bonusPoints || 0 },
      'Direct Referrals Count': { number: userData.directReferrals || 0 },
      'Last Activity Date': { date: { start: new Date().toISOString() } },
      'Opted Into Leaderboard': { checkbox: userData.optedIn !== false }
    };
  }

  /**
   * Build properties for main database
   */
  buildMainProperties(userData) {
    return {
      'Request Name': { title: [{ text: { content: 'E2E Test Entry' } }] },
      'Name': { rich_text: [{ text: { content: userData.name || `${userData.firstName} ${userData.lastName}` } }] },
      'First Name': { rich_text: [{ text: { content: userData.firstName || '' } }] },
      'Last Name': { rich_text: [{ text: { content: userData.lastName || '' } }] },
      'Email': { email: userData.email },
      'Source': { rich_text: [{ text: { content: 'e2e-test' } }] },
      'Timestamp': { date: { start: new Date().toISOString() } },
      'User ID': { rich_text: [{ text: { content: userData.userId || '' } }] },
      'Referrer': { rich_text: [{ text: { content: userData.referrer || 'None' } }] }
    };
  }

  /**
   * Update user points efficiently
   */
  async updateUserPoints(userId, pointsUpdate) {
    try {
      const updates = {};
      
      if (pointsUpdate.totalPoints !== undefined) {
        updates['Total Points'] = { number: pointsUpdate.totalPoints };
      }
      if (pointsUpdate.referralPoints !== undefined) {
        updates['Referral Points'] = { number: pointsUpdate.referralPoints };
      }
      if (pointsUpdate.directReferrals !== undefined) {
        updates['Direct Referrals Count'] = { number: pointsUpdate.directReferrals };
      }
      
      const response = await this.client.pages.update({
        page_id: userId,
        properties: updates
      });
      
      // Clear cache for this user
      this.clearUserCache(userId);
      
      return this.parseUserData(response, 'gamification');
    } catch (error) {
      console.error('Failed to update user points:', error);
      throw error;
    }
  }

  /**
   * Track test email for cleanup
   */
  trackTestEmail(email) {
    this.testEmails.add(email);
  }

  /**
   * Enhanced cleanup with retry and parallel processing
   */
  async cleanupTestData() {
    if (this.testEmails.size === 0) return;
    
    console.log(`Cleaning up ${this.testEmails.size} test entries...`);
    
    const emails = Array.from(this.testEmails);
    const results = { success: 0, failed: 0 };
    
    // Process in parallel batches
    const batchSize = 5;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (email) => {
        try {
          await this.deleteTestUser(email);
          results.success++;
        } catch (error) {
          console.error(`Failed to cleanup ${email}:`, error.message);
          results.failed++;
        }
      }));
    }
    
    console.log(`Cleanup complete: ${results.success} deleted, ${results.failed} failed`);
    this.testEmails.clear();
    this.cache.clear();
  }

  /**
   * Delete test user from all databases
   */
  async deleteTestUser(email) {
    // Delete from both databases
    const databases = [
      { id: this.mainDbId, type: 'main' },
      { id: this.gamificationDbId, type: 'gamification' }
    ];
    
    for (const { id, type } of databases) {
      try {
        const user = await this.findUserByEmail(email, type, { useCache: false });
        
        if (user) {
          await this.client.pages.update({
            page_id: user.id,
            archived: true
          });
        }
      } catch (error) {
        // Continue with other databases even if one fails
        console.warn(`Failed to delete from ${type} database:`, error.message);
      }
    }
  }

  /**
   * Clear cache for specific user
   */
  clearUserCache(userIdOrEmail) {
    for (const [key, value] of this.cache.entries()) {
      if (key.includes(userIdOrEmail) || 
          (value.data && (value.data.id === userIdOrEmail || value.data.email === userIdOrEmail))) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Wait for points to be updated
   */
  async waitForPointsUpdate(email, expectedPoints, options = {}) {
    const { timeout = 10000, pollInterval = 500 } = options;
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const user = await this.findUserByEmail(email, 'gamification', { useCache: false });
      
      if (user && user.totalPoints >= expectedPoints) {
        return user;
      }
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error(`Points for ${email} did not reach ${expectedPoints} within ${timeout}ms`);
  }

  /**
   * Get test statistics
   */
  getTestStats() {
    return {
      trackedEmails: this.testEmails.size,
      cacheSize: this.cache.size,
      emails: Array.from(this.testEmails)
    };
  }

  /**
   * Verify referral chain
   */
  async verifyReferralChain(referrerEmail, referredEmails) {
    const referrer = await this.findUserByEmail(referrerEmail, 'gamification');
    
    if (!referrer) {
      throw new Error(`Referrer ${referrerEmail} not found`);
    }
    
    const results = {
      referrer,
      referred: [],
      valid: true,
      errors: []
    };
    
    // Check each referred user
    for (const email of referredEmails) {
      const user = await this.findUserByEmail(email, 'gamification');
      
      if (!user) {
        results.errors.push(`User ${email} not found`);
        results.valid = false;
      } else if (user.referredBy !== referrer.referralCode) {
        results.errors.push(`User ${email} not referred by ${referrerEmail}`);
        results.valid = false;
      } else {
        results.referred.push(user);
      }
    }
    
    // Verify referrer's counts
    if (results.referred.length !== referrer.directReferrals) {
      results.errors.push(`Referrer count mismatch: expected ${results.referred.length}, got ${referrer.directReferrals}`);
      results.valid = false;
    }
    
    return results;
  }
}

// Export both enhanced and original helpers
export { NotionTestHelpers } from './notion-helpers.js';
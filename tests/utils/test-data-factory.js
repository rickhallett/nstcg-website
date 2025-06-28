/**
 * Test Data Factory
 * 
 * Centralized test data generation with realistic patterns
 */

import { v4 as uuidv4 } from 'uuid';
import { puppeteerConfig } from '../config/puppeteer-config.js';

export class TestDataFactory {
  constructor() {
    this.usedEmails = new Set();
    this.usedReferralCodes = new Set();
  }

  /**
   * Generate unique test user data
   */
  generateTestUser(options = {}) {
    const id = uuidv4().substring(0, 8);
    const timestamp = Date.now();
    
    const defaults = {
      firstName: `Test${id}`,
      lastName: 'User',
      email: `test-${timestamp}-${id}@e2e.example.com`,
      visitorType: 'local',
      userId: `user-${id}`,
      referralCode: this.generateUniqueReferralCode()
    };
    
    const userData = { ...defaults, ...options };
    
    // Ensure email uniqueness
    if (this.usedEmails.has(userData.email)) {
      userData.email = `test-${timestamp}-${uuidv4().substring(0, 8)}@e2e.example.com`;
    }
    this.usedEmails.add(userData.email);
    
    return userData;
  }

  /**
   * Generate realistic referral code
   */
  generateUniqueReferralCode(firstName = 'TST') {
    let code;
    let attempts = 0;
    
    do {
      const prefix = firstName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
      const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
      const random = Math.random().toString(36).slice(2, 6).toUpperCase();
      code = `${prefix}${timestamp}${random}`;
      attempts++;
    } while (this.usedReferralCodes.has(code) && attempts < 10);
    
    this.usedReferralCodes.add(code);
    return code;
  }

  /**
   * Generate test user with specific characteristics
   */
  generateUserWithTraits(traits = {}) {
    const baseUser = this.generateTestUser();
    
    const templates = {
      highPerformer: {
        totalPoints: 500,
        directReferrals: 10,
        referralPoints: 250,
        sharePoints: 150
      },
      newUser: {
        totalPoints: 10,
        directReferrals: 0,
        referralPoints: 0,
        sharePoints: 0
      },
      activeSharer: {
        totalPoints: 200,
        twitterShares: 20,
        facebookShares: 15,
        whatsappShares: 30,
        sharePoints: 195
      },
      referredUser: {
        registrationPoints: 100,
        referredBy: 'REF123TEST'
      }
    };
    
    const template = templates[traits.template] || {};
    return { ...baseUser, ...template, ...traits };
  }

  /**
   * Create a referral chain of users
   */
  async createReferralChain(depth = 3, options = {}) {
    const { 
      baseUrl = puppeteerConfig.baseUrl,
      createViaAPI = true 
    } = options;
    
    const chain = [];
    let referrer = null;
    
    for (let i = 0; i < depth; i++) {
      const user = this.generateTestUser({
        firstName: `Chain${i}`,
        referrer: referrer?.referralCode
      });
      
      if (createViaAPI) {
        // Simulate API creation
        const response = await this.createUserViaAPI(baseUrl, user, referrer?.referralCode);
        user.id = response.id;
        user.referralCode = response.referralCode || user.referralCode;
      }
      
      chain.push(user);
      referrer = user;
    }
    
    return {
      users: chain,
      root: chain[0],
      leaf: chain[chain.length - 1],
      validate: () => this.validateReferralChain(chain)
    };
  }

  /**
   * Create test user via API
   */
  async createUserViaAPI(baseUrl, userData, referralCode = null) {
    const url = referralCode 
      ? `${baseUrl}/api/submit-form?ref=${referralCode}`
      : `${baseUrl}/api/submit-form`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${userData.firstName} ${userData.lastName}`,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          visitorType: userData.visitorType || 'local',
          user_id: userData.userId,
          referrer: referralCode || 'None'
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      return {
        ...userData,
        id: result.id,
        referralCode: result.referralCode || userData.referralCode
      };
    } catch (error) {
      console.error('Failed to create user via API:', error);
      throw error;
    }
  }

  /**
   * Generate bulk test users
   */
  generateBulkUsers(count, options = {}) {
    const users = [];
    
    for (let i = 0; i < count; i++) {
      users.push(this.generateTestUser({
        firstName: `Bulk${i}`,
        ...options
      }));
    }
    
    return users;
  }

  /**
   * Generate share message variations
   */
  generateShareMessage(referralCode, participantCount = 250) {
    const templates = [
      `Join ${participantCount}+ neighbors fighting for safer streets! Use my code: ${referralCode}`,
      `Help protect North Swanage from traffic chaos. ${participantCount} already joined! Code: ${referralCode}`,
      `🚦 Traffic safety alert! Join us: ${referralCode} (${participantCount} supporters and counting!)`,
      `Be part of the solution. ${participantCount} neighbors already taking action. Join with: ${referralCode}`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate activation URL
   */
  generateActivationUrl(email, bonusPoints, baseUrl) {
    const params = new URLSearchParams({
      user_email: email,
      bonus: Math.min(Math.max(bonusPoints, 10), 50) // Enforce limits
    });
    
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Generate test campaign data
   */
  generateCampaignData() {
    return {
      startDate: new Date('2025-06-14'),
      endDate: new Date('2025-03-31'),
      targetCount: 5000,
      currentCount: 250 + Math.floor(Math.random() * 50),
      donations: {
        total: 1250.50,
        count: 23,
        average: 54.37
      },
      costs: {
        hosting: 29.99,
        api: 15.00,
        marketing: 125.00,
        total: 169.99
      }
    };
  }

  /**
   * Validate referral chain integrity
   */
  validateReferralChain(users) {
    const errors = [];
    
    for (let i = 1; i < users.length; i++) {
      const user = users[i];
      const expectedReferrer = users[i - 1];
      
      if (user.referrer !== expectedReferrer.referralCode) {
        errors.push({
          user: user.email,
          expected: expectedReferrer.referralCode,
          actual: user.referrer
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      depth: users.length
    };
  }

  /**
   * Generate test scenarios
   */
  generateTestScenarios() {
    return {
      happyPath: {
        name: 'Standard Registration Flow',
        users: [this.generateTestUser()],
        actions: ['register', 'verify_email', 'share']
      },
      
      referralFlow: {
        name: 'Complete Referral Journey',
        users: this.generateBulkUsers(2),
        actions: ['register_referrer', 'share_link', 'register_referred', 'verify_points']
      },
      
      edgeCases: {
        name: 'Edge Case Testing',
        scenarios: [
          {
            name: 'Special Characters',
            user: this.generateTestUser({
              firstName: "O'Connor",
              lastName: "José-María",
              email: "test+tag@e2e.example.com"
            })
          },
          {
            name: 'Long Names',
            user: this.generateTestUser({
              firstName: 'A'.repeat(50),
              lastName: 'B'.repeat(50)
            })
          },
          {
            name: 'International',
            user: this.generateTestUser({
              firstName: '测试',
              lastName: 'المستخدم',
              email: 'international@e2e.example.com'
            })
          }
        ]
      },
      
      stress: {
        name: 'Stress Testing',
        concurrentUsers: 50,
        duration: 60000, // 1 minute
        actions: ['register', 'share', 'refresh']
      }
    };
  }

  /**
   * Reset factory state
   */
  reset() {
    this.usedEmails.clear();
    this.usedReferralCodes.clear();
  }

  /**
   * Get factory statistics
   */
  getStats() {
    return {
      uniqueEmails: this.usedEmails.size,
      uniqueReferralCodes: this.usedReferralCodes.size,
      emails: Array.from(this.usedEmails)
    };
  }
}

// Singleton instance
export const testDataFactory = new TestDataFactory();

// Convenience exports
export const {
  generateTestUser,
  generateUniqueReferralCode,
  generateActivationUrl,
  generateShareMessage,
  createReferralChain
} = {
  generateTestUser: testDataFactory.generateTestUser.bind(testDataFactory),
  generateUniqueReferralCode: testDataFactory.generateUniqueReferralCode.bind(testDataFactory),
  generateActivationUrl: testDataFactory.generateActivationUrl.bind(testDataFactory),
  generateShareMessage: testDataFactory.generateShareMessage.bind(testDataFactory),
  createReferralChain: testDataFactory.createReferralChain.bind(testDataFactory)
};
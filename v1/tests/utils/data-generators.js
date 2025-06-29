/**
 * Test Data Generators
 * 
 * Functions to generate test data for E2E tests
 */

import { v4 as uuidv4 } from 'uuid';
import { TEST_PREFIXES, POINTS } from '../config/test-constants.js';

/**
 * Generate unique test user data
 */
export function generateTestUser(overrides = {}) {
  const id = generateShortId();

  return {
    firstName: `${TEST_PREFIXES.FIRST_NAME}${id}`,
    lastName: TEST_PREFIXES.LAST_NAME,
    email: `${TEST_PREFIXES.EMAIL}${id}@example.com`,
    visitorType: 'local',
    ...overrides
  };
}

/**
 * Generate multiple test users
 */
export function generateTestUsers(count, overrides = {}) {
  return Array.from({ length: count }, () => generateTestUser(overrides));
}

/**
 * Generate referral code matching the app pattern
 */
export function generateReferralCode(firstName = 'TEST') {
  // Take first 3 letters of first name
  const prefix = firstName.substring(0, 3).toUpperCase();

  // Generate timestamp part (4 chars)
  const timestamp = Date.now().toString(36).substring(0, 4).toUpperCase();

  // Generate random part (4 chars)
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();

  return `${prefix}${timestamp}${random}`;
}

/**
 * Generate short unique ID
 */
export function generateShortId() {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Generate test email with timestamp
 */
export function generateTimestampedEmail() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  return `${TEST_PREFIXES.EMAIL}${timestamp}-${random}@example.com`;
}

/**
 * Generate social share message
 */
export function generateShareMessage(platform, participantCount = 500) {
  const messages = {
    twitter: `Join ${participantCount}+ residents fighting to preserve North Swanage! We need your voice to stop destructive traffic schemes. Take action now:`,
    facebook: `🚨 North Swanage needs YOU! Join ${participantCount}+ residents standing against harmful traffic proposals. Your voice matters in protecting our community. Act now:`,
    whatsapp: `Hi! I've just joined ${participantCount}+ North Swanage residents fighting against destructive traffic schemes. Our community needs your voice too. Please take 2 minutes to help:`,
    email: {
      subject: 'Help protect North Swanage from traffic chaos',
      body: `Dear Friend,\n\nI'm writing to ask for your help in protecting North Swanage from poorly conceived traffic schemes.\n\nOver ${participantCount} residents have already joined the campaign. Will you add your voice?\n\nIt only takes 2 minutes:`
    }
  };

  return messages[platform] || messages.twitter;
}

/**
 * Generate random bonus points for email campaign
 */
export function generateBonusPoints() {
  // Weighted towards middle values (20-40)
  const weights = [
    { value: 10, weight: 1 },
    { value: 15, weight: 2 },
    { value: 20, weight: 3 },
    { value: 25, weight: 4 },
    { value: 30, weight: 4 },
    { value: 35, weight: 3 },
    { value: 40, weight: 2 },
    { value: 45, weight: 1 },
    { value: 50, weight: 1 }
  ];

  const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of weights) {
    if (random < item.weight) {
      return item.value;
    }
    random -= item.weight;
  }

  return 25; // Default fallback
}

/**
 * Generate activation URL
 */
export function generateActivationUrl(email, bonusPoints, baseUrl = '') {
  const encodedEmail = encodeURIComponent(email);
  return `${baseUrl}?user_email=${encodedEmail}&bonus=${bonusPoints}`;
}

/**
 * Generate mock API response
 */
export function generateMockApiResponse(type, overrides = {}) {
  const responses = {
    registration: {
      success: true,
      id: generateShortId(),
      message: 'Successfully saved to database',
      ...overrides
    },

    trackShare: {
      success: true,
      points_awarded: 0,
      message: 'Share tracked successfully. Earn points when friends complete registration!',
      total_points: 0,
      share_count: 1,
      platform: 'twitter',
      daily_shares_remaining: 4,
      ...overrides
    },

    getUserStats: {
      stats: {
        email: 'test@example.com',
        displayName: 'Test User',
        referralCode: generateReferralCode(),
        totalPoints: 125,
        registrationPoints: 100,
        sharePoints: 0,
        referralPoints: 25,
        bonusPoints: 0,
        directReferrals: 1,
        indirectReferrals: 0,
        rank: 42,
        percentile: 85,
        nextRankPoints: 150,
        referralLink: 'https://example.com?ref=TES1234ABCD',
        joinedDate: new Date().toISOString(),
        ...overrides
      }
    },

    getLeaderboard: {
      leaderboard: [
        {
          rank: 1,
          user_id: 'user1',
          name: 'Top User',
          points: 500,
          referrals: 15
        },
        {
          rank: 2,
          user_id: 'user2',
          name: 'Second User',
          points: 350,
          referrals: 10
        },
        {
          rank: 3,
          user_id: 'user3',
          name: 'Third User',
          points: 200,
          referrals: 5
        }
      ],
      total_users: 100,
      last_updated: new Date().toISOString(),
      ...overrides
    },

    activateUser: {
      success: true,
      message: 'Account activated successfully',
      user: {
        email: 'test@example.com',
        referralCode: generateReferralCode(),
        bonusPoints: 75,
        totalPoints: 25
      },
      ...overrides
    }
  };

  return responses[type] || { success: true, ...overrides };
}

/**
 * Generate test comment
 */
export function generateTestComment() {
  const comments = [
    'This traffic scheme will destroy our community',
    'We need better consultation with residents',
    'The proposed changes will make things worse',
    'Please listen to local voices',
    'Test comment for E2E testing'
  ];

  return comments[Math.floor(Math.random() * comments.length)];
}

/**
 * Create test user via API
 */
export async function createTestUserViaAPI(baseUrl, userData = {}) {
  const user = generateTestUser(userData);

  const response = await fetch(`${baseUrl}/api/submit-form`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `${user.firstName} ${user.lastName}`,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      visitor_type: user.visitorType,
      source: 'e2e-test'
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to create test user: ${response.status}`);
  }

  const result = await response.json();

  // Wait a bit for Notion sync
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    ...user,
    ...result,
    referralCode: generateReferralCode(user.firstName)
  };
}

/**
 * Clean up test users via email pattern
 */
export function isTestEmail(email) {
  return email.includes(TEST_PREFIXES.EMAIL) || email.endsWith('@example.com');
}

/**
 * Generate performance metrics
 */
export function generatePerformanceMetrics() {
  return {
    timestamp: new Date().toISOString(),
    pageLoadTime: Math.random() * 2000 + 500, // 500-2500ms
    apiResponseTime: Math.random() * 500 + 100, // 100-600ms
    memoryUsage: Math.random() * 50 + 20, // 20-70MB
    domNodes: Math.floor(Math.random() * 2000 + 500) // 500-2500 nodes
  };
}
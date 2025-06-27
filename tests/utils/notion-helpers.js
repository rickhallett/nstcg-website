/**
 * Notion Test Helpers
 * 
 * Utilities for interacting with Notion API during tests
 */

import { NOTION_DBS, TEST_PREFIXES, TIMEOUTS } from '../config/test-constants.js';

export class NotionTestHelpers {
  constructor() {
    this.testEmails = new Set();
    this.testPageIds = new Set();
    this.apiKey = process.env.NOTION_TEST_TOKEN || process.env.NOTION_TOKEN;
    this.baseUrl = 'https://api.notion.com/v1';
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    };
  }

  /**
   * Find user by email in gamification database
   */
  async findUserByEmail(email, database = 'gamification') {
    const dbId = database === 'gamification' ? NOTION_DBS.GAMIFICATION : NOTION_DBS.LEADS;
    
    try {
      const response = await fetch(`${this.baseUrl}/databases/${dbId}/query`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          filter: {
            property: 'Email',
            email: { equals: email }
          },
          page_size: 1
        })
      });

      if (!response.ok) {
        throw new Error(`Notion API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.results.length === 0) {
        return null;
      }

      // Parse and return user data
      const page = data.results[0];
      return this.parseUserData(page, database);
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Parse user data from Notion page
   */
  parseUserData(page, database) {
    const props = page.properties;
    
    if (database === 'gamification') {
      return {
        id: page.id,
        email: props.Email?.email,
        name: props.Name?.title?.[0]?.text?.content,
        displayName: props['Display Name']?.rich_text?.[0]?.text?.content,
        referralCode: props['Referral Code']?.rich_text?.[0]?.text?.content,
        totalPoints: props['Total Points']?.number || 0,
        registrationPoints: props['Registration Points']?.number || 0,
        sharePoints: props['Share Points']?.number || 0,
        referralPoints: props['Referral Points']?.number || 0,
        bonusPoints: props['Bonus Points']?.number || 0,
        directReferrals: props['Direct Referrals Count']?.number || 0,
        indirectReferrals: props['Indirect Referrals Count']?.number || 0,
        referredBy: props['Referred By']?.rich_text?.[0]?.text?.content,
        rank: props['Rank']?.number,
        optedIntoLeaderboard: props['Opted Into Leaderboard']?.checkbox,
        twitterShares: props['Twitter Shares']?.number || 0,
        facebookShares: props['Facebook Shares']?.number || 0,
        whatsappShares: props['WhatsApp Shares']?.number || 0,
        emailShares: props['Email Shares']?.number || 0,
        createdAt: page.created_time
      };
    } else {
      // Leads database
      return {
        id: page.id,
        email: props.Email?.email,
        firstName: props['First Name']?.rich_text?.[0]?.text?.content,
        lastName: props['Last Name']?.rich_text?.[0]?.text?.content,
        name: props.Name?.rich_text?.[0]?.text?.content,
        visitorType: props['Visitor Type']?.select?.name,
        referrer: props.Referrer?.rich_text?.[0]?.text?.content,
        userId: props['User ID']?.rich_text?.[0]?.text?.content,
        createdAt: page.created_time
      };
    }
  }

  /**
   * Track test email for cleanup
   */
  trackTestEmail(email) {
    this.testEmails.add(email);
  }

  /**
   * Track test page ID for cleanup
   */
  trackTestPageId(pageId) {
    this.testPageIds.add(pageId);
  }

  /**
   * Wait for user to appear in database
   */
  async waitForUser(email, database = 'gamification', maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
      const user = await this.findUserByEmail(email, database);
      if (user) {
        this.trackTestPageId(user.id);
        return user;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, TIMEOUTS.NOTION_SYNC / maxAttempts));
    }
    
    throw new Error(`User ${email} did not appear in ${database} database after ${maxAttempts} attempts`);
  }

  /**
   * Clean up test data
   */
  async cleanupTestData() {
    const errors = [];
    
    // Clean up by email
    for (const email of this.testEmails) {
      try {
        // Check both databases
        const gamificationUser = await this.findUserByEmail(email, 'gamification');
        if (gamificationUser) {
          await this.archivePage(gamificationUser.id);
        }
        
        const leadsUser = await this.findUserByEmail(email, 'leads');
        if (leadsUser) {
          await this.archivePage(leadsUser.id);
        }
      } catch (error) {
        errors.push({ email, error: error.message });
      }
    }
    
    // Clean up by page ID
    for (const pageId of this.testPageIds) {
      try {
        await this.archivePage(pageId);
      } catch (error) {
        errors.push({ pageId, error: error.message });
      }
    }
    
    // Clear tracking sets
    this.testEmails.clear();
    this.testPageIds.clear();
    
    if (errors.length > 0) {
      console.error('Cleanup errors:', errors);
    }
    
    return errors;
  }

  /**
   * Archive a Notion page
   */
  async archivePage(pageId) {
    const response = await fetch(`${this.baseUrl}/pages/${pageId}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify({ archived: true })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to archive page ${pageId}: ${response.status}`);
    }
  }

  /**
   * Get leaderboard data
   */
  async getLeaderboard(period = 'all', limit = 10) {
    const filter = {
      and: [
        { property: 'Opted Into Leaderboard', checkbox: { equals: true } },
        { property: 'Total Points', number: { greater_than: 0 } }
      ]
    };
    
    // Add time filter for week/month
    if (period === 'week') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      filter.and.push({
        property: 'Last Activity',
        date: { after: weekAgo.toISOString() }
      });
    } else if (period === 'month') {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      filter.and.push({
        property: 'Last Activity',
        date: { after: monthAgo.toISOString() }
      });
    }
    
    const response = await fetch(`${this.baseUrl}/databases/${NOTION_DBS.GAMIFICATION}/query`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        filter,
        sorts: [{ property: 'Total Points', direction: 'descending' }],
        page_size: limit
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get leaderboard: ${response.status}`);
    }
    
    const data = await response.json();
    return data.results.map((page, index) => ({
      rank: index + 1,
      ...this.parseUserData(page, 'gamification')
    }));
  }

  /**
   * Create test user directly in Notion
   */
  async createTestUser(userData, database = 'leads') {
    const dbId = database === 'gamification' ? NOTION_DBS.GAMIFICATION : NOTION_DBS.LEADS;
    
    let properties;
    if (database === 'gamification') {
      properties = {
        'Email': { email: userData.email },
        'Name': { title: [{ text: { content: userData.name || userData.email } }] },
        'Display Name': { rich_text: [{ text: { content: userData.displayName || userData.firstName } }] },
        'Referral Code': { rich_text: [{ text: { content: userData.referralCode } }] },
        'Total Points': { number: userData.totalPoints || 0 },
        'Opted Into Leaderboard': { checkbox: true }
      };
    } else {
      properties = {
        'Name': { rich_text: [{ text: { content: `${userData.firstName} ${userData.lastName}` } }] },
        'First Name': { rich_text: [{ text: { content: userData.firstName } }] },
        'Last Name': { rich_text: [{ text: { content: userData.lastName } }] },
        'Email': { email: userData.email },
        'Visitor Type': { select: { name: userData.visitorType === 'local' ? 'Local' : 'Tourist' } }
      };
    }
    
    const response = await fetch(`${this.baseUrl}/pages`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create test user: ${JSON.stringify(error)}`);
    }
    
    const page = await response.json();
    this.trackTestPageId(page.id);
    this.trackTestEmail(userData.email);
    
    return this.parseUserData(page, database);
  }

  /**
   * Update user points
   */
  async updateUserPoints(pageId, pointsUpdate) {
    const properties = {};
    
    if (pointsUpdate.totalPoints !== undefined) {
      properties['Total Points'] = { number: pointsUpdate.totalPoints };
    }
    if (pointsUpdate.referralPoints !== undefined) {
      properties['Referral Points'] = { number: pointsUpdate.referralPoints };
    }
    if (pointsUpdate.directReferrals !== undefined) {
      properties['Direct Referrals Count'] = { number: pointsUpdate.directReferrals };
    }
    
    const response = await fetch(`${this.baseUrl}/pages/${pageId}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify({ properties })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update user points: ${response.status}`);
    }
    
    return response.json();
  }
}
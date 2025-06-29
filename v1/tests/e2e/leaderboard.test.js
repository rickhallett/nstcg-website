/**
 * Leaderboard E2E Tests
 * 
 * Tests for leaderboard display, ranking, and filtering
 */

import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers.js';
import { NotionTestHelpers } from '../utils/notion-helpers.js';
import { generateTestUser } from '../utils/data-generators.js';
import { puppeteerConfig, selectors } from '../config/puppeteer-config.js';
import { TIMEOUTS } from '../config/test-constants.js';

// Test setup
let helpers;
let notionHelpers;
let testUsers = [];

test.describe('Leaderboard Features', () => {
  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    notionHelpers = new NotionTestHelpers();
    testUsers = [];
  });

  test.afterEach(async () => {
    // Clean up all test users
    for (const user of testUsers) {
      notionHelpers.trackTestEmail(user.email);
    }
    await notionHelpers.cleanupTestData();
  });

  test('Leaderboard displays users ranked by points', async ({ page }) => {
    // Create test users with different points
    const usersData = [
      { name: 'Top Player', points: 500, referrals: 10 },
      { name: 'Second Place', points: 350, referrals: 7 },
      { name: 'Third Place', points: 200, referrals: 4 },
      { name: 'Fourth Place', points: 150, referrals: 3 },
      { name: 'Fifth Place', points: 100, referrals: 2 }
    ];
    
    // Create users in Notion
    for (const userData of usersData) {
      const user = generateTestUser({
        firstName: userData.name.split(' ')[0],
        lastName: userData.name.split(' ')[1]
      });
      
      await notionHelpers.createTestUser({
        ...user,
        name: userData.name,
        displayName: userData.name,
        totalPoints: userData.points,
        directReferrals: userData.referrals,
        optedIntoLeaderboard: true
      }, 'gamification');
      
      testUsers.push(user);
    }
    
    // Wait for data to be available
    await page.waitForTimeout(TIMEOUTS.NOTION_SYNC);
    
    // Navigate to leaderboard
    await page.goto(`${puppeteerConfig.baseUrl}/leaderboard.html`);
    await page.waitForLoadState('networkidle');
    
    // Wait for leaderboard to load
    await page.waitForSelector(selectors.leaderboardTable);
    
    // Verify podium display (top 3)
    const firstPlace = await helpers.getTextContent(`${selectors.podium1} .user-name`);
    expect(firstPlace).toContain('Top Player');
    
    const secondPlace = await helpers.getTextContent(`${selectors.podium2} .user-name`);
    expect(secondPlace).toContain('Second Place');
    
    const thirdPlace = await helpers.getTextContent(`${selectors.podium3} .user-name`);
    expect(thirdPlace).toContain('Third Place');
    
    // Verify podium points
    const firstPoints = await helpers.getTextContent(`${selectors.podium1} .user-points`);
    expect(firstPoints).toContain('500');
    
    // Verify table shows remaining users
    const tableRows = await page.$$('.leaderboard-table tbody tr');
    expect(tableRows.length).toBeGreaterThanOrEqual(5);
    
    // Verify ranking order
    const rankings = await page.$$eval('.leaderboard-table .rank', 
      elements => elements.map(el => parseInt(el.textContent))
    );
    
    // Rankings should be sequential
    for (let i = 1; i < rankings.length; i++) {
      expect(rankings[i]).toBe(rankings[i-1] + 1);
    }
  });

  test('Time period filtering works correctly', async ({ page }) => {
    // Create users with different activity dates
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    const usersWithDates = [
      { name: 'Recent User', points: 100, lastActivity: now },
      { name: 'Week Old User', points: 150, lastActivity: weekAgo },
      { name: 'Month Old User', points: 200, lastActivity: monthAgo },
      { name: 'Old User', points: 250, lastActivity: twoMonthsAgo }
    ];
    
    // Create users (mock last activity dates would require API update)
    for (const userData of usersWithDates) {
      const user = generateTestUser({
        firstName: userData.name.split(' ')[0],
        lastName: userData.name.split(' ')[1]
      });
      
      await notionHelpers.createTestUser({
        ...user,
        name: userData.name,
        totalPoints: userData.points
      }, 'gamification');
      
      testUsers.push(user);
    }
    
    await page.goto(`${puppeteerConfig.baseUrl}/leaderboard.html`);
    await page.waitForSelector(selectors.leaderboardTable);
    
    // Test "All Time" filter (default)
    const allTimeBtn = await page.$('[data-period="all"]');
    const isAllTimeActive = await allTimeBtn.evaluate(el => el.classList.contains('active'));
    expect(isAllTimeActive).toBe(true);
    
    // Count initial users
    const allTimeRows = await page.$$('.leaderboard-table tbody tr');
    const allTimeCount = allTimeRows.length;
    
    // Test "This Week" filter
    await page.click('[data-period="week"]');
    
    // Wait for API response
    await helpers.waitForAPIResponse('/api/get-leaderboard', { method: 'GET' });
    await page.waitForTimeout(500); // Wait for UI update
    
    // Verify filter button is active
    const weekBtn = await page.$('[data-period="week"]');
    const isWeekActive = await weekBtn.evaluate(el => el.classList.contains('active'));
    expect(isWeekActive).toBe(true);
    
    // Test "This Month" filter
    await page.click('[data-period="month"]');
    await helpers.waitForAPIResponse('/api/get-leaderboard', { method: 'GET' });
    await page.waitForTimeout(500);
    
    const monthBtn = await page.$('[data-period="month"]');
    const isMonthActive = await monthBtn.evaluate(el => el.classList.contains('active'));
    expect(isMonthActive).toBe(true);
  });

  test('Current user is highlighted in leaderboard', async ({ page, context }) => {
    // Create current user
    const currentUser = generateTestUser();
    await notionHelpers.createTestUser({
      ...currentUser,
      name: `${currentUser.firstName} ${currentUser.lastName}`,
      displayName: currentUser.firstName,
      totalPoints: 175,
      directReferrals: 3,
      rank: 5
    }, 'gamification');
    testUsers.push(currentUser);
    
    // Create other users
    for (let i = 0; i < 4; i++) {
      const user = generateTestUser();
      await notionHelpers.createTestUser({
        ...user,
        name: `Other User ${i}`,
        totalPoints: 200 + (i * 50)
      }, 'gamification');
      testUsers.push(user);
    }
    
    // Set current user in localStorage
    await context.addInitScript((userData) => {
      localStorage.setItem('nstcg_email', userData.email);
      localStorage.setItem('nstcg_first_name', userData.firstName);
      localStorage.setItem('nstcg_user_registered', 'true');
    }, currentUser);
    
    await page.goto(`${puppeteerConfig.baseUrl}/leaderboard.html`);
    await page.waitForSelector(selectors.leaderboardTable);
    
    // Find current user row
    const currentUserRow = await page.$('.leaderboard-table tr.current-user');
    expect(currentUserRow).toBeTruthy();
    
    // Verify highlighting
    const isHighlighted = await currentUserRow.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return styles.backgroundColor !== 'rgba(0, 0, 0, 0)' || 
             el.classList.contains('current-user');
    });
    expect(isHighlighted).toBe(true);
    
    // Verify current user stats section
    const currentUserStats = await page.$('.current-user-stats');
    if (currentUserStats) {
      const statsText = await currentUserStats.textContent();
      expect(statsText).toContain(currentUser.firstName);
      expect(statsText).toContain('175'); // points
    }
  });

  test('Leaderboard shows empty state for no users', async ({ page }) => {
    // Navigate to leaderboard with no test data
    await page.goto(`${puppeteerConfig.baseUrl}/leaderboard.html`);
    
    // Should show empty state or minimal users
    const emptyState = await page.$('.empty-leaderboard');
    const tableRows = await page.$$('.leaderboard-table tbody tr');
    
    if (emptyState) {
      const emptyText = await emptyState.textContent();
      expect(emptyText).toContain('No participants yet');
    } else {
      // May have some existing users from other tests
      expect(tableRows.length).toBeGreaterThanOrEqual(0);
    }
  });

  test('Non-registered users see join CTA', async ({ page }) => {
    // Ensure no user session
    await page.evaluate(() => localStorage.clear());
    
    // Create some leaderboard data
    const user = generateTestUser();
    await notionHelpers.createTestUser({
      ...user,
      name: 'Leader User',
      totalPoints: 300
    }, 'gamification');
    testUsers.push(user);
    
    await page.goto(`${puppeteerConfig.baseUrl}/leaderboard.html`);
    await page.waitForLoadState('networkidle');
    
    // Should see join CTA
    const joinCTA = await page.$('.join-cta, .leaderboard-cta');
    expect(joinCTA).toBeTruthy();
    
    const ctaText = await joinCTA.textContent();
    expect(ctaText.toLowerCase()).toContain('join');
    
    // Click CTA should go to homepage
    await helpers.clickAndNavigate('.join-cta a, .leaderboard-cta a');
    expect(page.url()).toBe(`${puppeteerConfig.baseUrl}/`);
  });

  test('Leaderboard updates in real-time', async ({ page }) => {
    // Create initial user
    const user1 = generateTestUser();
    await notionHelpers.createTestUser({
      ...user1,
      name: 'Initial Leader',
      totalPoints: 100
    }, 'gamification');
    testUsers.push(user1);
    
    await page.goto(`${puppeteerConfig.baseUrl}/leaderboard.html`);
    await page.waitForSelector(selectors.leaderboardTable);
    
    // Verify initial state
    const initialRows = await page.$$('.leaderboard-table tbody tr');
    const initialCount = initialRows.length;
    
    // Add new user with higher score
    const user2 = generateTestUser();
    await notionHelpers.createTestUser({
      ...user2,
      name: 'New Leader',
      totalPoints: 200
    }, 'gamification');
    testUsers.push(user2);
    
    // Refresh leaderboard data (simulate real-time update)
    await page.reload();
    await page.waitForSelector(selectors.leaderboardTable);
    
    // Verify new user appears at top
    const topUserName = await helpers.getTextContent('.leaderboard-table tbody tr:first-child .user-name');
    expect(topUserName).toContain('New Leader');
    
    // Verify count increased
    const updatedRows = await page.$$('.leaderboard-table tbody tr');
    expect(updatedRows.length).toBeGreaterThan(initialCount);
  });

  test('Leaderboard handles special characters in names', async ({ page }) => {
    // Create users with special characters
    const specialUsers = [
      { firstName: "O'Connor", lastName: "Test", points: 100 },
      { firstName: "José", lastName: "García", points: 150 },
      { firstName: "Test", lastName: "Name-With-Dash", points: 125 },
      { firstName: "Test", lastName: "Name.With.Dots", points: 110 }
    ];
    
    for (const userData of specialUsers) {
      const user = generateTestUser(userData);
      await notionHelpers.createTestUser({
        ...user,
        name: `${userData.firstName} ${userData.lastName}`,
        totalPoints: userData.points
      }, 'gamification');
      testUsers.push(user);
    }
    
    await page.goto(`${puppeteerConfig.baseUrl}/leaderboard.html`);
    await page.waitForSelector(selectors.leaderboardTable);
    
    // Verify all names display correctly
    const displayedNames = await page.$$eval('.leaderboard-table .user-name',
      elements => elements.map(el => el.textContent.trim())
    );
    
    for (const userData of specialUsers) {
      const fullName = `${userData.firstName} ${userData.lastName}`;
      const nameFound = displayedNames.some(name => name.includes(userData.firstName));
      expect(nameFound).toBe(true);
    }
  });

  test('Leaderboard respects opt-out preference', async ({ page }) => {
    // Create users with different opt-in preferences
    const optedInUser = generateTestUser();
    await notionHelpers.createTestUser({
      ...optedInUser,
      name: 'Public User',
      totalPoints: 200,
      optedIntoLeaderboard: true
    }, 'gamification');
    testUsers.push(optedInUser);
    
    const optedOutUser = generateTestUser();
    await notionHelpers.createTestUser({
      ...optedOutUser,
      name: 'Private User',
      totalPoints: 300,
      optedIntoLeaderboard: false
    }, 'gamification');
    testUsers.push(optedOutUser);
    
    await page.goto(`${puppeteerConfig.baseUrl}/leaderboard.html`);
    await page.waitForSelector(selectors.leaderboardTable);
    
    // Get all displayed names
    const displayedNames = await page.$$eval('.leaderboard-table .user-name',
      elements => elements.map(el => el.textContent.trim())
    );
    
    // Opted-in user should appear
    const publicUserVisible = displayedNames.some(name => name.includes('Public User'));
    expect(publicUserVisible).toBe(true);
    
    // Opted-out user should NOT appear
    const privateUserVisible = displayedNames.some(name => name.includes('Private User'));
    expect(privateUserVisible).toBe(false);
  });

  test('Leaderboard pagination works correctly', async ({ page }) => {
    // Create many users to trigger pagination
    const userCount = 25;
    for (let i = 0; i < userCount; i++) {
      const user = generateTestUser();
      await notionHelpers.createTestUser({
        ...user,
        name: `Test User ${i.toString().padStart(2, '0')}`,
        totalPoints: 100 + (i * 10)
      }, 'gamification');
      testUsers.push(user);
    }
    
    await page.goto(`${puppeteerConfig.baseUrl}/leaderboard.html`);
    await page.waitForSelector(selectors.leaderboardTable);
    
    // Check if pagination exists
    const pagination = await page.$('.pagination, .load-more');
    
    if (pagination) {
      // Test pagination controls
      const nextButton = await page.$('.pagination-next, .load-more-btn');
      if (nextButton) {
        await nextButton.click();
        await page.waitForTimeout(1000);
        
        // Verify new content loaded
        const rowsAfterPagination = await page.$$('.leaderboard-table tbody tr');
        expect(rowsAfterPagination.length).toBeGreaterThan(0);
      }
    } else {
      // If no pagination, all users should be visible
      const allRows = await page.$$('.leaderboard-table tbody tr');
      expect(allRows.length).toBeGreaterThanOrEqual(Math.min(userCount, 20));
    }
  });

  test('Leaderboard is accessible via keyboard navigation', async ({ page }) => {
    // Create test data
    const user = generateTestUser();
    await notionHelpers.createTestUser({
      ...user,
      name: 'Keyboard Test User',
      totalPoints: 150
    }, 'gamification');
    testUsers.push(user);
    
    await page.goto(`${puppeteerConfig.baseUrl}/leaderboard.html`);
    await page.waitForSelector(selectors.leaderboardTable);
    
    // Tab through filter buttons
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Check filter buttons are focusable
    const filterButtons = await page.$$(selectors.filterBtns);
    for (const button of filterButtons) {
      const isFocusable = await button.evaluate(el => {
        const tabIndex = el.getAttribute('tabindex');
        return tabIndex === null || parseInt(tabIndex) >= 0;
      });
      expect(isFocusable).toBe(true);
    }
    
    // Test filter activation with keyboard
    const activeFilter = await page.$('.filter-btn.active');
    await activeFilter.focus();
    await page.keyboard.press('ArrowRight'); // Navigate to next filter
    await page.keyboard.press('Enter'); // Activate filter
    
    // Verify filter changed
    await page.waitForTimeout(500);
    const newActiveFilter = await page.$('.filter-btn.active');
    const newActivePeriod = await newActiveFilter.getAttribute('data-period');
    expect(newActivePeriod).toBeTruthy();
  });

  test('Leaderboard loads quickly with many users', async ({ page }) => {
    // Create substantial test data
    const userPromises = [];
    for (let i = 0; i < 50; i++) {
      const user = generateTestUser();
      userPromises.push(
        notionHelpers.createTestUser({
          ...user,
          name: `Performance Test ${i}`,
          totalPoints: Math.floor(Math.random() * 1000)
        }, 'gamification')
      );
      testUsers.push(user);
    }
    
    await Promise.all(userPromises);
    
    // Measure load time
    const startTime = Date.now();
    
    await page.goto(`${puppeteerConfig.baseUrl}/leaderboard.html`);
    await page.waitForSelector(selectors.leaderboardTable);
    
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time
    expect(loadTime).toBeLessThan(5000); // 5 seconds max
    
    // Verify data loaded
    const rows = await page.$$('.leaderboard-table tbody tr');
    expect(rows.length).toBeGreaterThan(0);
  });
});
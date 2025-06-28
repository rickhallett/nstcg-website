/**
 * Leaderboard Page Functionality
 * 
 * Handles leaderboard display, filtering, and user stats
 */

// Initialize debug logger
const debugLogger = new window.DebugLogger('leaderboard');

// State
let currentPeriod = 'all';
let leaderboardData = [];
let userStats = null;
let userEmail = '';
let userId = '';

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async function() {
  debugLogger.info('Leaderboard page initialized');
  
  // Mobile-specific fixes
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    // Prevent pull-to-refresh on mobile
    document.body.style.overscrollBehavior = 'none';
    
    // Add mobile class for CSS targeting
    document.body.classList.add('mobile-device');
    
    // Navigation is now fixed via CSS, no need for JavaScript positioning
    
    // Debug scroll position changes
    let lastScrollY = window.scrollY;
    let scrollDebugCount = 0;
    
    const scrollDebugger = () => {
      const currentScrollY = window.scrollY;
      if (Math.abs(currentScrollY - lastScrollY) > 50) { // Only log significant jumps
        scrollDebugCount++;
        console.warn(`[SCROLL DEBUG ${scrollDebugCount}] Large scroll jump detected:`, {
          from: lastScrollY,
          to: currentScrollY,
          delta: currentScrollY - lastScrollY,
          timestamp: new Date().toISOString(),
          caller: new Error().stack
        });
        debugLogger.warn('Scroll jump detected', {
          from: lastScrollY,
          to: currentScrollY,
          delta: currentScrollY - lastScrollY
        });
      }
      lastScrollY = currentScrollY;
    };
    
    // Monitor scroll position
    window.addEventListener('scroll', scrollDebugger, { passive: true });
    
    // Also monitor any programmatic scrolls
    const originalScrollTo = window.scrollTo;
    window.scrollTo = function(...args) {
      console.warn('[SCROLL DEBUG] scrollTo called:', args, new Error().stack);
      return originalScrollTo.apply(window, args);
    };
    
    // Prevent focus-related jumps
    document.addEventListener('focusin', (e) => {
      const scrollBefore = window.scrollY;
      setTimeout(() => {
        if (window.scrollY !== scrollBefore) {
          console.warn('[SCROLL DEBUG] Focus caused scroll jump, restoring position');
          window.scrollTo(0, scrollBefore);
        }
      }, 0);
    }, true);
  }
  
  // Get user data from localStorage
  userEmail = localStorage.getItem('nstcg_email') || '';
  userId = localStorage.getItem('nstcg_user_id') || '';
  
  debugLogger.debug('User data from localStorage', { hasEmail: !!userEmail, hasUserId: !!userId });
  
  // Load user stats if registered
  if (userEmail || userId) {
    await loadUserStats();
  }
  
  // Load leaderboard
  await loadLeaderboard();
  
  // Setup event listeners
  setupEventListeners();
  
  // Update time display
  updateLastUpdatedTime();
  setInterval(updateLastUpdatedTime, 60000); // Update every minute
});

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Time period filters
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', handlePeriodChange);
  });
}

/**
 * Handle time period change
 */
async function handlePeriodChange(e) {
  const btn = e.target;
  const period = btn.dataset.period;
  
  if (period === currentPeriod) return;
  
  // Update active state
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  
  currentPeriod = period;
  
  // Reload leaderboard
  await loadLeaderboard();
}

/**
 * Load user statistics
 */
async function loadUserStats() {
  try {
    const params = new URLSearchParams();
    if (userEmail) params.append('email', userEmail);
    if (userId) params.append('user_id', userId);
    
    const response = await fetch(`/api/get-user-stats?${params}`);
    const data = await response.json();
    
    if (data.stats && data.exists) {
      userStats = data.stats;
      displayUserStats();
    } else {
      // User not in gamification system yet
      showJoinCTA();
    }
  } catch (error) {
    console.error('Error loading user stats:', error);
  }
}

/**
 * Display user stats
 */
function displayUserStats() {
  if (!userStats) return;
  
  const statsSection = document.getElementById('current-user-stats');
  if (statsSection) {
    statsSection.style.display = 'block';
    
    // Update values
    document.getElementById('my-rank').textContent = userStats.rank > 0 ? `#${userStats.rank}` : '#-';
    document.getElementById('my-points').textContent = userStats.totalPoints;
    document.getElementById('my-referrals').textContent = userStats.directReferrals;
    
    // Animate values
    animateNumber(document.getElementById('my-points'), userStats.totalPoints);
    animateNumber(document.getElementById('my-referrals'), userStats.directReferrals);
  }
}

/**
 * Show join CTA for non-participants
 */
function showJoinCTA() {
  const joinCTA = document.getElementById('join-cta');
  if (joinCTA) {
    joinCTA.style.display = 'block';
  }
}

/**
 * Load leaderboard data
 */
async function loadLeaderboard() {
  // Show loading state
  showLoadingState();
  
  debugLogger.info('Loading leaderboard', { period: currentPeriod });
  
  try {
    const response = await fetch(`/api/get-leaderboard?period=${currentPeriod}&limit=50`);
    const data = await response.json();
    
    debugLogger.debug('Leaderboard API response', {
      status: response.status,
      entriesCount: data.leaderboard?.length || 0,
      hasMessage: !!data.message,
      sampleData: data.leaderboard?.slice(0, 3)
    });
    
    if (data.message) {
      // Show message from API (e.g., "Leaderboard not available")
      debugLogger.warn('API returned message', { message: data.message });
      showMessageState(data.message);
    } else if (data.leaderboard && data.leaderboard.length > 0) {
      leaderboardData = data.leaderboard;
      debugLogger.info('Displaying leaderboard', { count: leaderboardData.length });
      displayLeaderboard();
      updatePodium();
    } else {
      debugLogger.warn('No leaderboard data received');
      showEmptyState();
    }
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    debugLogger.error('Failed to load leaderboard', { error: error.message, stack: error.stack });
    showErrorState();
  }
}

/**
 * Display leaderboard table
 */
function displayLeaderboard() {
  const tbody = document.getElementById('leaderboard-tbody');
  if (!tbody) return;
  
  // Hide loading/empty states
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('empty-state').style.display = 'none';
  
  // Clear existing rows
  tbody.innerHTML = '';
  
  // Only skip entries if we have more than 3 users and showing podium
  const showingPodium = currentPeriod === 'all' && leaderboardData.length >= 3;
  const startIndex = showingPodium ? 3 : 0;
  
  // Add rows - but ensure we show at least the data we have
  const dataToShow = showingPodium ? leaderboardData.slice(startIndex) : leaderboardData;
  
  dataToShow.forEach((entry, index) => {
    const row = createLeaderboardRow(entry, startIndex + index + 1);
    tbody.appendChild(row);
  });
  
  // Highlight user's row if they're in the list
  if (userEmail || userId) {
    highlightUserRow();
  }
}

/**
 * Create leaderboard row
 */
function createLeaderboardRow(entry, rank) {
  const row = document.createElement('tr');
  
  // Log entry data for debugging
  if (rank <= 5) {
    debugLogger.debug(`Creating row ${rank}`, {
      name: entry.name,
      points: entry.points,
      referrals: entry.referrals
    });
  }
  
  // Check if this is the current user
  const isCurrentUser = userStats && (
    userStats.rank === entry.rank ||
    (userEmail && entry.email === userEmail)
  );
  
  if (isCurrentUser) {
    row.classList.add('current-user');
    row.style.background = 'rgba(0, 255, 0, 0.1)';
    row.style.fontWeight = '600';
  }
  
  row.innerHTML = `
    <td>${rank}</td>
    <td>${entry.name}${isCurrentUser ? ' (You)' : ''}</td>
    <td>${entry.points.toLocaleString()}</td>
    <td>${entry.referrals}</td>
  `;
  
  return row;
}

/**
 * Update podium display
 */
function updatePodium() {
  debugLogger.info('Updating podium', { 
    period: currentPeriod, 
    dataCount: leaderboardData.length,
    topThree: leaderboardData.slice(0, 3).map(d => ({ name: d.name, points: d.points, referrals: d.referrals }))
  });
  
  if (currentPeriod !== 'all' || leaderboardData.length === 0) {
    // Hide podium for filtered views or no data
    document.querySelector('.podium-section').style.display = 'none';
    return;
  }
  
  // Show podium even with 1-2 users
  document.querySelector('.podium-section').style.display = 'block';
  
  // Update first place
  if (leaderboardData[0]) {
    const firstName = leaderboardData[0].name;
    const firstPoints = leaderboardData[0].points;
    const firstReferrals = leaderboardData[0].referrals;
    
    debugLogger.debug('Setting first place', { name: firstName, points: firstPoints, referrals: firstReferrals });
    
    document.getElementById('first-name').textContent = firstName;
    document.getElementById('first-points').textContent = firstPoints.toLocaleString();
    document.getElementById('first-referrals').textContent = firstReferrals;
  }
  
  // Update second place
  if (leaderboardData[1]) {
    document.getElementById('second-name').textContent = leaderboardData[1].name;
    document.getElementById('second-points').textContent = leaderboardData[1].points.toLocaleString();
    document.getElementById('second-referrals').textContent = leaderboardData[1].referrals;
  }
  
  // Update third place
  if (leaderboardData[2]) {
    document.getElementById('third-name').textContent = leaderboardData[2].name;
    document.getElementById('third-points').textContent = leaderboardData[2].points.toLocaleString();
    document.getElementById('third-referrals').textContent = leaderboardData[2].referrals;
  }
}

/**
 * Highlight user's row
 */
function highlightUserRow() {
  // This is handled in createLeaderboardRow
}

/**
 * Show loading state
 */
function showLoadingState() {
  document.getElementById('loading-state').style.display = 'block';
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('leaderboard-tbody').innerHTML = '';
}

/**
 * Show empty state
 */
function showEmptyState() {
  debugLogger.info('Showing empty state - no users with points > 0');
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('empty-state').style.display = 'block';
  document.getElementById('leaderboard-tbody').innerHTML = '';
  document.querySelector('.podium-section').style.display = 'none';
}

/**
 * Show error state
 */
function showErrorState() {
  const tbody = document.getElementById('leaderboard-tbody');
  tbody.innerHTML = `
    <tr>
      <td colspan="4" style="text-align: center; padding: 2rem; color: #ef4444;">
        Unable to load leaderboard. Please try again later.
      </td>
    </tr>
  `;
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('empty-state').style.display = 'none';
}

/**
 * Show message state
 */
function showMessageState(message) {
  const tbody = document.getElementById('leaderboard-tbody');
  tbody.innerHTML = `
    <tr>
      <td colspan="4" style="text-align: center; padding: 2rem; color: #888;">
        ${message}
      </td>
    </tr>
  `;
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('empty-state').style.display = 'none';
  document.querySelector('.podium-section').style.display = 'none';
}

/**
 * Update last updated time
 */
function updateLastUpdatedTime() {
  const updateTimeEl = document.getElementById('update-time');
  if (updateTimeEl) {
    // Store current scroll position before update
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    updateTimeEl.textContent = `Last updated at ${timeStr}`;
    
    // Restore scroll position if it changed
    if (window.scrollY !== scrollY || window.scrollX !== scrollX) {
      window.scrollTo(scrollX, scrollY);
    }
  }
}

/**
 * Animate number change
 */
function animateNumber(element, targetValue) {
  if (!element) return;
  
  // Skip animation on mobile to prevent scroll issues
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    element.textContent = targetValue;
    return;
  }
  
  const startValue = parseInt(element.textContent) || 0;
  const duration = 1000;
  const startTime = Date.now();
  
  // Store current scroll position
  const scrollY = window.scrollY;
  const scrollX = window.scrollX;
  
  function update() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    
    const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutQuart);
    
    // Update without triggering layout
    element.textContent = currentValue;
    
    // Preserve scroll position
    if (window.scrollY !== scrollY || window.scrollX !== scrollX) {
      window.scrollTo(scrollX, scrollY);
    }
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  
  requestAnimationFrame(update);
}
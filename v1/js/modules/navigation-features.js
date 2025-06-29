/**
 * Navigation Feature Management
 * 
 * This module handles conditional rendering of navigation items
 * based on feature flags.
 */

import { isFeatureEnabled, loadFeatureFlags } from '../utils/feature-flags.js';
import navTimer from './nav-timer.js';

/**
 * Update navigation based on feature flags
 */
export async function updateNavigationFeatures() {
  // Load feature flags first
  await loadFeatureFlags();
  
  // Handle Donate link
  if (!isFeatureEnabled('donations.enabled')) {
    // Remove donate links from both desktop and mobile menus
    const donateLinks = document.querySelectorAll('a[href="/donate.html"]');
    donateLinks.forEach(link => {
      const listItem = link.closest('li');
      if (listItem) {
        listItem.remove();
      }
    });
  }
  
  // Handle Leaderboard link (if it exists in future)
  if (!isFeatureEnabled('leaderboard.enabled')) {
    const leaderboardLinks = document.querySelectorAll('a[href="/leaderboard.html"]');
    leaderboardLinks.forEach(link => {
      const listItem = link.closest('li');
      if (listItem) {
        listItem.remove();
      }
    });
  }
  
  // Handle Share/Referral link (if it exists in future)
  if (!isFeatureEnabled('referralScheme.enabled')) {
    const shareLinks = document.querySelectorAll('a[href="/share.html"]');
    shareLinks.forEach(link => {
      const listItem = link.closest('li');
      if (listItem) {
        listItem.remove();
      }
    });
  }
}

/**
 * Check if user is registered
 * @returns {boolean} True if user is registered
 */
function isUserRegistered() {
  return localStorage.getItem('nstcg_registered') === 'true' ||
         localStorage.getItem('nstcg_user_id') !== null ||
         localStorage.getItem('nstcg_email') !== null;
}

/**
 * Add navigation items dynamically based on features
 * This can be used to add new nav items when features are enabled
 * @param {string} href - The URL for the navigation item
 * @param {string} text - The display text for the navigation item
 * @param {string} dataPage - The data-page attribute value
 * @param {string|Object} condition - Either a feature flag string or an object with feature and requiresAuth properties
 */
export function addNavigationItem(href, text, dataPage, condition) {
  // Handle both string conditions (feature flags) and object conditions (feature + auth)
  if (typeof condition === 'string') {
    if (!isFeatureEnabled(condition)) {
      return;
    }
  } else if (typeof condition === 'object') {
    // Check feature flag
    if (condition.feature && !isFeatureEnabled(condition.feature)) {
      return;
    }
    // Check authentication requirement
    if (condition.requiresAuth && !isUserRegistered()) {
      return;
    }
  } else if (!condition) {
    return;
  }
  
  // Add to desktop menu
  const desktopMenu = document.querySelector('.desktop-menu');
  if (desktopMenu) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = href;
    a.setAttribute('data-page', dataPage);
    a.textContent = text;
    li.appendChild(a);
    desktopMenu.appendChild(li);
  }
  
  // Add to mobile menu
  const mobileMenu = document.querySelector('.mobile-menu');
  if (mobileMenu) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = href;
    a.setAttribute('data-page', dataPage);
    a.textContent = text;
    li.appendChild(a);
    mobileMenu.appendChild(li);
  }
}

/**
 * Initialize navigation features
 * Call this after the navigation is loaded
 */
export async function initNavigationFeatures() {
  // Update existing navigation items
  await updateNavigationFeatures();
  
  // Add conditional navigation items
  // These will only be added if the features are enabled
  addNavigationItem('/leaderboard.html', 'Leaderboard', 'leaderboard', 'leaderboard.enabled');
  addNavigationItem('/share.html', 'Share', 'share', { 
    feature: 'referralScheme.enabled', 
    requiresAuth: true 
  });
  
  // Add timer to navigation if needed
  await addNavigationTimer();
}

/**
 * Add timer to navigation based on page and feature flags
 */
async function addNavigationTimer() {
  // Determine if we should show timer in navigation
  const isIndexPage = window.location.pathname === '/' || window.location.pathname === '/index.html';
  const communityActionRequired = isFeatureEnabled('ui.communityActionRequired');
  
  // Show timer in nav if:
  // 1. Not on index page (show on all other pages)
  // 2. On index page but community action header is disabled
  const shouldShowTimer = !isIndexPage || !communityActionRequired;
  
  if (!shouldShowTimer) return;
  
  // Get navigation container
  const navContainer = document.querySelector('.nav-container');
  if (!navContainer) return;
  
  // Add has-timer class for layout
  navContainer.classList.add('has-timer');
  
  // Create timer wrapper and insert between logo and menu
  const timerWrapper = document.createElement('div');
  timerWrapper.className = 'nav-timer-wrapper';
  timerWrapper.innerHTML = navTimer.createNavTimerHTML();
  
  // Insert after logo
  const logo = navContainer.querySelector('.nav-logo');
  if (logo && logo.nextSibling) {
    navContainer.insertBefore(timerWrapper, logo.nextSibling);
  } else {
    navContainer.appendChild(timerWrapper);
  }
  
  // Start timer with feature flags
  navTimer.startTimer({
    daysSelector: '.nav-timer-days',
    hoursSelector: '.nav-timer-hours',
    minutesSelector: '.nav-timer-minutes',
    secondsSelector: '.nav-timer-seconds',
    containerSelector: '.nav-timer-container',
    coloredTimer: isFeatureEnabled('ui.coloredTimer'),
    timerBlink: isFeatureEnabled('ui.timerBlink')
  });
}

// No auto-initialization. This will be called from include-nav.js

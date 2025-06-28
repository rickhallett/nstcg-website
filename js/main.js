import imageUrlWebp from '../images/impact_non_sat_height.webp';
import imageUrlPng from '../images/impact_non_sat_height_compressed.png';

// The script is loaded as a module, which is deferred by default.
// This means the DOM will be ready when this code executes.
// Deliberately show loading screen for 3 seconds to build anticipation
setTimeout(() => {
  const mapContainer = document.getElementById('map-container');
  if (mapContainer) {
    mapContainer.innerHTML = `
      <div class="map-image fade-in" id="traffic-impact-map">
        <picture>
          <source srcset="${imageUrlWebp}" type="image/webp">
          <img src="${imageUrlPng}" alt="Map of North Swanage">
        </picture>
        <div class="impact-overlay"></div>
      </div>
    `;
  }
}, 3000); // 3 second deliberate delay for loading screen effect

// Countdown Timer for alert header
function updateCountdown() {
  const deadline = new Date('2025-06-29T23:59:59+01:00'); // BST (British Summer Time)
  const now = new Date().getTime();
  const timeLeft = deadline - now;

  // Debug: Check if countdown elements exist
  const countdownElements = document.querySelectorAll('.header-countdown');
  if (countdownElements.length === 0) {
    console.warn('No countdown elements found with class .header-countdown');
    return;
  }

  if (timeLeft < 0) {
    // Handle expired state
    countdownElements.forEach(el => {
      el.innerHTML = '<span style="color: #ff6b6b; font-weight: bold;">Consultation Closed</span>';
    });
    return;
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  const totalHours = Math.floor(timeLeft / (1000 * 60 * 60));

  // Update header countdown
  const daysEl = document.querySelector('.header-days');
  const hoursEl = document.querySelector('.header-hours');
  const minutesEl = document.querySelector('.header-minutes');
  const secondsEl = document.querySelector('.header-seconds');

  if (daysEl) daysEl.textContent = days.toString().padStart(2, '0');
  if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
  if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
  if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');

  // Apply color and blink features if enabled
  applyTimerFeatures(totalHours);
}

// Apply timer color and blink features
function applyTimerFeatures(totalHours) {
  const container = document.querySelector('.header-countdown');
  if (!container) return;

  // Check feature flags from window object (set by feature-flags.js)
  const coloredTimer = window.featureFlags?.ui?.coloredTimer || false;
  const timerBlink = window.featureFlags?.ui?.timerBlink || false;

  // Remove all color classes
  container.classList.remove('timer-yellow', 'timer-amber', 'timer-orange', 'timer-red', 'timer-blink');

  if (coloredTimer) {
    let colorClass = 'timer-yellow';
    if (totalHours <= 1) colorClass = 'timer-red';
    else if (totalHours <= 12) colorClass = 'timer-orange';
    else if (totalHours <= 24) colorClass = 'timer-amber';

    container.classList.add(colorClass);

    if (timerBlink && totalHours <= 1) {
      container.classList.add('timer-blink');
    }
  }
}

// Initialize countdown when DOM is ready
function startCountdown() {
  console.log('Starting countdown timer...');
  updateCountdown();
  setInterval(updateCountdown, 1000);
}

// Initialize debug logger for activation flow
const debugLogger = new window.DebugLogger('email-activation');

// Add immediate console log to verify script is loading
console.log('main.js loaded');
debugLogger.info('main.js loaded');

// Check for email activation parameters
const urlParams = new URLSearchParams(window.location.search);
const activationEmail = urlParams.get('user_email');
const bonusPoints = urlParams.get('bonus');

debugLogger.info('URL parameters checked', { 
  hasEmail: !!activationEmail, 
  hasBonus: !!bonusPoints,
  email: activationEmail,
  bonus: bonusPoints,
  fullUrl: window.location.href
});

// If activation parameters are present, handle activation flow
if (activationEmail && bonusPoints) {
  console.log('Email activation detected:', activationEmail, 'with', bonusPoints, 'bonus points');
  debugLogger.info('Email activation detected', { email: activationEmail, bonusPoints });
  
  // Wait for DOM and MicroModal to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Delay to ensure MicroModal is initialized
      setTimeout(() => handleEmailActivation(activationEmail, bonusPoints), 500);
    });
  } else {
    // DOM is ready, but wait for MicroModal
    setTimeout(() => handleEmailActivation(activationEmail, bonusPoints), 500);
  }
  
  // Still start countdown timer
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startCountdown);
  } else {
    startCountdown();
  }
} else {
  // Normal flow
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startCountdown);
  } else {
    // DOM is already ready
    startCountdown();
  }
}

// API call to Vercel function
async function submitToNotion(formData) {
  const response = await fetch('/api/submit-form', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(formData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Submission failed');
  }

  return response.json();
}

// Show email error function
function showEmailError() {
  const emailInput = document.getElementById('email');
  const modalEmailInput = document.getElementById('modalEmail');

  // Add error state to main form email input
  if (emailInput) {
    emailInput.classList.add('error');
    emailInput.placeholder = 'Email already registered';
    emailInput.value = '';

    // Remove error state when user starts typing
    const resetError = () => {
      emailInput.classList.remove('error');
      emailInput.placeholder = 'Stay connected with updates';
      emailInput.removeEventListener('input', resetError);
    };
    emailInput.addEventListener('input', resetError);
  }

  // Add error state to modal email input  
  if (modalEmailInput) {
    modalEmailInput.classList.add('error');
    modalEmailInput.placeholder = 'Email already registered';
    modalEmailInput.value = '';

    // Remove error state when user starts typing
    const resetModalError = () => {
      modalEmailInput.classList.remove('error');
      modalEmailInput.placeholder = 'Enter your email';
      modalEmailInput.removeEventListener('input', resetModalError);
    };
    modalEmailInput.addEventListener('input', resetModalError);
  }
}

// Form Submission with Error Handling
document.getElementById('signupForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  // Immediately disable submit button to prevent double-clicks
  const submitBtn = this.querySelector('button[type="submit"]');
  if (submitBtn.disabled) return; // Already processing
  submitBtn.disabled = true;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'PROCESSING...';

  // Get form data
  const userId = generateUserId();
  const submissionId = `${userId}-${Date.now()}`; // Unique submission ID
  const visitorType = document.querySelector('input[name="visitorType"]:checked')?.value || 'local';
  const formData = {
    name: `${document.getElementById('firstName').value.trim()} ${document.getElementById('lastName').value.trim()}`,
    firstName: document.getElementById('firstName').value.trim(),
    lastName: document.getElementById('lastName').value.trim(),
    email: document.getElementById('email').value.trim(),
    comment: document.getElementById('comment').value.trim(),
    visitorType: visitorType,
    user_id: userId,
    submission_id: submissionId,
    timestamp: new Date().toISOString(),
    source: 'main_form',
    referrer: sessionStorage.getItem('referrer') || null,
    referral_code: sessionStorage.getItem('referral_code') || null,
    referral_source: sessionStorage.getItem('referral_source') || null,
    referral_platform: sessionStorage.getItem('referrer_platform') || null,
    referral_timestamp: sessionStorage.getItem('referral_timestamp') || null
  };

  try {
    // Get reCAPTCHA token
    let recaptchaToken;
    try {
      if (typeof grecaptcha !== 'undefined' && grecaptcha.enterprise) {
        submitBtn.textContent = 'VERIFYING...';
        recaptchaToken = await grecaptcha.enterprise.execute('6LdmSm4rAAAAAGwGVAsN25wdZ2Q2gFoEAtQVt7lX', { action: 'submit' });

        // Verify token with backend
        const verifyResponse = await fetch('/api/verify-recaptcha', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token: recaptchaToken, action: 'submit' })
        });

        if (!verifyResponse.ok) {
          throw new Error('Security verification failed');
        }

        const verifyResult = await verifyResponse.json();
        if (!verifyResult.isAllowed) {
          throw new Error('Security check failed. Please try again.');
        }

        // Add score to form data for logging
        formData.recaptchaScore = verifyResult.score;
      }
    } catch (recaptchaError) {
      console.error('reCAPTCHA error:', recaptchaError);
      // Continue without reCAPTCHA in case of error (graceful degradation)
      // You might want to change this behavior based on your security requirements
    }

    submitBtn.textContent = 'SUBMITTING...';

    // Submit to API
    await submitToNotion(formData);

    // Success - Store user data in localStorage
    localStorage.setItem('nstcg_user_id', userId);
    localStorage.setItem('nstcg_email', formData.email);
    localStorage.setItem('nstcg_registered', 'true');
    localStorage.setItem('nstcg_first_name', formData.firstName);
    localStorage.setItem('nstcg_last_name', formData.lastName);
    if (formData.comment) {
      localStorage.setItem('nstcg_comment', formData.comment);
    }
    
    // Fetch and sync referral code from server
    try {
      const referralCode = await window.ReferralUtils.getUserReferralCode();
      console.log('Synced referral code:', referralCode);
    } catch (error) {
      console.warn('Failed to sync referral code:', error);
    }

    // Hide form section
    document.querySelector('.form-section').style.display = 'none';

    // Show confirmation
    document.getElementById('confirmation').style.display = 'block';

    // Show loading state in confirmation message with animation
    const confirmationCountEl = document.getElementById('confirmation-count');
    let confirmationCountUpdater = null;
    if (confirmationCountEl) {
      confirmationCountUpdater = createAnimatedPlaceholder(confirmationCountEl);
    }

    // Scroll to confirmation
    document.getElementById('confirmation').scrollIntoView({ behavior: 'smooth' });

    // Store user comment for sharing
    const userComment = formData.comment;

    // Add share buttons immediately in disabled state
    addSocialShareButtons('confirmation', 0, userComment, true);

    // Wait a moment for database to update, then fetch fresh count
    setTimeout(async () => {
      const counterEl = document.querySelector('.counter-number');
      const newCount = await fetchRealCount();
      realCount = newCount; // Update global count

      // Update all count displays with fresh data
      counterEl.textContent = newCount;

      if (confirmationCountUpdater) {
        confirmationCountUpdater(newCount);
      }

      // Update submit button for consistency
      if (submitButtonUpdater) {
        submitButtonUpdater(newCount);
      }

      // Update social share buttons with real count and enable them
      addSocialShareButtons('confirmation', newCount, userComment, false);

      // Update live feed to show new signup
      await updateLiveFeed();
    }, 500);
  } catch (error) {
    // Re-enable submit button on error
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;

    // Check if it's an email duplication error
    if (error.message === 'email_exists' || (error.message && error.message.includes('email_exists'))) {
      // Handle email already registered error
      showEmailError();
      return;
    }

    // Error - Replace form with error state
    const formSection = document.querySelector('.form-section');
    formSection.innerHTML = `
      <div class="error-state" style="text-align: center; padding: 40px 20px;">
        <h2 style="color: #ff0000; font-size: 28px; margin-bottom: 20px; font-weight: 900;">
          ⚠️ UNEXPECTED ERROR
        </h2>
        <p style="font-size: 18px; color: #ff6666; margin-bottom: 30px; line-height: 1.5;">
          There has been an unexpected error.<br>
          Please contact Kai at Oceanheart.ai
        </p>
        <a href="mailto:kai@oceanheart.ai" style="
          display: inline-block;
          background: #ff0000;
          color: #fff;
          padding: 15px 30px;
          border-radius: 5px;
          text-decoration: none;
          font-weight: bold;
          text-transform: uppercase;
          font-size: 16px;
          transition: all 0.3s ease;
        " onmouseover="this.style.background='#cc0000'" onmouseout="this.style.background='#ff0000'">
          Tech Support
        </a>
      </div>
    `;
    formSection.style.border = '3px solid #ff0000';
    formSection.scrollIntoView({ behavior: 'smooth' });
  }
});

// Function to fetch real count from API with caching
async function fetchRealCount() {
  const CACHE_KEY = 'nstcg_participant_count_cache';
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Check cache first
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { count, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        console.log('Using cached participant count');
        return count;
      }
    }
  } catch (error) {
    console.warn('Error reading count cache:', error);
  }

  // Fetch from API
  try {
    const response = await fetch('/api/get-count');
    if (response.ok) {
      const data = await response.json();

      // Cache the count with timestamp
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          count: data.count,
          timestamp: Date.now()
        }));
      } catch (cacheError) {
        console.warn('Failed to cache count:', cacheError);
      }

      return data.count;
    }
  } catch (error) {
    console.error('Error fetching count:', error);
  }
  return 215; // Default fallback
}

// Global variable to store the real count
let realCount = null;

// Global variable for submit button animation
let submitButtonUpdater = null;

// Helper to create animated submit button
function createAnimatedSubmitButton(element) {
  if (!element) return;

  let localCounter = 0;
  const startTime = Date.now();
  let animationId = null;

  function updateText(count) {
    element.textContent = `JOIN ${count} NEIGHBOURS NOW`;
  }

  function animate() {
    const elapsed = Date.now() - startTime;
    localCounter = Math.floor(elapsed / 50); // Same rate as main counter
    updateText(localCounter);
    animationId = requestAnimationFrame(animate);
  }

  animate();

  // Return function to stop and set final value
  return function (finalValue) {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }

    // Animate to final value
    const duration = 1000;
    const startValue = localCounter;
    const animStartTime = Date.now();

    function finalAnimate() {
      const elapsed = Date.now() - animStartTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startValue + (finalValue - startValue) * easedProgress);

      updateText(current);

      if (progress < 1) {
        requestAnimationFrame(finalAnimate);
      }
    }

    finalAnimate();
  };
}

// Fetch and update all count displays
async function initializeCounts() {
  // Fetch the real count
  realCount = await fetchRealCount();

  // Update the submit button with animation
  if (submitButtonUpdater) {
    submitButtonUpdater(realCount);
  }

  // Update confirmation count (in case it's visible)
  const confirmationCount = document.getElementById('confirmation-count');
  if (confirmationCount) {
    confirmationCount.textContent = realCount;
  }

  // Animate the main counter
  animateCounterFromZero(realCount);

  // Update share buttons for registered users with real count
  const isRegistered = localStorage.getItem('nstcg_registered') === 'true';
  if (isRegistered && realCount) {
    const userComment = localStorage.getItem('nstcg_comment') || '';

    // Update registered share container if it exists
    const registeredShareContainer = document.getElementById('registered-share-container');
    if (registeredShareContainer) {
      registeredShareContainer.innerHTML = '';
      addSocialShareButtons('registered-share-container', realCount, userComment, false);
    }

    // Update bottom share container if it exists
    const bottomShareContainer = document.getElementById('bottom-share-container');
    if (bottomShareContainer) {
      bottomShareContainer.innerHTML = '';
      addSocialShareButtons('bottom-share-container', realCount, userComment, false);
    }
  }
}

// Enhanced counter animation system
let counterAnimation = {
  current: 0,
  target: null,
  animationId: null,
  startTime: null,
  phase: 'initial' // 'initial' or 'accelerated'
};

function startCounterAnimation(element) {
  // Start with slow counting immediately
  counterAnimation.current = 0;
  counterAnimation.startTime = Date.now();
  counterAnimation.phase = 'initial';

  function animate() {
    const elapsed = Date.now() - counterAnimation.startTime;

    if (counterAnimation.phase === 'initial') {
      // Slow initial counting: roughly 1 per 50ms
      counterAnimation.current = Math.floor(elapsed / 50);
    } else if (counterAnimation.phase === 'accelerated' && counterAnimation.target !== null) {
      // Exponential acceleration to target
      const phaseElapsed = Date.now() - counterAnimation.acceleratedStartTime;
      const duration = 1500; // 1.5 seconds to reach target
      const progress = Math.min(phaseElapsed / duration, 1);

      // Exponential easing
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      counterAnimation.current = Math.floor(
        counterAnimation.acceleratedStart +
        (counterAnimation.target - counterAnimation.acceleratedStart) * easedProgress
      );

      if (progress >= 1) {
        counterAnimation.current = counterAnimation.target;
        cancelAnimationFrame(counterAnimation.animationId);
        return;
      }
    }

    if (element) {
      element.textContent = counterAnimation.current;
    }

    counterAnimation.animationId = requestAnimationFrame(animate);
  }

  animate();
}

function accelerateToTarget(target) {
  counterAnimation.target = target;
  counterAnimation.phase = 'accelerated';
  counterAnimation.acceleratedStart = counterAnimation.current;
  counterAnimation.acceleratedStartTime = Date.now();
}

// Helper to create animated placeholder for any element
function createAnimatedPlaceholder(element) {
  if (!element) return;

  let localCounter = 0;
  const startTime = Date.now();
  let animationId = null;

  function animate() {
    const elapsed = Date.now() - startTime;
    localCounter = Math.floor(elapsed / 50); // Same rate as main counter
    element.textContent = localCounter;
    animationId = requestAnimationFrame(animate);
  }

  animate();

  // Return function to stop and set final value
  return function (finalValue) {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }

    // Animate to final value
    const duration = 1000;
    const startValue = localCounter;
    const animStartTime = Date.now();

    function finalAnimate() {
      const elapsed = Date.now() - animStartTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startValue + (finalValue - startValue) * easedProgress);

      element.textContent = current;

      if (progress < 1) {
        requestAnimationFrame(finalAnimate);
      }
    }

    finalAnimate();
  };
}

// Separate function for counter animation (keep for compatibility)
function animateCounterFromZero(end) {
  const counterEl = document.querySelector('.counter-number');
  if (counterAnimation.animationId) {
    // If already animating, just update the target
    accelerateToTarget(end);
  } else {
    // Start new animation
    startCounterAnimation(counterEl);
    // Immediately accelerate to target since we have the value
    setTimeout(() => accelerateToTarget(end), 100);
  }
}

// Fisher-Yates shuffle algorithm
function shuffleArray(array) {
  const arr = [...array]; // Create a copy
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Load and display random thought bubbles
async function loadThoughtBubbles() {
  try {
    const response = await fetch('/data/thought-bubbles.json');
    const data = await response.json();
    const bubbles = data.thoughtBubbles;

    // Shuffle and select 3 bubbles (or fewer if less than 3 available)
    const shuffled = shuffleArray(bubbles);
    const selected = shuffled.slice(0, 3);

    // Get container and populate
    const container = document.getElementById('thought-bubbles-container');
    if (container) {
      container.innerHTML = selected.map(bubble => `
        <div class="thought-bubble">
          ${bubble}
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Error loading thought bubbles:', error);
    // Fallback to default bubbles
    const container = document.getElementById('thought-bubbles-container');
    if (container) {
      container.innerHTML = `
        <div class="thought-bubble">
          I'm worried about increased traffic on our residential street. My kids play here!
        </div>
        <div class="thought-bubble">
          The speeding on Shore Road is already dangerous. This could make it worse.
        </div>
        <div class="thought-bubble">
          We need to make sure our voices are heard before it's too late to change things.
        </div>
      `;
    }
  }
}

// Function to format relative time
function getRelativeTime(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

// Store feed actions for random selection
let feedActions = [];

// Function to load feed actions
async function loadFeedActions() {
  try {
    const response = await fetch('/data/feed-actions.json');
    const data = await response.json();
    feedActions = data.feedActions;
  } catch (error) {
    console.error('Error loading feed actions:', error);
    // Fallback actions
    feedActions = [
      'joined the consultation',
      'signed up with family',
      'added their voice'
    ];
  }
}

// Function to get a random action
function getRandomAction() {
  return feedActions[Math.floor(Math.random() * feedActions.length)];
}

// Function to update live feed with real data
async function updateLiveFeed(showLoading = false) {
  const feedContainer = document.querySelector('.live-feed');
  if (!feedContainer) return;

  // Show loading only on initial load or if requested
  if (showLoading) {
    const existingItems = feedContainer.querySelectorAll('.feed-item, .feed-loading, .feed-empty, .feed-error');
    existingItems.forEach(item => item.remove());

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'feed-loading';
    loadingDiv.innerHTML = `
      <div class="loading-spinner"></div>
      <p>Loading recent activity...</p>
    `;
    feedContainer.appendChild(loadingDiv);
  }

  try {
    const response = await fetch('/api/get-recent-signups');
    if (!response.ok) throw new Error('Failed to fetch signups');

    const data = await response.json();
    const signups = data.signups;

    // Clear loading/existing items
    const existingItems = feedContainer.querySelectorAll('.feed-item, .feed-loading, .feed-empty, .feed-error');
    existingItems.forEach(item => item.remove());

    if (signups && signups.length > 0) {
      // Add real signups
      signups.forEach((signup, index) => {
        const feedItem = document.createElement('div');
        feedItem.className = 'feed-item';
        feedItem.style.animationDelay = `${index * 0.1}s`;

        const relativeTime = getRelativeTime(signup.timestamp);
        const action = getRandomAction();

        let feedContent = `
          <div class="feed-time">${relativeTime}</div>
          <div class="feed-message">${signup.name} ${action}</div>
        `;

        // Add comment if present
        if (signup.comment) {
          feedContent += `<div class="feed-comment">"${signup.comment}"</div>`;
        }

        feedItem.innerHTML = feedContent;

        feedContainer.appendChild(feedItem);
      });
    } else {
      // Show empty state
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'feed-empty';
      emptyDiv.innerHTML = `
        <p style="color: #666;">
          Be the first to join the movement!
        </p>
      `;
      feedContainer.appendChild(emptyDiv);
    }
  } catch (error) {
    console.error('Error updating live feed:', error);

    // Only show error state if there are no existing items
    const existingItems = feedContainer.querySelectorAll('.feed-item');
    if (existingItems.length === 0) {
      const existingStates = feedContainer.querySelectorAll('.feed-loading, .feed-empty, .feed-error');
      existingStates.forEach(item => item.remove());

      const errorDiv = document.createElement('div');
      errorDiv.className = 'feed-error';
      errorDiv.innerHTML = `
        <p style="color: #ff6666;">
          Unable to load recent activity
        </p>
      `;
      feedContainer.appendChild(errorDiv);
    }
  }
}

// Check for referral parameter
function checkReferral() {
  const urlParams = new URLSearchParams(window.location.search);
  const referralCode = urlParams.get('ref');
  const sourceCode = urlParams.get('src');

  if (referralCode) {
    // Add class to body for CSS styling
    document.body.classList.add('referred-visitor');
    
    // Store referral information in session storage
    sessionStorage.setItem('referrer', referralCode);
    sessionStorage.setItem('referral_code', referralCode);

    // Store source platform if provided
    if (sourceCode) {
      sessionStorage.setItem('referral_source', sourceCode);

      // Map source codes to platform names
      const platformMap = {
        'fb': 'facebook',
        'tw': 'twitter',
        'wa': 'whatsapp',
        'li': 'linkedin',
        'ig': 'instagram',
        'em': 'email',
        'dr': 'direct'
      };

      const platform = platformMap[sourceCode] || sourceCode;
      sessionStorage.setItem('referrer_platform', platform);
    }

    // Store referral attribution timestamp
    sessionStorage.setItem('referral_timestamp', new Date().toISOString());

    // Clean URL without reload
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);

    // Return both codes for tracking
    return {
      referralCode,
      sourceCode,
      timestamp: new Date().toISOString()
    };
  }

  return null;
}

// Page load time tracking for smart polling
const pageLoadTime = Date.now();
let pollInterval;

// Function to update count displays
function updateCountDisplays(count) {
  const counterEl = document.querySelector('.counter-number');
  if (counterEl) {
    counterEl.textContent = count;
  }
  if (submitButtonUpdater) {
    submitButtonUpdater(count);
  }
}

// Smart polling implementation
function setupSmartPolling() {
  // Clear any existing interval
  if (pollInterval) clearTimeout(pollInterval);

  function updatePollRate() {
    const timeOnPage = Date.now() - pageLoadTime;
    const minutes = timeOnPage / 60000;

    if (minutes < 5) {
      // First 5 minutes: 30 seconds
      return 30000;
    } else if (minutes < 15) {
      // Next 10 minutes: 60 seconds
      return 60000;
    } else {
      // After 15 minutes: 2 minutes
      return 120000;
    }
  }

  // Set up dynamic polling
  function pollWithDynamicRate() {
    const rate = updatePollRate();
    pollInterval = setTimeout(async () => {
      // Update both count and feed in parallel
      await Promise.all([
        fetchRealCount().then(count => {
          realCount = count;
          updateCountDisplays(count);
        }),
        updateLiveFeed()
      ]);
      pollWithDynamicRate(); // Schedule next poll
    }, rate);
  }

  pollWithDynamicRate();
}

// Function to check registration status and update UI
async function initializeRegistrationState() {
  const isRegistered = localStorage.getItem('nstcg_registered') === 'true';
  const userId = localStorage.getItem('nstcg_user_id');

  if (isRegistered && userId) {
    // Transform UI for registered users
    await transformSurveyButtonToShare();
    transformBottomFormToShare();
    showModalButtonNotification();
  }
}

// Transform survey button to share section for registered users
async function transformSurveyButtonToShare() {
  const surveySection = document.querySelector('.survey-button-section');
  if (surveySection) {
    const userComment = localStorage.getItem('nstcg_comment') || '';

    // Replace entire section with share UI
    surveySection.innerHTML = `
      <div class="already-registered-banner" style="
        background: #FFA500;
        color: #1a1a1a;
        padding: 15px 20px;
        border-radius: 5px;
        margin-bottom: 20px;
        font-weight: bold;
        text-align: center;
        font-size: 18px;
      ">
        <i class="fas fa-check-circle" style="margin-right: 10px;"></i>
        You've already registered - now help spread the word!
      </div>
      <div id="registered-share-container"></div>
      <div class="referral-info-card" style="
        background: rgba(52, 152, 219, 0.1);
        border: 2px solid var(--color-primary);
        border-radius: 10px;
        padding: 20px;
        margin-top: 20px;
        text-align: left;
      ">
        <h3 style="color: var(--color-primary); margin-bottom: 15px; font-size: 20px;">
          <i class="fas fa-trophy"></i> Earn Rewards & Win Prizes!
        </h3>
        <div class="reward-items" style="display: grid; gap: 12px;">
          <div class="reward-item" style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-users" style="color: #00ff00; font-size: 18px;"></i>
            <span><strong>25 points</strong> when your friend completes registration</span>
          </div>
          <div class="reward-item" style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-chart-line" style="color: #ff9900; font-size: 18px;"></i>
            <span>Climb the <a href="/leaderboard.html" style="color: var(--color-primary); text-decoration: underline;">community leaderboard</a></span>
          </div>
          <div class="reward-item" style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-gift" style="color: #ff6b6b; font-size: 18px;"></i>
            <span><strong>£500 prize pool</strong> for top contributors</span>
          </div>
        </div>
        <p style="margin-top: 15px; font-size: 14px; opacity: 0.9;">
          Your unique referral code: <strong>${await window.ReferralUtils.getUserReferralCode()}</strong>
        </p>
      </div>
    `;

    // Add share buttons immediately with cached count
    const cachedCount = localStorage.getItem('nstcg_cached_count') || '1000+';
    addSocialShareButtons('registered-share-container', cachedCount, userComment, false);
  }
}

// Transform bottom form to share section for registered users
function transformBottomFormToShare() {
  const formSection = document.querySelector('.form-section');
  if (formSection) {
    const userComment = localStorage.getItem('nstcg_comment') || '';

    // Replace entire form section content
    formSection.innerHTML = `
      <div class="already-registered-banner" style="
        background: #FFA500;
        color: #1a1a1a;
        padding: 15px 20px;
        border-radius: 5px;
        margin-bottom: 20px;
        font-weight: bold;
        text-align: center;
        font-size: 18px;
      ">
        <i class="fas fa-check-circle" style="margin-right: 10px;"></i>
        ✓ You've already registered - now help spread the word!
      </div>
      <div id="bottom-share-container"></div>
    `;

    // Add share buttons immediately with cached count
    const cachedCount = localStorage.getItem('nstcg_cached_count') || '1000+';
    addSocialShareButtons('bottom-share-container', cachedCount, userComment, false);
  }
}

// Show notification for modal survey button
function showModalButtonNotification() {
  const modalBtn = document.querySelector('.survey-btn');
  if (modalBtn) {
    const notification = document.createElement('div');
    notification.className = 'survey-button-notification';
    notification.style.cssText = `
      background: #FFA500;
      color: #1a1a1a;
      padding: 10px 15px;
      border-radius: 5px;
      margin-top: 10px;
      font-size: 14px;
      font-weight: bold;
      text-align: center;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    notification.textContent = "You've already registered";

    modalBtn.parentElement.appendChild(notification);

    // Fade in
    setTimeout(() => {
      notification.style.opacity = '1';
    }, 100);

    // Fade out after 5 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 5000);
  }
}

// Show referral attribution banner
function showReferralBanner(referralInfo) {
  if (!referralInfo || !referralInfo.referralCode) return;

  // Check if referral banner is disabled via feature flags
  if (window.DISABLE_REFERRAL_BANNER) return;

  const banner = document.createElement('div');
  banner.className = 'referral-banner';
  banner.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #00ff00 0%, #00cc00 100%);
    color: #1a1a1a;
    padding: 15px 30px;
    border-radius: 50px;
    font-weight: bold;
    z-index: 1000;
    box-shadow: 0 4px 20px rgba(0, 255, 0, 0.3);
    opacity: 0;
    transition: all 0.5s ease;
    text-align: center;
    max-width: 90%;
  `;

  // Determine source text
  const sourceText = referralInfo.sourceCode ?
    ` via ${referralInfo.sourceCode === 'fb' ? 'Facebook' :
      referralInfo.sourceCode === 'tw' ? 'Twitter' :
        referralInfo.sourceCode === 'wa' ? 'WhatsApp' :
          referralInfo.sourceCode === 'li' ? 'LinkedIn' :
            referralInfo.sourceCode === 'ig' ? 'Instagram' :
              referralInfo.sourceCode === 'em' ? 'Email' : 'a friend'}` : '';

  banner.innerHTML = `
    <i class="fas fa-link" style="margin-right: 10px;"></i>
    Welcome! You were referred by a community member${sourceText}
    <i class="fas fa-heart" style="margin-left: 10px; color: #ff6b6b;"></i>
  `;

  document.body.appendChild(banner);

  // Animate in
  setTimeout(() => {
    banner.style.opacity = '1';
    banner.style.transform = 'translateX(-50%) translateY(0)';
  }, 100);

  // Animate out after 5 seconds
  setTimeout(() => {
    banner.style.opacity = '0';
    banner.style.transform = 'translateX(-50%) translateY(-20px)';
    setTimeout(() => {
      banner.remove();
    }, 500);
  }, 5000);
}

// Initialize counts on page load
async function initializePageLoad() {
  // Check for referral (only if not disabled)
  const referralInfo = window.DISABLE_REFERRAL_TRACKING ? null : checkReferral();

  // Show referral banner if applicable
  if (referralInfo) {
    showReferralBanner(referralInfo);
  }

  // Load thought bubbles
  loadThoughtBubbles();

  // Load feed actions
  await loadFeedActions();

  // Start counter animation immediately
  const counterEl = document.querySelector('.counter-number');
  if (counterEl) {
    startCounterAnimation(counterEl);
  }

  // Start submit button animation
  const submitBtnText = document.getElementById('submit-btn-text');
  if (submitBtnText) {
    submitButtonUpdater = createAnimatedSubmitButton(submitBtnText);
  }

  // Initialize all counts immediately
  await initializeCounts();

  // Load financial status (only if enabled)
  if (!window.featureFlags || window.featureFlags.shouldLoadFinancialStatus()) {
    await loadFinancialStatus();
  }

  // Initial live feed update with loading state
  await updateLiveFeed(true);

  // Set up smart polling
  setupSmartPolling();
}

// Check if page is already loaded, otherwise wait for load event
if (document.readyState === 'complete') {
  initializePageLoad();
} else {
  window.addEventListener('load', initializePageLoad);
}

// Store original modal content for reset
let originalModalContent;

// Check registration status as soon as script loads (for critical UI updates)
// This runs before DOMContentLoaded for the fastest possible UI update
(function () {
  const isRegistered = localStorage.getItem('nstcg_registered') === 'true';
  if (isRegistered) {
    // Add a class to body immediately to allow CSS-based UI changes
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', async function () {
        document.body.classList.add('user-registered');
        await initializeRegistrationState();
      }, { once: true });
    } else {
      document.body.classList.add('user-registered');
      initializeRegistrationState(); // Fire and forget
    }
  }
})();

// Initialize DOM-dependent code
async function initializeDOMContent() {
  // Only initialize if not already done above
  if (!document.body.classList.contains('user-registered')) {
    await initializeRegistrationState();
  }

  originalModalContent = document.getElementById('modal-survey-content').innerHTML;

  // Initialize Micromodal with all configurations
  MicroModal.init({
    awaitCloseAnimation: true,
    disableScroll: true,
    onClose: function (modal) {
      if (modal.id === 'modal-survey') {
        // Reset modal content to original form
        const modalContent = document.getElementById('modal-survey-content');
        modalContent.innerHTML = originalModalContent;
        modalContent.style.opacity = '1';
        modalContent.style.transition = '';

        // Re-attach event listener to the new form
        const newForm = document.getElementById('surveyModalForm');
        if (newForm) {
          newForm.addEventListener('submit', handleModalFormSubmit);
        }
        
        // Check if user just completed registration and refresh page
        // This ensures UI updates to show social buttons instead of survey buttons
        const isRegistered = localStorage.getItem('nstcg_registered') === 'true';
        const modalHasSuccessContent = modalContent.innerHTML.includes('WELCOME TO THE MOVEMENT');
        
        if (isRegistered && modalHasSuccessContent) {
          // Small delay to ensure smooth modal close animation
          setTimeout(() => {
            location.reload();
          }, 300);
        }
      }
    }
  });

  // Attach event listener to form
  document.getElementById('surveyModalForm').addEventListener('submit', handleModalFormSubmit);

  // Workaround for email share button click issues in modals
  document.addEventListener('click', function (e) {
    // Check if clicked element is email share button or its child
    const emailBtn = e.target.closest('.share-btn-icon.email');
    if (emailBtn && !emailBtn.disabled) {
      // Get the onclick attribute
      const onclickAttr = emailBtn.getAttribute('onclick');
      if (onclickAttr && onclickAttr.includes('shareByEmail')) {
        e.preventDefault();
        e.stopPropagation();
        // Execute the shareByEmail function
        try {
          eval(onclickAttr);
        } catch (error) {
          console.error('Error executing shareByEmail:', error);
        }
      }
    }
  }, true); // Use capture phase to intercept before MicroModal
}

// Check if DOM is already loaded, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDOMContent);
} else {
  initializeDOMContent();
}

// Extract form submission handler to a named function
async function handleModalFormSubmit(e) {
  e.preventDefault();

  const messageEl = document.getElementById('modalMessage');
  const submitBtn = this.querySelector('.modal-submit-btn');

  // Immediately disable submit button to prevent double-clicks
  if (submitBtn.disabled) return; // Already processing
  submitBtn.disabled = true;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'PROCESSING...';

  // Get form data
  const userId = generateUserId();
  const submissionId = `${userId}-${Date.now()}`; // Unique submission ID
  const modalVisitorType = document.querySelector('input[name="modalVisitorType"]:checked')?.value || 'local';
  const formData = {
    name: `${document.getElementById('modalFirstName').value.trim()} ${document.getElementById('modalLastName').value.trim()}`,
    firstName: document.getElementById('modalFirstName').value.trim(),
    lastName: document.getElementById('modalLastName').value.trim(),
    email: document.getElementById('modalEmail').value.trim(),
    comment: document.getElementById('modalComment').value.trim(),
    visitorType: modalVisitorType,
    user_id: userId,
    submission_id: submissionId,
    timestamp: new Date().toISOString(),
    source: 'survey_modal',
    referrer: sessionStorage.getItem('referrer') || null,
    referral_code: sessionStorage.getItem('referral_code') || null,
    referral_source: sessionStorage.getItem('referral_source') || null,
    referral_platform: sessionStorage.getItem('referrer_platform') || null,
    referral_timestamp: sessionStorage.getItem('referral_timestamp') || null
  };

  // Basic validation
  if (!formData.firstName || !formData.lastName || !formData.email) {
    messageEl.className = 'message error';
    messageEl.textContent = 'Please fill in all required fields.';
    messageEl.style.display = 'block';
    // Re-enable button on validation error
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    return;
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.email)) {
    messageEl.className = 'message error';
    messageEl.textContent = 'Please enter a valid email address.';
    messageEl.style.display = 'block';
    // Re-enable button on validation error
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    return;
  }

  // Hide any previous messages
  messageEl.style.display = 'none';

  try {
    // Submit to API
    await submitToNotion(formData);

    // Success - Store user data in localStorage
    localStorage.setItem('nstcg_user_id', userId);
    localStorage.setItem('nstcg_email', formData.email);
    localStorage.setItem('nstcg_registered', 'true');
    localStorage.setItem('nstcg_first_name', formData.firstName);
    localStorage.setItem('nstcg_last_name', formData.lastName);
    if (formData.comment) {
      localStorage.setItem('nstcg_comment', formData.comment);
    }
    
    // Fetch and sync referral code from server
    try {
      const referralCode = await window.ReferralUtils.getUserReferralCode();
      console.log('Synced referral code:', referralCode);
    } catch (error) {
      console.warn('Failed to sync referral code:', error);
    }

    // Replace modal content with success message (with loading state)
    const modalContent = document.getElementById('modal-survey-content');
    modalContent.innerHTML = `
      <div class="modal-success-content" style="text-align: center; padding: 40px 20px;">
        <h3 style="color: #00ff00; font-size: 28px; margin-bottom: 20px; font-weight: 900;">
          ✓ WELCOME TO THE MOVEMENT!
        </h3>
        <p style="font-size: 18px; color: #ccc; margin-bottom: 20px; line-height: 1.5;">
          You are now part of <span id="modal-count-display">0</span> Neighbours fighting for safer streets.<br>
          Together, we're making North Swanage better for everyone.
        </p>
        <p style="color: #00ff00; font-weight: bold; font-size: 16px;">
          Check your email for community updates.
        </p>
        <div id="modal-share-container"></div>
        <button id="modal-survey-continue-btn" class="modal-survey-continue-btn" style="
          margin-top: 20px;
          background: #00ff00;
          color: #1a1a1a;
          padding: 15px 30px;
          border: none;
          border-radius: 5px;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          text-transform: uppercase;
          transition: all 0.3s ease;
        " onmouseover="this.style.background='#00cc00'" onmouseout="this.style.background='#00ff00'">
          Continue to Official Survey →
        </button>
        
        <div id="modal-survey-instructions" style="display: none; margin-top: 30px; background: #2a2a2a; padding: 25px; border-radius: 10px; border: 2px solid #00ff00;">
          <h4 style="color: #00ff00; margin-bottom: 20px; font-size: 20px;">
            Dorset Coast Forum Public Engagement Survey
          </h4>
          
          <div style="background: #1a1a1a; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <p style="color: #ccc; margin-bottom: 15px;">
              The Dorset Coast Forum has launched a public engagement survey to gather community input on the Shore Road improvements. The survey contains approximately 30 questions covering various aspects including green spaces, pedestrian safety, and traffic management.
            </p>
            
            <div style="margin-left: 20px;">
              <p style="color: #fff; margin-bottom: 10px;">
                <strong style="color: #00ff00;">STEP 1:</strong> Answer Question 1 (Your connection to the area)
              </p>
              <p style="color: #fff; margin-bottom: 10px;">
                <strong style="color: #00ff00;">STEP 2:</strong> Skip directly to Question 24 - Select <strong>"Don't Know"</strong>
              </p>
              <p style="color: #fff; margin-bottom: 10px;">
                <strong style="color: #00ff00;">STEP 3:</strong> Go to Question 26 - Rank preferences in this order:
              </p>
              <div style="background: #333; padding: 15px; margin-left: 20px; border-left: 4px solid #00ff00;">
                <p style="color: #00ff00; margin: 5px 0;"><strong>1st Choice:</strong> Two-way traffic on Shore Road with removal of parking</p>
                <p style="color: #ccc; margin: 5px 0;"><strong>2nd Choice:</strong> Do nothing / keep Shore Road as it is</p>
                <p style="color: #ccc; margin: 5px 0;"><strong>3rd Choice:</strong> A one-way system on Shore Road - would <span style="color: #FFA500;">redirect significant</span> traffic</p>
                <p style="color: #ccc; margin: 5px 0;"><strong>4th Choice:</strong> Full closure of Shore Road - would redirect <span style="color: #ff0000;">traffic to residential streets</span></p>
              </div>
            </div>
            
            <p style="color: #00ff00; margin-top: 20px; font-weight: bold; text-align: center;">
              ⏱️ This takes only 30 seconds vs 30 minutes for the full survey<br>
              ✅ These 3 questions constitute a COMPLETE and VALID survey response
            </p>
          </div>
          
          <div style="background: #1a1a1a; padding: 15px; border-radius: 5px; margin-bottom: 10px;">
            <label style="display: flex; align-items: center; cursor: pointer; color: #fff;">
              <input type="checkbox" id="modal-understand-checkbox" style="margin-right: 10px; width: 20px; height: 20px; cursor: pointer;">
              <span style="font-size: 16px;">I understand the survey structure and am ready to proceed</span>
            </label>
          </div>
          
          <div style="background: #1a1a1a; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <label style="display: flex; align-items: center; cursor: pointer; color: #fff;">
              <input type="checkbox" id="modal-valid-survey-checkbox" style="margin-right: 10px; width: 20px; height: 20px; cursor: pointer;">
              <span style="font-size: 16px;">I understand that questions 1, 24, and 26 do constitute a valid and complete survey</span>
            </label>
          </div>
          
          <button id="modal-official-survey-btn" class="official-survey-btn" disabled style="
            width: 100%;
            background: #666;
            color: #999;
            padding: 20px;
            border: none;
            border-radius: 5px;
            font-size: 20px;
            font-weight: bold;
            cursor: not-allowed;
            text-transform: uppercase;
            transition: all 0.3s ease;
          ">
            Open Official Survey →
          </button>
        </div>
      </div>
    `;

    // Add fade-in animation
    modalContent.style.opacity = '0';
    setTimeout(() => {
      modalContent.style.transition = 'opacity 0.3s ease-in';
      modalContent.style.opacity = '1';
    }, 100);

    // Add event listeners for modal buttons and checkboxes
    const surveyContBtn = document.getElementById('modal-survey-continue-btn');
    if (surveyContBtn) {
      surveyContBtn.addEventListener('click', function() {
        if (typeof showModalSurveyInstructions === 'function') {
          showModalSurveyInstructions();
        } else if (typeof window.showModalSurveyInstructions === 'function') {
          window.showModalSurveyInstructions();
        } else {
          console.error('showModalSurveyInstructions function not found');
        }
      });
    }

    // Add event listeners for checkboxes
    const understandCheckbox = document.getElementById('modal-understand-checkbox');
    const validCheckbox = document.getElementById('modal-valid-survey-checkbox');
    
    if (understandCheckbox) {
      understandCheckbox.addEventListener('change', function() {
        if (typeof toggleModalSurveyButton === 'function') {
          toggleModalSurveyButton();
        } else if (typeof window.toggleModalSurveyButton === 'function') {
          window.toggleModalSurveyButton();
        } else {
          console.error('toggleModalSurveyButton function not found');
        }
      });
    }
    
    if (validCheckbox) {
      validCheckbox.addEventListener('change', function() {
        if (typeof toggleModalSurveyButton === 'function') {
          toggleModalSurveyButton();
        } else if (typeof window.toggleModalSurveyButton === 'function') {
          window.toggleModalSurveyButton();
        } else {
          console.error('toggleModalSurveyButton function not found');
        }
      });
    }

    // Add event listener for official survey button
    const officialSurveyBtn = document.getElementById('modal-official-survey-btn');
    if (officialSurveyBtn) {
      officialSurveyBtn.addEventListener('click', function() {
        if (!this.disabled) {
          if (typeof openOfficialSurvey === 'function') {
            openOfficialSurvey();
          } else if (typeof window.openOfficialSurvey === 'function') {
            window.openOfficialSurvey();
          } else {
            console.error('openOfficialSurvey function not found');
          }
        }
      });
    }

    // Store user comment for sharing
    const userComment = formData.comment;

    // Start animated counter in modal
    const modalCountDisplay = document.getElementById('modal-count-display');
    let modalCountUpdater = null;
    if (modalCountDisplay) {
      modalCountUpdater = createAnimatedPlaceholder(modalCountDisplay);
    }

    // Add share buttons immediately in disabled state
    addSocialShareButtons('modal-share-container', 0, userComment, true);

    // Wait a moment for database to update, then fetch fresh count
    setTimeout(async () => {
      const counterEl = document.querySelector('.counter-number');
      const newCount = await fetchRealCount();
      realCount = newCount; // Update global count

      // Update all count displays with fresh data
      counterEl.textContent = newCount;

      if (modalCountUpdater) {
        modalCountUpdater(newCount);
      }

      // Update submit button for consistency
      if (submitButtonUpdater) {
        submitButtonUpdater(newCount);
      }

      // Update social share buttons with real count and enable them
      addSocialShareButtons('modal-share-container', newCount, userComment, false);

      // Update live feed to show new signup
      await updateLiveFeed();
    }, 500);

  } catch (error) {
    // Re-enable submit button on error
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;

    // Check if it's an email duplication error
    if (error.message === 'email_exists' || (error.message && error.message.includes('email_exists'))) {
      // Handle email already registered error - show error in the modal
      messageEl.className = 'message error';
      messageEl.textContent = 'This email is already registered. Please use a different email address.';
      messageEl.style.display = 'block';
      showEmailError(); // This will also handle the modal email input
      return;
    }

    // Replace modal content with error state
    const modalContent = document.getElementById('modal-survey-content');
    modalContent.innerHTML = `
      <div class="modal-error-content" style="text-align: center; padding: 40px 20px;">
        <h3 style="color: #ff0000; font-size: 28px; margin-bottom: 20px; font-weight: 900;">
          ⚠️ UNEXPECTED ERROR
        </h3>
        <p style="font-size: 18px; color: #ff6666; margin-bottom: 30px; line-height: 1.5;">
          There has been an unexpected error.<br>
          Please contact Kai at Oceanheart.ai
        </p>
        <a href="mailto:kai@oceanheart.ai" style="
          display: inline-block;
          background: #ff0000;
          color: #fff;
          padding: 15px 30px;
          border-radius: 5px;
          text-decoration: none;
          font-weight: bold;
          text-transform: uppercase;
          font-size: 16px;
          transition: all 0.3s ease;
        " onmouseover="this.style.background='#cc0000'" onmouseout="this.style.background='#ff0000'">
          Tech Support
        </a>
      </div>
    `;

    // Add fade-in animation
    modalContent.style.opacity = '0';
    setTimeout(() => {
      modalContent.style.transition = 'opacity 0.3s ease-in';
      modalContent.style.opacity = '1';
    }, 100);
  } finally {
    // Re-enable submit button
    submitBtn.disabled = false;
    submitBtn.textContent = 'JOIN THE MOVEMENT!';
  }
}

// Handle continue to survey button in main confirmation
function initializeSurveyButton() {
  // Main form survey button
  const continueSurveyBtn = document.getElementById('continue-survey-btn');
  if (continueSurveyBtn) {
    continueSurveyBtn.addEventListener('click', function () {
      const confirmationDiv = document.getElementById('confirmation');
      if (confirmationDiv) {
        // Replace entire confirmation content with survey instructions
        confirmationDiv.innerHTML = `
          <div class="survey-instructions" style="margin: 0;">
            <h4 style="color: #00ff00; margin-bottom: 20px; font-size: 20px; text-align: center;">
              Dorset Council Consultation Survey
            </h4>
            
            <div class="survey-instructions-content">
              <p style="color: #ccc; margin-bottom: 15px;">
                The Dorset Council consultation survey contains approximately 30 questions covering various aspects of the Shore Road project, including green spaces, pedestrian improvements, and traffic management.
              </p>
              
              <p style="color: #ccc; margin-bottom: 15px;">
                If your primary concern is traffic safety, the most relevant questions are:
              </p>
              
              <div class="survey-step">
                <span class="survey-step-number">Q1:</span>
                <span>Your connection to the area</span>
              </div>
              
              <div class="survey-step">
                <span class="survey-step-number">Q24:</span>
                <span>Preferred scheme option (non-traffic related)</span>
              </div>
              
              <div class="survey-step">
                <span class="survey-step-number">Q26:</span>
                <div>
                  <span>Preferred traffic solutions</span>
                  <ul style="color: #999; font-size: 14px; margin-top: 10px; list-style-type: disc; margin-left: 20px;">
                    <li>Two-way with parking removal - <span style="color: #00ff00;">maintains current traffic flow patterns</span></li>
                    <li>Keep as is - no changes to current situation</li>
                    <li>One-way system - would redirect traffic to alternative routes</li>
                    <li>Full closure - <span style="color: red;">would redistribute all Shore Road traffic to other streets</span></li>
                  </ul>
                </div>
              </div>
              
              <p style="color: #ccc; margin-top: 20px; text-align: center;">
                Completion time varies from 30 seconds (traffic questions only) to 10-30 minutes (full survey).<br>
                You're free to answer any or all questions according to your interests and available time.
              </p>
            </div>
            
            <div class="survey-checkbox-container">
              <label style="display: flex; align-items: center; cursor: pointer; color: #fff;">
                <input type="checkbox" id="understand-checkbox-new" style="margin-right: 10px; width: 20px; height: 20px; cursor: pointer;">
                <span style="font-size: 16px;">I understand the survey structure and am ready to proceed</span>
              </label>
            </div>
            
            <button id="official-survey-btn-new" class="official-survey-btn" disabled style="
              width: 100%;
              background: #666;
              color: #999;
              padding: 20px;
              border: none;
              border-radius: 5px;
              font-size: 20px;
              font-weight: bold;
              cursor: not-allowed;
              text-transform: uppercase;
              transition: all 0.3s ease;
            ">
              Open Official Survey →
            </button>
          </div>
        `;

        // Re-attach event listeners to the new elements
        const newCheckbox = document.getElementById('understand-checkbox-new');
        const newButton = document.getElementById('official-survey-btn-new');

        if (newCheckbox && newButton) {
          newCheckbox.addEventListener('change', function () {
            if (this.checked) {
              newButton.disabled = false;
              newButton.style.background = '#00ff00';
              newButton.style.color = '#1a1a1a';
              newButton.style.cursor = 'pointer';
              newButton.onmouseover = function () { this.style.background = '#00cc00'; };
              newButton.onmouseout = function () { this.style.background = '#00ff00'; };
            } else {
              newButton.disabled = true;
              newButton.style.background = '#666';
              newButton.style.color = '#999';
              newButton.style.cursor = 'not-allowed';
              newButton.onmouseover = null;
              newButton.onmouseout = null;
            }
          });

          newButton.addEventListener('click', function () {
            if (!this.disabled) {
              window.open('https://www.dorsetcoasthaveyoursay.co.uk/swanage-green-seafront-stabilisation/surveys/swanage-green-seafront-survey-2025', '_blank');
            }
          });
        }

        confirmationDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }
}

// Check if DOM is already loaded for survey button initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSurveyButton);
} else {
  initializeSurveyButton();
}

// Track survey tab opened
let surveyTabOpened = false;
let lastSurveyOpenTime = 0;

// Track when survey is opened
const originalWindowOpen = window.open;
window.open = function(url, ...args) {
  if (url && url.includes('dorsetcoasthaveyoursay.co.uk')) {
    surveyTabOpened = true;
    lastSurveyOpenTime = Date.now();
  }
  return originalWindowOpen.call(window, url, ...args);
};

// Listen for when user returns to the page
document.addEventListener('visibilitychange', function() {
  if (!document.hidden && surveyTabOpened) {
    const isRegistered = localStorage.getItem('nstcg_registered') === 'true';
    const timeSinceSurveyOpen = Date.now() - lastSurveyOpenTime;
    
    // Only refresh if:
    // 1. User is registered
    // 2. At least 5 seconds have passed since survey was opened
    // 3. We haven't refreshed recently (prevent multiple refreshes)
    if (isRegistered && timeSinceSurveyOpen > 5000) {
      surveyTabOpened = false; // Reset flag to prevent multiple refreshes
      
      // Check if we need to update UI (form still visible means we should refresh)
      const formSection = document.querySelector('.form-section');
      const surveyButtons = document.querySelectorAll('.survey-btn, #continue-survey-btn');
      const hasVisibleSurveyElements = Array.from(surveyButtons).some(btn => 
        btn && getComputedStyle(btn).display !== 'none'
      );
      
      if (formSection || hasVisibleSurveyElements) {
        // Small delay to ensure smooth transition
        setTimeout(() => {
          location.reload();
        }, 500);
      }
    }
  }
});

// Generate simple user ID for referral tracking
function generateUserId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Social Sharing Functions
function generateShareText(count, userComment) {
  const baseMessage = `I just joined ${count} Neighbours fighting for safer streets in North Swanage! The proposed traffic changes could flood our residential streets with dangerous traffic.`;

  if (userComment) {
    return `${baseMessage} My reason: "${userComment}" Take action now:`;
  }

  return `${baseMessage} Take action before it's too late:`;
}

// Social codes now handled by ReferralUtils

async function getShareUrl(platform = 'direct') {
  // Get or generate referral code using centralized logic (now async)
  const referralCode = await window.ReferralUtils.getUserReferralCode();

  // Use shared utility to generate URL
  return window.ReferralUtils.generateShareUrl(referralCode, platform);
}

async function shareOnTwitter(count, userComment) {
  const text = generateShareText(count, userComment);
  const url = await getShareUrl('twitter');
  const hashtags = 'SaveNorthSwanage,TrafficSafety';
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${hashtags}`;
  window.open(twitterUrl, '_blank', 'width=550,height=420');
}

async function shareOnFacebook() {
  const url = await getShareUrl('facebook');
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  window.open(facebookUrl, '_blank', 'width=550,height=420');
}

async function shareOnWhatsApp(count, userComment) {
  const text = generateShareText(count, userComment);
  const url = await getShareUrl('whatsapp');
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
  window.open(whatsappUrl, '_blank');
}

async function shareOnLinkedIn(count, userComment) {
  const text = generateShareText(count, userComment);
  const url = await getShareUrl('linkedin');
  // LinkedIn shareActive only supports text parameter - include URL within text
  const fullText = `${text} ${url}`;
  const linkedInUrl = `https://www.linkedin.com/feed/?shareActive&mini=true&text=${encodeURIComponent(fullText)}`;
  window.open(linkedInUrl, '_blank', 'width=550,height=520');
}

async function shareOnInstagram() {
  const url = await getShareUrl('instagram');

  // Copy to clipboard
  navigator.clipboard.writeText(url).then(() => {
    // Show toast notification
    showToast('Link copied! Share on Instagram Stories or Bio');
  }).catch(() => {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showToast('Link copied! Share on Instagram Stories or Bio');
  });
}

// Toast notification function
function showToast(message) {
  // Remove any existing toast
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  // Create new toast
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.innerHTML = `
    <i class="fas fa-check-circle"></i>
    <span>${message}</span>
  `;

  document.body.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}


// Calculate running costs since campaign start
function calculateRunningCosts() {
  const startDate = new Date('2025-06-14');
  const now = new Date();

  // If campaign hasn't started yet, return 0
  if (now < startDate) {
    return 0;
  }

  // Calculate time elapsed since campaign start
  const timeElapsed = now - startDate;
  const daysElapsed = timeElapsed / (1000 * 60 * 60 * 24);
  const monthsElapsed = daysElapsed / 30.4375; // Average days per month

  // Constants matching donate.js
  const upfrontCosts = 525; // Software (£425) + Materials (£100)
  const monthlyEngCost = 5000; // Engineering, Research & Development per month

  // Calculate total cost: upfront + pro-rata engineering
  const engineeringCost = monthsElapsed * monthlyEngCost;
  const totalCosts = Math.floor(upfrontCosts + engineeringCost);

  return totalCosts;
}

// Fetch and display donation totals
async function loadFinancialStatus() {
  try {
    let donationData = { total: 0, count: 0 };

    // Get donations (only if feature is enabled)
    if (!window.featureFlags || window.featureFlags.shouldFetchDonationTotals()) {
      const donationRes = await fetch('/api/get-total-donations');
      donationData = await donationRes.json();
    }

    // Calculate costs (only if feature is enabled)
    const runningCosts = (!window.featureFlags || window.featureFlags.shouldShowCampaignCosts())
      ? calculateRunningCosts()
      : 0;

    // Remove loading state from all financial content
    document.querySelectorAll('.financial-content.loading').forEach(el => {
      el.classList.remove('loading');
    });

    // Update UI
    const costsEl = document.getElementById('campaign-costs');
    const donationsEl = document.getElementById('total-donations');
    const donationCountEl = document.getElementById('donation-count');
    const balanceEl = document.getElementById('campaign-balance');
    const statusEl = document.getElementById('balance-status');

    if (costsEl) costsEl.textContent = `£${runningCosts.toLocaleString()}`;
    if (donationsEl) donationsEl.textContent = `£${donationData.total.toLocaleString()}`;
    if (donationCountEl) donationCountEl.textContent = donationData.count;

    // Calculate balance
    const balance = donationData.total - runningCosts;
    if (balanceEl) balanceEl.textContent = `£${Math.abs(balance).toLocaleString()}`;

    // Update status
    if (statusEl) {
      if (balance > 0) {
        statusEl.textContent = 'In surplus';
        statusEl.style.color = '#00ff00';
      } else if (balance < 0) {
        statusEl.textContent = 'Needs support';
        statusEl.style.color = '#ff6b6b';
      } else {
        statusEl.textContent = 'Breaking even';
        statusEl.style.color = 'var(--color-gray-light)';
      }
    }
  } catch (error) {
    console.error('Error loading financial status:', error);
    // Remove loading state even on error
    document.querySelectorAll('.financial-content.loading').forEach(el => {
      el.classList.remove('loading');
    });
    // Show error state
    const statusEl = document.getElementById('balance-status');
    if (statusEl) {
      statusEl.textContent = 'Unable to load';
      statusEl.style.color = '#ff6b6b';
    }
  }
}

async function shareByEmail(count, userComment) {
  const subject = 'Urgent: North Swanage Traffic Concern Group - We Need Your Help!';
  const text = generateShareText(count, userComment);
  const url = await getShareUrl('email');
  const body = `${text}

Visit: ${url}

The North Swanage Traffic Concern Group is raising awareness about proposed traffic changes that could turn Shore Road into a one-way system, pushing dangerous levels of traffic onto our quiet residential streets. This affects everyone - our children's safety, property values, and quality of life.

Please take 2 minutes to join us and share with other Neighbours. Time is running out!`;

  const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  // Try multiple methods to ensure it works
  try {
    // Method 1: Direct navigation
    window.location.href = mailtoUrl;
  } catch (e) {
    // Method 2: Create temporary link and click it
    const link = document.createElement('a');
    link.href = mailtoUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => document.body.removeChild(link), 100);
  }

  // Prevent any default behavior or modal closing
  return false;
}

async function shareNative(count, userComment) {
  const text = generateShareText(count, userComment);
  const url = await getShareUrl('direct');
  const shareData = {
    title: 'North Swanage Traffic Crisis',
    text: text,
    url: url
  };

  try {
    await navigator.share(shareData);
    // Track successful share if analytics are implemented
  } catch (err) {
    console.log('Share cancelled or failed:', err);
  }
}

function addSocialShareButtons(containerId, count, userComment, isDisabled = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Check if share section already exists
  let shareSection = container.querySelector('.social-share-section');
  if (!shareSection) {
    shareSection = document.createElement('div');
    shareSection.className = 'social-share-section';
    container.appendChild(shareSection);
  }

  const disabledAttr = isDisabled ? 'disabled' : '';
  const disabledStyle = isDisabled ? 'opacity: 0.5; cursor: not-allowed;' : '';

  // Unified icon-based buttons for both mobile and desktop
  shareSection.innerHTML = `
    <h4 class="social-share-title">🔊 Spread the Word - Every Share Matters!</h4>
    <div class="social-share-buttons-icons">
      <button class="share-btn-icon facebook" 
              title="Share on Facebook"
              ${disabledAttr}
              ${!isDisabled ? `onclick="shareOnFacebook()"` : ''}>
        <i class="fab fa-facebook-f"></i>
      </button>
      <button class="share-btn-icon twitter" 
              title="Share on X (Twitter)"
              ${disabledAttr}
              ${!isDisabled ? `onclick="shareOnTwitter(${count}, ${userComment ? `'${userComment.replace(/'/g, "\\'")}'` : 'null'})"` : ''}>
        <i class="fab fa-x-twitter"></i>
      </button>
      <button class="share-btn-icon whatsapp" 
              title="Share on WhatsApp"
              ${disabledAttr}
              ${!isDisabled ? `onclick="shareOnWhatsApp(${count}, ${userComment ? `'${userComment.replace(/'/g, "\\'")}'` : 'null'})"` : ''}>
        <i class="fab fa-whatsapp"></i>
      </button>
      <button class="share-btn-icon linkedin" 
              title="Share on LinkedIn"
              ${disabledAttr}
              ${!isDisabled ? `onclick="shareOnLinkedIn(${count}, ${userComment ? `'${userComment.replace(/'/g, "\\'")}'` : 'null'})"` : ''}>
        <i class="fab fa-linkedin-in"></i>
      </button>
      <button class="share-btn-icon instagram" 
              title="Copy link for Instagram"
              ${disabledAttr}
              ${!isDisabled ? `onclick="shareOnInstagram()"` : ''}>
        <i class="fab fa-instagram"></i>
      </button>
      <button class="share-btn-icon email" 
              title="Share via Email"
              ${disabledAttr}
              ${!isDisabled ? `onclick="shareByEmail(${count}, ${userComment ? `'${userComment.replace(/'/g, "\\'")}'` : 'null'})"` : ''}>
        <i class="fas fa-envelope"></i>
      </button>
    </div>
    <p class="share-impact-text">${isDisabled ? 'Preparing share options...' : 'Your voice amplifies our message. Together we\'re stronger! 💪'}</p>
  `;
}

// Handle email activation from campaign
async function handleEmailActivation(email, bonusPoints) {
  console.log('Handling email activation for:', email);
  debugLogger.info('handleEmailActivation called', { email, bonusPoints });
  
  try {
    // Decode email
    const decodedEmail = decodeURIComponent(email);
    const points = parseInt(bonusPoints, 10);
    
    // Validate bonus points
    if (isNaN(points) || points < 10 || points > 50) {
      console.error('Invalid bonus points:', bonusPoints);
      return;
    }
    
    // Check if MicroModal is available
    if (typeof MicroModal === 'undefined') {
      console.error('MicroModal not loaded yet');
      setTimeout(() => handleEmailActivation(email, bonusPoints), 500);
      return;
    }
    
    // Clean URL to remove parameters
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
    
    // Show activation modal
    debugLogger.info('Showing activation modal');
    MicroModal.show('modal-activation');
    
    // Update bonus points display
    const bonusDisplay = document.getElementById('activation-bonus-points');
    if (bonusDisplay) {
      bonusDisplay.textContent = points;
    }
    
    // Store email for form submission
    window.activationEmail = decodedEmail;
    window.activationBonus = points;
    
  } catch (error) {
    console.error('Error handling email activation:', error);
  }
}

// Handle activation form submission
async function handleActivationSubmit(event) {
  event.preventDefault();
  
  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const visitorType = form.querySelector('input[name="visitor_type"]:checked')?.value;
  
  if (!visitorType) {
    alert('Please select whether you are a local resident or visitor');
    return;
  }
  
  if (!window.activationEmail || !window.activationBonus) {
    console.error('Missing activation data');
    return;
  }
  
  // Disable form
  submitBtn.disabled = true;
  submitBtn.textContent = 'Activating...';
  
  // Show processing state
  const activationForm = document.getElementById('activation-form');
  const processingDiv = document.getElementById('activation-processing');
  const successDiv = document.getElementById('activation-success');
  
  activationForm.style.display = 'none';
  processingDiv.style.display = 'block';
  
  try {
    // Call activation API
    const response = await fetch('/api/activate-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: window.activationEmail,
        visitor_type: visitorType,
        bonusPoints: window.activationBonus
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Activation failed');
    }
    
    const result = await response.json();
    
    // Store user data in localStorage
    if (result.userData) {
      localStorage.setItem('nstcg_user_id', result.userData.user_id);
      localStorage.setItem('nstcg_email', result.userData.email);
      localStorage.setItem('nstcg_registered', 'true');
      localStorage.setItem('nstcg_referral_code', result.userData.referral_code || '');
      localStorage.setItem('nstcg_first_name', result.userData.first_name || '');
      localStorage.setItem('nstcg_comment', result.userData.comment || '');
      localStorage.setItem('nstcg_visitor_type', result.userData.visitor_type);
      
      // Show success state
      processingDiv.style.display = 'none';
      successDiv.style.display = 'block';
      
      // Update success message with referral code
      const referralCodeDisplay = document.getElementById('activation-referral-code');
      if (referralCodeDisplay && result.userData.referral_code) {
        referralCodeDisplay.textContent = result.userData.referral_code;
      }
      
      // Reload page after 3 seconds
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    }
    
  } catch (error) {
    console.error('Activation error:', error);
    
    // Show error state
    processingDiv.style.display = 'none';
    activationForm.style.display = 'block';
    
    // Re-enable form
    submitBtn.disabled = false;
    submitBtn.textContent = 'Activate & Claim Points';
    
    // Show error message
    alert('Activation failed: ' + error.message + '\nPlease try again or contact support.');
  }
}

// Modal survey instructions functions
function showModalSurveyInstructions() {
  const modalContent = document.getElementById('modal-survey-content');
  if (modalContent) {
    // Replace entire modal content with just the instructions
    modalContent.innerHTML = `
      <div style="padding: 10px;">
        <h4 style="color: #00ff00; margin-bottom: 20px; font-size: 20px; text-align: center;">
          Dorset Coast Forum Public Engagement Survey
        </h4>
        
        <div class="survey-instructions-content">
          <p style="color: #ccc; margin-bottom: 15px;">
            The Dorset Coast Forum has launched a public engagement survey to gather community input on the Shore Road improvements. The survey contains approximately 30 questions covering various aspects including green spaces, pedestrian safety, and traffic management.
          </p>
          
          <p style="color: #ccc; margin-bottom: 15px;">
            If your primary concern is traffic safety, the most relevant questions are:
          </p>
          
          <div class="survey-step">
            <span class="survey-step-number">Q1:</span>
            <span>Your connection to the area</span>
          </div>
          
          <div class="survey-step">
            <span class="survey-step-number">Q24:</span>
            <span>Preferred scheme option (non-traffic related)</span>
          </div>
          
          <div class="survey-step">
            <span class="survey-step-number">Q26:</span>
            <div>
              <span>Preferred traffic solutions</span>
              <ul style="color: #999; font-size: 14px; margin-top: 10px; list-style-type: disc; margin-left: 20px;">
                <li>Two-way with parking removal - <span style="color: #00ff00;">maintains current traffic flow patterns</span></li>
                <li>Keep as is - no changes to current situation</li>
                <li>One-way system - would <span style="color: #FFA500;">redirect significant</span> traffic to alternative routes</li>
                <li>Full closure - would redirect <span style="color: red;">traffic to residential streets</span></li>
              </ul>
            </div>
          </div>
          
          <p style="color: #ccc; margin-top: 20px; text-align: center;">
            Completion time varies from 30 seconds (traffic questions only) to 10-30 minutes (full survey).<br>
            You're free to answer any or all questions according to your interests and available time.
          </p>
        </div>
        
        <div class="survey-checkbox-container" style="margin-bottom: 10px;">
          <label style="display: flex; align-items: center; cursor: pointer; color: #fff;">
            <input type="checkbox" id="modal-understand-checkbox" style="margin-right: 10px; width: 20px; height: 20px; cursor: pointer;">
            <span style="font-size: 16px;">I understand the survey structure and am ready to proceed</span>
          </label>
        </div>
        
        <div class="survey-checkbox-container">
          <label style="display: flex; align-items: center; cursor: pointer; color: #fff;">
            <input type="checkbox" id="modal-valid-survey-checkbox" style="margin-right: 10px; width: 20px; height: 20px; cursor: pointer;">
            <span style="font-size: 16px;">I understand that questions 1, 24, and 26 do constitute a valid and complete survey</span>
          </label>
        </div>
        
        <button id="modal-official-survey-btn" class="official-survey-btn" disabled style="
          width: 100%;
          background: #666;
        color: #999;
          padding: 20px;
          border: none;
          border-radius: 5px;
          font-size: 20px;
          font-weight: bold;
          cursor: not-allowed;
          text-transform: uppercase;
          transition: all 0.3s ease;
        ">
          Open Official Survey →
        </button>
      </div>
    `;
    
    // Add event listeners for the checkboxes and button
    const understandCheckbox = document.getElementById('modal-understand-checkbox');
    const validCheckbox = document.getElementById('modal-valid-survey-checkbox');
    const officialSurveyBtn = document.getElementById('modal-official-survey-btn');
    
    if (understandCheckbox) {
      understandCheckbox.addEventListener('change', function() {
        if (typeof toggleModalSurveyButton === 'function') {
          toggleModalSurveyButton();
        } else if (typeof window.toggleModalSurveyButton === 'function') {
          window.toggleModalSurveyButton();
        } else {
          console.error('toggleModalSurveyButton function not found');
        }
      });
    }
    
    if (validCheckbox) {
      validCheckbox.addEventListener('change', function() {
        if (typeof toggleModalSurveyButton === 'function') {
          toggleModalSurveyButton();
        } else if (typeof window.toggleModalSurveyButton === 'function') {
          window.toggleModalSurveyButton();
        } else {
          console.error('toggleModalSurveyButton function not found');
        }
      });
    }
    
    if (officialSurveyBtn) {
      officialSurveyBtn.addEventListener('click', function() {
        if (!this.disabled) {
          if (typeof openOfficialSurvey === 'function') {
            openOfficialSurvey();
          } else if (typeof window.openOfficialSurvey === 'function') {
            window.openOfficialSurvey();
          } else {
            console.error('openOfficialSurvey function not found');
          }
        }
      });
    }
  }
}

function toggleModalSurveyButton() {
  const checkbox1 = document.getElementById('modal-understand-checkbox');
  const checkbox2 = document.getElementById('modal-valid-survey-checkbox');
  const button = document.getElementById('modal-official-survey-btn');

  if (checkbox1 && checkbox2 && button) {
    if (checkbox1.checked && checkbox2.checked) {
      button.disabled = false;
      button.style.background = '#00ff00';
      button.style.color = '#1a1a1a';
      button.style.cursor = 'pointer';
      button.onmouseover = function () { this.style.background = '#00cc00'; };
      button.onmouseout = function () { this.style.background = '#00ff00'; };
    } else {
      button.disabled = true;
      button.style.background = '#666';
      button.style.color = '#999';
      button.style.cursor = 'not-allowed';
      button.onmouseover = null;
      button.onmouseout = null;
    }
  }
}

function openOfficialSurvey() {
  window.open('https://www.dorsetcoasthaveyoursay.co.uk/swanage-green-seafront-stabilisation/surveys/swanage-green-seafront-survey-2025?ref=nstcg', '_blank');
}
// Expose functions globally for inline event handlers and external usage
window.updateCountdown = updateCountdown;
window.generateReferralCode = generateReferralCode;
window.showModalSurveyInstructions = showModalSurveyInstructions;
window.toggleModalSurveyButton = toggleModalSurveyButton;
window.openOfficialSurvey = openOfficialSurvey;
window.addSocialShareButtons = addSocialShareButtons;
window.showToast = showToast;

// Note: Social sharing functions are already exposed in main-entry.js


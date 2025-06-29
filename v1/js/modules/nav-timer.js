/**
 * Navigation Timer Module
 * Handles countdown timer functionality for both navigation and alert header
 */

// Timer deadline
const DEADLINE = new Date('2025-06-29T23:59:59+01:00'); // BST (British Summer Time)

// Timer state
let timerInterval = null;
let isRunning = false;

/**
 * Calculate time remaining
 * @returns {Object} Time components or null if expired
 */
function calculateTimeRemaining() {
  const now = new Date().getTime();
  const timeLeft = DEADLINE - now;
  
  if (timeLeft < 0) {
    return null; // Timer expired
  }
  
  return {
    days: Math.floor(timeLeft / (1000 * 60 * 60 * 24)),
    hours: Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((timeLeft % (1000 * 60)) / 1000),
    totalHours: Math.floor(timeLeft / (1000 * 60 * 60))
  };
}

/**
 * Get timer color based on hours remaining
 * @param {number} totalHours - Total hours remaining
 * @returns {string} Color class name
 */
function getTimerColor(totalHours) {
  if (totalHours <= 1) return 'timer-red';
  if (totalHours <= 12) return 'timer-orange';
  if (totalHours <= 24) return 'timer-amber';
  return 'timer-yellow';
}

/**
 * Should timer blink based on time remaining
 * @param {number} totalHours - Total hours remaining
 * @returns {boolean}
 */
function shouldBlink(totalHours) {
  return totalHours <= 1;
}

/**
 * Update timer display
 * @param {Object} options - Configuration options
 */
function updateTimer(options = {}) {
  const {
    daysSelector = '.nav-timer-days',
    hoursSelector = '.nav-timer-hours',
    minutesSelector = '.nav-timer-minutes',
    secondsSelector = '.nav-timer-seconds',
    containerSelector = '.nav-timer-container',
    coloredTimer = false,
    timerBlink = false
  } = options;
  
  const timeRemaining = calculateTimeRemaining();
  
  if (!timeRemaining) {
    // Handle expired state
    const containers = document.querySelectorAll(containerSelector);
    containers.forEach(container => {
      container.innerHTML = '<span class="timer-expired">Consultation Closed</span>';
    });
    stopTimer();
    return;
  }
  
  // Update time values
  const daysEl = document.querySelector(daysSelector);
  const hoursEl = document.querySelector(hoursSelector);
  const minutesEl = document.querySelector(minutesSelector);
  const secondsEl = document.querySelector(secondsSelector);
  
  if (daysEl) daysEl.textContent = timeRemaining.days.toString().padStart(2, '0');
  if (hoursEl) hoursEl.textContent = timeRemaining.hours.toString().padStart(2, '0');
  if (minutesEl) minutesEl.textContent = timeRemaining.minutes.toString().padStart(2, '0');
  if (secondsEl) secondsEl.textContent = timeRemaining.seconds.toString().padStart(2, '0');
  
  // Apply color and blink features
  const container = document.querySelector(containerSelector);
  if (container) {
    // Remove all color classes
    container.classList.remove('timer-yellow', 'timer-amber', 'timer-orange', 'timer-red', 'timer-blink');
    
    if (coloredTimer) {
      const colorClass = getTimerColor(timeRemaining.totalHours);
      container.classList.add(colorClass);
      
      if (timerBlink && shouldBlink(timeRemaining.totalHours)) {
        container.classList.add('timer-blink');
      }
    }
  }
}

/**
 * Start the timer
 * @param {Object} options - Timer configuration
 */
export function startTimer(options = {}) {
  if (isRunning) return;
  
  // Initial update
  updateTimer(options);
  
  // Update every second
  timerInterval = setInterval(() => updateTimer(options), 1000);
  isRunning = true;
}

/**
 * Stop the timer
 */
export function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  isRunning = false;
}

/**
 * Create timer HTML for navigation
 * @returns {string} Timer HTML
 */
export function createNavTimerHTML() {
  return `
    <div class="nav-timer-container">
      <div class="nav-timer-unit">
        <span class="nav-timer-value nav-timer-days">00</span>
        <span class="nav-timer-label">Days</span>
      </div>
      <div class="nav-timer-separator">:</div>
      <div class="nav-timer-unit">
        <span class="nav-timer-value nav-timer-hours">00</span>
        <span class="nav-timer-label">Hours</span>
      </div>
      <div class="nav-timer-separator">:</div>
      <div class="nav-timer-unit">
        <span class="nav-timer-value nav-timer-minutes">00</span>
        <span class="nav-timer-label">Min</span>
      </div>
      <div class="nav-timer-separator">:</div>
      <div class="nav-timer-unit">
        <span class="nav-timer-value nav-timer-seconds">00</span>
        <span class="nav-timer-label">Sec</span>
      </div>
    </div>
  `;
}

// Export functions
export default {
  startTimer,
  stopTimer,
  createNavTimerHTML,
  calculateTimeRemaining,
  getTimerColor,
  shouldBlink
};
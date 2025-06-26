// Configuration - will be set from environment
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51QZgM4P3L7nNQoJxo8aRJfMpRoSJHPOcSmUEKlLWHT9HvWAqGRIc8RTgsVsBZgJvQAbnZvlCLBdQGJ07AHqCa3kM00j0AEUgGi'; // TODO: Replace with live key
const CAMPAIGN_START_DATE = new Date('2025-06-14');
const UPFRONT_COSTS = 525; // Software (£425) + Materials (£100)
const MONTHLY_ENG_COST = 5000; // Engineering, Research & Development per month

// State
let selectedAmount = 0;
let isProcessing = false;
let stripe = null;

// Initialize Stripe when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Initialize Stripe
  if (typeof Stripe !== 'undefined') {
    stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
  } else {
    console.error('Stripe library not loaded');
    showError('Payment system unavailable. Please try again later.');
  }
  
  // Check URL parameters for success/cancel
  checkUrlParams();
  
  // Initialize cost counter (if enabled)
  if (!window.DISABLE_COST_COUNTER) {
    updateCostCounter();
    setInterval(updateCostCounter, 1000); // Update every second for real-time feel
  }
  
  // Load recent donations (if enabled)
  if (!window.donateFeatureFlags || window.donateFeatureFlags.shouldLoadRecentDonations()) {
    loadRecentDonations();
    setInterval(loadRecentDonations, 30000); // Refresh every 30 seconds
  }
  
  // Load total donations (if enabled)
  if (!window.donateFeatureFlags || window.donateFeatureFlags.shouldLoadTotalDonations()) {
    loadTotalDonations();
    setInterval(loadTotalDonations, 5 * 60 * 1000); // Refresh every 5 minutes
  }
  
  // Setup event listeners
  setupEventListeners();
});

// Cost Counter
function calculateCampaignCost() {
  const now = new Date();
  
  // If campaign hasn't started yet, return 0
  if (now < CAMPAIGN_START_DATE) {
    return 0;
  }
  
  // Calculate time elapsed since campaign start
  const timeElapsed = now - CAMPAIGN_START_DATE;
  const daysElapsed = timeElapsed / (1000 * 60 * 60 * 24);
  const monthsElapsed = daysElapsed / 30.4375; // Average days per month
  
  // Calculate total cost: upfront + pro-rata engineering
  const engineeringCost = monthsElapsed * MONTHLY_ENG_COST;
  const totalCost = UPFRONT_COSTS + engineeringCost;
  
  // Return in pence for precision
  return Math.floor(totalCost * 100);
}

function updateCostCounter() {
  const costInPence = calculateCampaignCost();
  const costInPounds = costInPence / 100;
  const costElement = document.getElementById('cost-amount');
  
  if (costElement) {
    // Format with pounds and pence
    costElement.textContent = costInPounds.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}

function animateValue(element, start, end, duration) {
  const startTime = Date.now();
  const endTime = startTime + duration;
  
  function update() {
    const now = Date.now();
    const progress = Math.min((now - startTime) / duration, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3); // Cubic easing
    const current = Math.floor(start + (end - start) * easedProgress);
    
    element.textContent = current.toLocaleString('en-GB');
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  
  requestAnimationFrame(update);
}

// Event Listeners
function setupEventListeners() {
  // Amount selection buttons
  document.querySelectorAll('.amount-btn').forEach(btn => {
    btn.addEventListener('click', handleAmountSelection);
  });
  
  // Custom amount input
  const customAmountInput = document.getElementById('custom-amount');
  if (customAmountInput) {
    customAmountInput.addEventListener('input', handleCustomAmount);
  }
  
  // Form submission
  const donationForm = document.getElementById('donation-form');
  if (donationForm) {
    donationForm.addEventListener('submit', handleFormSubmit);
  }
}

// Amount Selection
function handleAmountSelection(e) {
  // Remove active class from all buttons
  document.querySelectorAll('.amount-btn').forEach(btn => 
    btn.classList.remove('active'));
  
  // Add active class to clicked button
  e.target.classList.add('active');
  
  const amount = e.target.dataset.amount;
  
  if (amount === 'other') {
    // Show custom amount input
    document.querySelector('.custom-amount').style.display = 'block';
    const customInput = document.getElementById('custom-amount');
    customInput.focus();
    // Don't update amount yet - wait for input
  } else {
    // Hide custom amount input
    document.querySelector('.custom-amount').style.display = 'none';
    selectedAmount = parseInt(amount);
    updateDonateButton();
    updatePointsPreview();
  }
}

function handleCustomAmount(e) {
  const amount = parseInt(e.target.value) || 0;
  if (amount >= 1 && amount <= 1000) {
    selectedAmount = amount;
    updateDonateButton();
    updatePointsPreview();
  } else if (amount > 1000) {
    e.target.value = 1000;
    selectedAmount = 1000;
    updateDonateButton();
    updatePointsPreview();
  } else {
    selectedAmount = 0;
    updateDonateButton();
    updatePointsPreview();
  }
}

// Update UI elements
function updateDonateButton() {
  const btn = document.querySelector('.donate-btn');
  const amountSpan = document.getElementById('selected-amount');
  
  if (selectedAmount > 0) {
    btn.disabled = false;
    amountSpan.textContent = selectedAmount;
  } else {
    btn.disabled = true;
    amountSpan.textContent = '0';
  }
}

function calculatePoints(amount) {
  return amount * 5;
}

function updatePointsPreview() {
  const points = calculatePoints(selectedAmount);
  const pointsElement = document.getElementById('points-preview');
  if (pointsElement) {
    pointsElement.textContent = points;
  }
}

// Form Submission
async function handleFormSubmit(e) {
  e.preventDefault();
  
  if (isProcessing || selectedAmount === 0 || !stripe) return;
  
  isProcessing = true;
  const submitBtn = document.querySelector('.donate-btn');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
  submitBtn.disabled = true;
  
  try {
    // Get form data
    const formData = new FormData(e.target);
    const data = {
      amount: selectedAmount * 100, // Convert to pence
      name: formData.get('name').trim(),
      email: formData.get('email').trim(),
      message: formData.get('message').trim(),
      user_id: localStorage.getItem('nstcg_user_id') || null
    };
    
    // Validate
    if (!data.name || !data.email) {
      throw new Error('Please fill in all required fields');
    }
    
    // Create checkout session
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create checkout session');
    }
    
    const { sessionId } = await response.json();
    
    // Redirect to Stripe Checkout
    const { error } = await stripe.redirectToCheckout({ sessionId });
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error:', error);
    showError(error.message || 'Something went wrong. Please try again.');
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  } finally {
    isProcessing = false;
  }
}

// Load Recent Donations
async function loadRecentDonations() {
  try {
    const response = await fetch('/api/get-donations?limit=10');
    if (!response.ok) throw new Error('Failed to fetch donations');
    
    const data = await response.json();
    const feed = document.getElementById('donations-feed');
    
    if (!feed) return;
    
    if (data.donations && data.donations.length > 0) {
      feed.innerHTML = data.donations.map((donation, index) => `
        <div class="donation-item animate__animated animate__fadeIn" style="animation-delay: ${index * 0.1}s">
          <div class="donation-amount">£${donation.amount}</div>
          <div class="donation-info">
            <div class="donation-name">${donation.name}</div>
            ${donation.message ? 
              `<div class="donation-message">"${escapeHtml(donation.message)}"</div>` : ''}
            <div class="donation-time">${getRelativeTime(donation.timestamp)}</div>
          </div>
        </div>
      `).join('');
    } else {
      feed.innerHTML = '<p class="no-donations">Be the first to donate!</p>';
    }
  } catch (error) {
    console.error('Error loading donations:', error);
    const feed = document.getElementById('donations-feed');
    if (feed) {
      feed.innerHTML = '<p class="error-text">Unable to load recent donations</p>';
    }
  }
}

// Helper Functions
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Check URL Parameters
function checkUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  
  if (urlParams.get('success') === 'true') {
    // Show success message
    showSuccess();
    // Clean URL
    window.history.replaceState({}, document.title, '/donate.html');
  } else if (urlParams.get('canceled') === 'true') {
    // Show cancellation message
    showCancellation();
    // Clean URL
    window.history.replaceState({}, document.title, '/donate.html');
  }
}

// Message Display
function showSuccess() {
  // Hide form section
  document.querySelector('.donation-form-section').style.display = 'none';
  // Show success message
  const successDiv = document.getElementById('donation-success');
  if (successDiv) {
    successDiv.style.display = 'block';
    successDiv.scrollIntoView({ behavior: 'smooth' });
  }
}

function showCancellation() {
  // Hide form section
  document.querySelector('.donation-form-section').style.display = 'none';
  // Show error message
  const errorDiv = document.getElementById('donation-error');
  if (errorDiv) {
    errorDiv.style.display = 'block';
    errorDiv.scrollIntoView({ behavior: 'smooth' });
  }
}

function showError(message) {
  // Create or update error message in form
  let errorDiv = document.querySelector('.form-error');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.className = 'form-error';
    const form = document.getElementById('donation-form');
    form.insertBefore(errorDiv, form.firstChild);
  }
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}

// Load Total Donations
async function loadTotalDonations() {
  try {
    console.log('Loading total donations...');
    const response = await fetch('/api/get-total-donations');
    if (!response.ok) throw new Error('Failed to fetch total');
    
    const data = await response.json();
    console.log('Total donations data:', data);
    
    // Hide loading, show display
    const loadingDiv = document.getElementById('total-donations-loading');
    const displayDiv = document.getElementById('total-donations-display');
    
    if (loadingDiv) loadingDiv.style.display = 'none';
    if (displayDiv) displayDiv.style.display = 'block';
    
    // Update values
    const totalValue = document.getElementById('total-donations-value');
    const totalCount = document.getElementById('total-donations-count');
    
    if (totalValue) {
      totalValue.textContent = data.total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    
    if (totalCount) {
      totalCount.textContent = data.count;
    }
    
    // Update progress bar (example: assume goal is £10,000)
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
      const goal = 10000; // £10,000 goal
      const percentage = Math.min((data.total / goal) * 100, 100);
      progressFill.style.width = percentage + '%';
    }
    
  } catch (error) {
    console.error('Error loading total donations:', error);
    // Keep showing loading state on error
  }
}
// Countdown Timer
function updateCountdown() {
  const deadline = new Date('2025-07-07T23:59:59');
  const now = new Date().getTime();
  const timeLeft = deadline - now;

  if (timeLeft < 0) {
    // Handle expired state
    const countdownElements = document.querySelectorAll('.header-countdown');
    countdownElements.forEach(el => {
      el.innerHTML = '<span style="color: #ff6b6b; font-weight: bold;">Consultation Closed</span>';
    });
    return;
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  // Update header countdown
  const daysEl = document.querySelector('.header-days');
  const hoursEl = document.querySelector('.header-hours');
  const minutesEl = document.querySelector('.header-minutes');
  const secondsEl = document.querySelector('.header-seconds');

  if (daysEl) daysEl.textContent = days.toString().padStart(2, '0');
  if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
  if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
  if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
}

setInterval(updateCountdown, 1000);
updateCountdown();

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

// Form Submission with Error Handling
document.getElementById('signupForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  // Get form data
  const formData = {
    name: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim(),
    timestamp: new Date().toISOString(),
    source: 'main_form'
  };

  try {
    // Submit to API
    await submitToNotion(formData);

    // Success - Hide form section
    document.querySelector('.form-section').style.display = 'none';

    // Show confirmation
    document.getElementById('confirmation').style.display = 'block';

    // Update counter with real count
    const counterEl = document.querySelector('.counter-number');
    const newCount = await fetchRealCount();
    realCount = newCount; // Update global count
    counterEl.textContent = newCount;
    
    // Update confirmation message with real count
    const confirmationCountEl = document.getElementById('confirmation-count');
    if (confirmationCountEl) {
      confirmationCountEl.textContent = newCount;
    }
    
    // Update submit button for consistency
    const submitBtnText = document.getElementById('submit-btn-text');
    if (submitBtnText) {
      submitBtnText.textContent = `JOIN ${newCount} NEIGHBORS NOW`;
    }

    // Scroll to confirmation
    document.getElementById('confirmation').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
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

// Function to fetch real count from API
async function fetchRealCount() {
  try {
    const response = await fetch('/api/get-count');
    if (response.ok) {
      const data = await response.json();
      return data.count;
    }
  } catch (error) {
    console.error('Error fetching count:', error);
  }
  return 603; // Default fallback
}

// Global variable to store the real count
let realCount = null;

// Fetch and update all count displays
async function initializeCounts() {
  // Fetch the real count
  realCount = await fetchRealCount();
  
  // Update the submit button text
  const submitBtnText = document.getElementById('submit-btn-text');
  if (submitBtnText) {
    submitBtnText.textContent = `JOIN ${realCount} NEIGHBORS NOW`;
  }
  
  // Update confirmation count (in case it's visible)
  const confirmationCount = document.getElementById('confirmation-count');
  if (confirmationCount) {
    confirmationCount.textContent = realCount;
  }
  
  // Animate the main counter
  animateCounterFromZero(realCount);
}

// Separate function for counter animation
function animateCounterFromZero(end) {
  let start = 0;
  const duration = 2000;
  const startTime = Date.now();
  const counterEl = document.querySelector('.counter-number');

  function animate() {
    const currentTime = Date.now();
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    const current = Math.floor(start + (end - start) * progress);
    counterEl.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  animate();
}

// Initialize counts on page load
window.addEventListener('load', async function () {
  // Initialize all counts immediately
  await initializeCounts();

  // Update count every 30 seconds
  setInterval(async () => {
    realCount = await fetchRealCount();
    const counterEl = document.querySelector('.counter-number');
    if (counterEl) {
      counterEl.textContent = realCount;
    }
    // Also update submit button
    const submitBtnText = document.getElementById('submit-btn-text');
    if (submitBtnText) {
      submitBtnText.textContent = `JOIN ${realCount} NEIGHBORS NOW`;
    }
  }, 30000);

  // Show map after a delay
  setTimeout(() => {
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      mapContainer.innerHTML = `
        <div class="map-image">
          <img src="images/impact_non_sat_height.png" alt="Map of North Swanage">
          <div class="impact-overlay"></div>
        </div>
      `;
    }
  }, 1000);
});

// Store original modal content for reset
let originalModalContent;

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function () {
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
      }
    }
  });

  // Attach event listener to form
  document.getElementById('surveyModalForm').addEventListener('submit', handleModalFormSubmit);
});

// Extract form submission handler to a named function
async function handleModalFormSubmit(e) {
  e.preventDefault();

  const messageEl = document.getElementById('modalMessage');
  const submitBtn = this.querySelector('.modal-submit-btn');

  // Get form data
  const formData = {
    name: document.getElementById('modalName').value.trim(),
    email: document.getElementById('modalEmail').value.trim(),
    timestamp: new Date().toISOString(),
    source: 'survey_modal'
  };

  // Basic validation
  if (!formData.name || !formData.email) {
    messageEl.className = 'message error';
    messageEl.textContent = 'Please fill in all fields.';
    messageEl.style.display = 'block';
    return;
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.email)) {
    messageEl.className = 'message error';
    messageEl.textContent = 'Please enter a valid email address.';
    messageEl.style.display = 'block';
    return;
  }

  // Disable submit button and show loading state
  submitBtn.disabled = true;
  submitBtn.textContent = 'SUBMITTING...';
  messageEl.style.display = 'none';

  try {
    // Submit to API
    await submitToNotion(formData);

    // Update main counter with real count
    const counterEl = document.querySelector('.counter-number');
    const newCount = await fetchRealCount();
    realCount = newCount; // Update global count
    counterEl.textContent = newCount;
    
    // Update submit button for consistency
    const submitBtnText = document.getElementById('submit-btn-text');
    if (submitBtnText) {
      submitBtnText.textContent = `JOIN ${newCount} NEIGHBORS NOW`;
    }

    // Replace modal content with success message
    const modalContent = document.getElementById('modal-survey-content');
    modalContent.innerHTML = `
      <div class="modal-success-content" style="text-align: center; padding: 40px 20px;">
        <h3 style="color: #00ff00; font-size: 28px; margin-bottom: 20px; font-weight: 900;">
          ✓ WELCOME TO THE MOVEMENT!
        </h3>
        <p style="font-size: 18px; color: #ccc; margin-bottom: 20px; line-height: 1.5;">
          You are now part of ${counterEl.textContent} neighbors fighting for safer streets.<br>
          Together, we're making North Swanage better for everyone.
        </p>
        <p style="color: #00ff00; font-weight: bold; font-size: 16px;">
          Check your email for community updates.
        </p>
      </div>
    `;

    // Add fade-in animation
    modalContent.style.opacity = '0';
    setTimeout(() => {
      modalContent.style.transition = 'opacity 0.3s ease-in';
      modalContent.style.opacity = '1';
    }, 100);

  } catch (error) {
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
    submitBtn.textContent = 'SUBMIT SURVEY';
  }
}
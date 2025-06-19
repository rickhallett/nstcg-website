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

// Initialize counts on page load
window.addEventListener('load', async function () {
  // Load thought bubbles
  loadThoughtBubbles();
  
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
        <div class="map-image" id="traffic-impact-map">
          <img src="images/impact_non_sat_height.png" alt="Map of North Swanage">
          <div class="impact-overlay"></div>
        </div>
      `;

      // Trigger fade-in animation after a brief delay
      setTimeout(() => {
        const mapImage = document.getElementById('traffic-impact-map');
        if (mapImage) {
          mapImage.classList.add('fade-in');
        }
      }, 100);
    }
  }, 1500);
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
  submitBtn.textContent = 'JOINING...';
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
        <button class="modal-survey-continue-btn" style="
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
        " onmouseover="this.style.background='#00cc00'" onmouseout="this.style.background='#00ff00'"
          onclick="showModalSurveyInstructions()">
          Continue to Official Survey →
        </button>
        
        <div id="modal-survey-instructions" style="display: none; margin-top: 30px; background: #2a2a2a; padding: 25px; border-radius: 10px; border: 2px solid #00ff00;">
          <h4 style="color: #00ff00; margin-bottom: 20px; font-size: 20px;">
            ✓ Complete the Official Survey in Just 30 Seconds!
          </h4>
          
          <div style="background: #1a1a1a; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <p style="color: #ff6b6b; font-weight: bold; margin-bottom: 15px;">
              ⚡ IMPORTANT: The survey contains a large number of questions about "Green Seafront" improvements (which won't cause traffic issues), but we ONLY need to address the TRAFFIC IMPACT questions:
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
                <p style="color: #ccc; margin: 5px 0;"><strong>2nd Choice:</strong> Option 4</p>
                <p style="color: #ccc; margin: 5px 0;"><strong>3rd Choice:</strong> Option 3</p>
                <p style="color: #ccc; margin: 5px 0;"><strong>4th Choice:</strong> Option 2</p>
              </div>
            </div>
            
            <p style="color: #00ff00; margin-top: 20px; font-weight: bold; text-align: center;">
              ⏱️ This takes only 30 seconds vs 30 minutes for the full survey<br>
              ✅ These 3 questions constitute a COMPLETE and VALID survey response
            </p>
          </div>
          
          <div style="background: #1a1a1a; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <label style="display: flex; align-items: center; cursor: pointer; color: #fff;">
              <input type="checkbox" id="modal-understand-checkbox" style="margin-right: 10px; width: 20px; height: 20px; cursor: pointer;"
                onchange="toggleModalSurveyButton()">
              <span style="font-size: 16px;">I understand I only need to answer Questions 1, 24, and 26 to complete a valid survey response</span>
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
          " onclick="openOfficialSurvey()">
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
    submitBtn.textContent = 'JOIN THE MOVEMENT!';
  }
}

// Handle continue to survey button in main confirmation
document.addEventListener('DOMContentLoaded', function () {
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
              ✓ Complete the Official Survey in Just 30 Seconds!
            </h4>
            
            <div class="survey-instructions-content">
              <p style="color: #ff6b6b; font-weight: bold; margin-bottom: 15px;">
                ⚡ IMPORTANT: The survey contains a large number of questions about "Green Seafront" improvements (which won't cause traffic issues), but we ONLY need to address the TRAFFIC IMPACT questions:
              </p>
              
              <div class="survey-step">
                <span class="survey-step-number">STEP 1:</span>
                <span>Answer Question 1 (Your connection to the area)</span>
              </div>
              
              <div class="survey-step">
                <span class="survey-step-number">STEP 2:</span>
                <span>Skip directly to Question 24 - Select <strong>"Don't Know"</strong></span>
              </div>
              
              <div class="survey-step">
                <span class="survey-step-number">STEP 3:</span>
                <div>
                  <span>Go to Question 26 - Rank preferences in this order:</span>
                  <div class="survey-ranking-box">
                    <p class="survey-ranking-item" style="color: #00ff00; margin: 0;"><strong>1st Choice:</strong> Two-way traffic on Shore Road with removal of parking</p>
                    <p class="survey-ranking-item" style="color: #ccc; margin: 8px 0;"><strong>2nd Choice:</strong> Option 4</p>
                    <p class="survey-ranking-item" style="color: #ccc; margin: 8px 0;"><strong>3rd Choice:</strong> Option 3</p>
                    <p class="survey-ranking-item" style="color: #ccc; margin: 8px 0 0 0;"><strong>4th Choice:</strong> Option 2</p>
                  </div>
                </div>
              </div>
              
              <p style="color: #00ff00; margin-top: 20px; font-weight: bold; text-align: center;">
                ⏱️ This takes only 30 seconds vs 30 minutes for the full survey<br>
                ✅ These 3 questions constitute a COMPLETE and VALID survey response
              </p>
            </div>
            
            <div class="survey-checkbox-container">
              <label style="display: flex; align-items: center; cursor: pointer; color: #fff;">
                <input type="checkbox" id="understand-checkbox-new" style="margin-right: 10px; width: 20px; height: 20px; cursor: pointer;">
                <span style="font-size: 16px;">I understand I only need to answer Questions 1, 24, and 26 to complete a valid survey response</span>
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
          newCheckbox.addEventListener('change', function() {
            if (this.checked) {
              newButton.disabled = false;
              newButton.style.background = '#00ff00';
              newButton.style.color = '#1a1a1a';
              newButton.style.cursor = 'pointer';
              newButton.onmouseover = function() { this.style.background = '#00cc00'; };
              newButton.onmouseout = function() { this.style.background = '#00ff00'; };
            } else {
              newButton.disabled = true;
              newButton.style.background = '#666';
              newButton.style.color = '#999';
              newButton.style.cursor = 'not-allowed';
              newButton.onmouseover = null;
              newButton.onmouseout = null;
            }
          });
          
          newButton.addEventListener('click', function() {
            if (!this.disabled) {
              window.open('https://www.dorsetcoasthaveyoursay.co.uk/swanage-green-seafront-stabilisation/surveys/swanage-green-seafront-survey-2025', '_blank');
            }
          });
        }
        
        confirmationDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }
});

// Modal survey instructions functions
function showModalSurveyInstructions() {
  const modalContent = document.getElementById('modal-survey-content');
  if (modalContent) {
    // Replace entire modal content with just the instructions
    modalContent.innerHTML = `
      <div style="padding: 10px;">
        <h4 style="color: #00ff00; margin-bottom: 20px; font-size: 20px; text-align: center;">
          ✓ Complete the Official Survey in Just 30 Seconds!
        </h4>
        
        <div class="survey-instructions-content">
          <p style="color: #ff6b6b; font-weight: bold; margin-bottom: 15px;">
            ⚡ IMPORTANT: The survey contains a large number of questions about "Green Seafront" improvements (which won't cause traffic issues), but we ONLY need to address the TRAFFIC IMPACT questions:
          </p>
          
          <div class="survey-step">
            <span class="survey-step-number">STEP 1:</span>
            <span>Answer Question 1 (Your connection to the area)</span>
          </div>
          
          <div class="survey-step">
            <span class="survey-step-number">STEP 2:</span>
            <span>Skip directly to Question 24 - Select <strong>"Don't Know"</strong></span>
          </div>
          
          <div class="survey-step">
            <span class="survey-step-number">STEP 3:</span>
            <div>
              <span>Go to Question 26 - Rank preferences in this order:</span>
              <div class="survey-ranking-box">
                <p class="survey-ranking-item" style="color: #00ff00; margin: 0;"><strong>1st Choice:</strong> Two-way traffic on Shore Road with removal of parking</p>
                <p class="survey-ranking-item" style="color: #ccc; margin: 8px 0;"><strong>2nd Choice:</strong> Option 4</p>
                <p class="survey-ranking-item" style="color: #ccc; margin: 8px 0;"><strong>3rd Choice:</strong> Option 3</p>
                <p class="survey-ranking-item" style="color: #ccc; margin: 8px 0 0 0;"><strong>4th Choice:</strong> Option 2</p>
              </div>
            </div>
          </div>
          
          <p style="color: #00ff00; margin-top: 20px; font-weight: bold; text-align: center;">
            ⏱️ This takes only 30 seconds vs 30 minutes for the full survey<br>
            ✅ These 3 questions constitute a COMPLETE and VALID survey response
          </p>
        </div>
        
        <div class="survey-checkbox-container">
          <label style="display: flex; align-items: center; cursor: pointer; color: #fff;">
            <input type="checkbox" id="modal-understand-checkbox" style="margin-right: 10px; width: 20px; height: 20px; cursor: pointer;"
              onchange="toggleModalSurveyButton()">
            <span style="font-size: 16px;">I understand I only need to answer Questions 1, 24, and 26 to complete a valid survey response</span>
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
        " onclick="openOfficialSurvey()">
          Open Official Survey →
        </button>
      </div>
    `;
  }
}

function toggleModalSurveyButton() {
  const checkbox = document.getElementById('modal-understand-checkbox');
  const button = document.getElementById('modal-official-survey-btn');

  if (checkbox && button) {
    if (checkbox.checked) {
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
  window.open('https://www.dorsetcoasthaveyoursay.co.uk/swanage-green-seafront-stabilisation/surveys/swanage-green-seafront-survey-2025', '_blank');
}
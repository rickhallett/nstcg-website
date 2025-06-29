/**
 * reCAPTCHA Enterprise Integration Module
 * @module ReCaptcha
 */

const SITE_KEY = '6LdmSm4rAAAAAGwGVAsN25wdZ2Q2gFoEAtQVt7lX';

/**
 * Initialize reCAPTCHA Enterprise
 * Must be called after the reCAPTCHA script is loaded
 */
export function initializeRecaptcha() {
  return new Promise((resolve, reject) => {
    if (typeof grecaptcha === 'undefined') {
      reject(new Error('reCAPTCHA script not loaded'));
      return;
    }

    grecaptcha.enterprise.ready(() => {
      console.log('reCAPTCHA Enterprise initialized');
      resolve();
    });
  });
}

/**
 * Execute reCAPTCHA and get token
 * @param {string} action - The action name (e.g., 'submit', 'login')
 * @returns {Promise<string>} The reCAPTCHA token
 */
export async function getRecaptchaToken(action = 'submit') {
  try {
    if (typeof grecaptcha === 'undefined') {
      throw new Error('reCAPTCHA not initialized');
    }

    const token = await grecaptcha.enterprise.execute(SITE_KEY, { action });
    return token;
  } catch (error) {
    console.error('Error getting reCAPTCHA token:', error);
    throw error;
  }
}

/**
 * Verify reCAPTCHA token with backend
 * @param {string} token - The reCAPTCHA token
 * @param {string} action - The action name
 * @returns {Promise<Object>} Verification result
 */
export async function verifyRecaptchaToken(token, action = 'submit') {
  try {
    const response = await fetch('/api/verify-recaptcha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, action }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'reCAPTCHA verification failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error);
    throw error;
  }
}

/**
 * Add reCAPTCHA to a form submission
 * @param {Function} originalSubmitHandler - The original form submit handler
 * @param {string} action - The reCAPTCHA action name
 * @returns {Function} Enhanced submit handler with reCAPTCHA
 */
export function withRecaptcha(originalSubmitHandler, action = 'submit') {
  return async function(formData) {
    try {
      // Get reCAPTCHA token
      const token = await getRecaptchaToken(action);
      
      // Verify token with backend
      const verification = await verifyRecaptchaToken(token, action);
      
      if (!verification.isAllowed) {
        throw new Error('Security check failed. Please try again.');
      }
      
      // Add score to form data for logging purposes
      formData.recaptchaScore = verification.score;
      
      // Call original submit handler
      return await originalSubmitHandler(formData);
    } catch (error) {
      console.error('reCAPTCHA error:', error);
      throw error;
    }
  };
}

/**
 * Load reCAPTCHA script dynamically
 * @returns {Promise<void>}
 */
export function loadRecaptchaScript() {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    if (document.querySelector('script[src*="recaptcha/enterprise.js"]')) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${SITE_KEY}`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      initializeRecaptcha()
        .then(resolve)
        .catch(reject);
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load reCAPTCHA script'));
    };
    
    document.head.appendChild(script);
  });
}

// Export all functions
export default {
  loadRecaptchaScript,
  initializeRecaptcha,
  getRecaptchaToken,
  verifyRecaptchaToken,
  withRecaptcha,
  SITE_KEY
};
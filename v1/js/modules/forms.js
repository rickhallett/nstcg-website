/**
 * Form Handling Module
 * @module Forms
 */

import { ApiConfig } from '../config/api.config.js';
import { AppConfig } from '../config/app.config.js';
import eventBus, { Events } from '../core/eventBus.js';
import stateManager from '../core/StateManager.js';
import { createAlert } from '../utils/templates.js';

/**
 * Form validator class
 */
class FormValidator {
  constructor(rules = {}) {
    this.rules = rules;
    this.errors = {};
  }

  /**
   * Validate form data
   * @param {Object} data - Form data to validate
   * @returns {Object} Validation result
   */
  validate(data) {
    this.errors = {};
    let isValid = true;

    for (const [field, rules] of Object.entries(this.rules)) {
      const value = data[field];
      const fieldErrors = [];

      for (const rule of rules) {
        const error = this.validateRule(value, rule, data);
        if (error) {
          fieldErrors.push(error);
          isValid = false;
        }
      }

      if (fieldErrors.length > 0) {
        this.errors[field] = fieldErrors;
      }
    }

    return { isValid, errors: this.errors };
  }

  /**
   * Validate a single rule
   * @private
   */
  validateRule(value, rule, data) {
    switch (rule.type) {
      case 'required':
        if (!value || value.trim() === '') {
          return rule.message || 'This field is required';
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value && !emailRegex.test(value)) {
          return rule.message || 'Invalid email address';
        }
        break;

      case 'minLength':
        if (value && value.length < rule.value) {
          return rule.message || `Minimum ${rule.value} characters required`;
        }
        break;

      case 'maxLength':
        if (value && value.length > rule.value) {
          return rule.message || `Maximum ${rule.value} characters allowed`;
        }
        break;

      case 'pattern':
        if (value && !rule.value.test(value)) {
          return rule.message || 'Invalid format';
        }
        break;

      case 'custom':
        if (rule.validator && !rule.validator(value, data)) {
          return rule.message || 'Invalid value';
        }
        break;
    }

    return null;
  }

  /**
   * Get errors for a specific field
   * @param {string} field - Field name
   * @returns {Array} Field errors
   */
  getFieldErrors(field) {
    return this.errors[field] || [];
  }

  /**
   * Clear validation errors
   */
  clearErrors() {
    this.errors = {};
  }
}

/**
 * Form handler class
 */
class FormHandler {
  constructor(formElement, options = {}) {
    this.form = typeof formElement === 'string' 
      ? document.getElementById(formElement) 
      : formElement;
    
    this.options = {
      validateOnBlur: true,
      validateOnInput: false,
      submitHandler: null,
      errorClass: 'field-error',
      successClass: 'field-success',
      ...options
    };

    this.validator = new FormValidator(options.validationRules || {});
    this.isSubmitting = false;
    
    this.init();
  }

  /**
   * Initialize form handler
   * @private
   */
  init() {
    if (!this.form) {
      console.error('Form element not found');
      return;
    }

    // Bind form submission
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    // Bind field validation
    if (this.options.validateOnBlur || this.options.validateOnInput) {
      const inputs = this.form.querySelectorAll('input, textarea, select');
      
      inputs.forEach(input => {
        if (this.options.validateOnBlur) {
          input.addEventListener('blur', () => this.validateField(input));
        }
        
        if (this.options.validateOnInput) {
          input.addEventListener('input', () => this.validateField(input));
        }

        // Emit field change events
        input.addEventListener('change', () => {
          eventBus.emit(Events.FORM_FIELD_CHANGE, {
            field: input.name,
            value: input.value,
            form: this.form.id
          });
        });
      });
    }
  }

  /**
   * Handle form submission
   * @private
   */
  async handleSubmit(e) {
    e.preventDefault();

    if (this.isSubmitting) {
      return;
    }

    // Get form data
    const formData = this.getFormData();
    
    // Validate form
    const validation = this.validator.validate(formData);
    
    if (!validation.isValid) {
      this.displayErrors(validation.errors);
      eventBus.emit(Events.FORM_VALIDATION_ERROR, {
        errors: validation.errors,
        form: this.form.id
      });
      return;
    }

    // Clear any existing errors
    this.clearErrors();

    // Update state
    stateManager.set('form.isSubmitting', true);
    stateManager.set('form.values', formData);
    
    this.isSubmitting = true;
    this.setLoadingState(true);

    try {
      // Call custom submit handler if provided
      let result;
      if (this.options.submitHandler) {
        result = await this.options.submitHandler(formData);
      } else {
        // Default submission (if needed)
        result = await this.submitForm(formData);
      }

      // Success
      eventBus.emit(Events.FORM_SUCCESS, {
        data: formData,
        result,
        form: this.form.id
      });

      // Reset form if needed
      if (this.options.resetOnSuccess !== false) {
        this.reset();
      }

    } catch (error) {
      // Error
      console.error('Form submission error:', error);
      
      eventBus.emit(Events.FORM_ERROR, {
        error,
        data: formData,
        form: this.form.id
      });

      this.displayError(error.message || 'Submission failed. Please try again.');
      
    } finally {
      this.isSubmitting = false;
      this.setLoadingState(false);
      stateManager.set('form.isSubmitting', false);
    }
  }

  /**
   * Get form data as object
   * @returns {Object} Form data
   */
  getFormData() {
    const formData = new FormData(this.form);
    const data = {};

    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }

    return data;
  }

  /**
   * Validate a single field
   * @param {HTMLElement} field - Field element
   */
  validateField(field) {
    const formData = this.getFormData();
    const validation = this.validator.validate(formData);
    const fieldErrors = validation.errors[field.name] || [];

    if (fieldErrors.length > 0) {
      this.displayFieldError(field, fieldErrors[0]);
    } else {
      this.clearFieldError(field);
    }
  }

  /**
   * Display validation errors
   * @param {Object} errors - Validation errors
   */
  displayErrors(errors) {
    // Clear existing errors
    this.clearErrors();

    for (const [field, messages] of Object.entries(errors)) {
      const fieldElement = this.form.querySelector(`[name="${field}"]`);
      if (fieldElement && messages.length > 0) {
        this.displayFieldError(fieldElement, messages[0]);
      }
    }
  }

  /**
   * Display error for a specific field
   * @param {HTMLElement} field - Field element
   * @param {string} message - Error message
   */
  displayFieldError(field, message) {
    field.classList.add(this.options.errorClass);
    field.classList.remove(this.options.successClass);

    // Remove existing error message
    const existingError = field.parentElement.querySelector('.form-error');
    if (existingError) {
      existingError.remove();
    }

    // Add new error message
    const errorElement = document.createElement('span');
    errorElement.className = 'form-error';
    errorElement.textContent = message;
    field.parentElement.appendChild(errorElement);
  }

  /**
   * Clear error for a specific field
   * @param {HTMLElement} field - Field element
   */
  clearFieldError(field) {
    field.classList.remove(this.options.errorClass);
    field.classList.add(this.options.successClass);

    const errorElement = field.parentElement.querySelector('.form-error');
    if (errorElement) {
      errorElement.remove();
    }
  }

  /**
   * Clear all errors
   */
  clearErrors() {
    const fields = this.form.querySelectorAll(`.${this.options.errorClass}`);
    fields.forEach(field => this.clearFieldError(field));
    this.validator.clearErrors();
  }

  /**
   * Display general error message
   * @param {string} message - Error message
   */
  displayError(message) {
    // Remove existing alert
    const existingAlert = this.form.querySelector('.alert');
    if (existingAlert) {
      existingAlert.remove();
    }

    // Add new alert
    const alertHtml = createAlert({
      message,
      type: 'error',
      dismissible: true
    });

    this.form.insertAdjacentHTML('afterbegin', alertHtml);
  }

  /**
   * Set form loading state
   * @param {boolean} loading - Loading state
   */
  setLoadingState(loading) {
    const submitButton = this.form.querySelector('[type="submit"]');
    if (submitButton) {
      submitButton.disabled = loading;
      if (loading) {
        submitButton.classList.add('loading');
      } else {
        submitButton.classList.remove('loading');
      }
    }

    // Disable/enable all form inputs
    const inputs = this.form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.disabled = loading;
    });
  }

  /**
   * Submit form (default implementation)
   * @param {Object} data - Form data
   * @returns {Promise} Submission result
   */
  async submitForm(data) {
    // This is a placeholder - override with submitHandler option
    console.log('Form submitted:', data);
    return { success: true };
  }

  /**
   * Reset form
   */
  reset() {
    this.form.reset();
    this.clearErrors();
    stateManager.set('form.values', {});
  }

  /**
   * Destroy form handler
   */
  destroy() {
    // Remove event listeners
    this.form.removeEventListener('submit', this.handleSubmit);
    // Additional cleanup if needed
  }
}

/**
 * Utility functions
 */

/**
 * Generate unique user ID
 * @returns {string} User ID
 */
export function generateUserId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Serialize form data to object
 * @param {HTMLFormElement} form - Form element
 * @returns {Object} Form data
 */
export function serializeForm(form) {
  const formData = new FormData(form);
  const data = {};

  for (const [key, value] of formData.entries()) {
    if (data[key]) {
      // Handle multiple values with same name
      if (!Array.isArray(data[key])) {
        data[key] = [data[key]];
      }
      data[key].push(value);
    } else {
      data[key] = value;
    }
  }

  return data;
}

/**
 * Fill form with data
 * @param {HTMLFormElement} form - Form element
 * @param {Object} data - Data to fill
 */
export function fillForm(form, data) {
  for (const [key, value] of Object.entries(data)) {
    const field = form.querySelector(`[name="${key}"]`);
    if (field) {
      if (field.type === 'checkbox') {
        field.checked = !!value;
      } else if (field.type === 'radio') {
        const radio = form.querySelector(`[name="${key}"][value="${value}"]`);
        if (radio) radio.checked = true;
      } else {
        field.value = value;
      }
    }
  }
}

// Export classes and functions
export { FormValidator, FormHandler };
export default FormHandler;
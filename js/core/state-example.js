/**
 * Example of StateManager integration
 * This file demonstrates how to replace global variables with StateManager
 */

import stateManager from './StateManager.js';
import { initialState } from '../config/app.config.js';

// Initialize state on app start
export function initializeAppState() {
  // Set initial state
  stateManager.initialize(initialState);

  // Subscribe to state changes
  stateManager.subscribe('data.participantCount', (newCount, oldCount) => {
    console.log(`Participant count updated: ${oldCount} -> ${newCount}`);
    updateCounterDisplay(newCount);
  });

  stateManager.subscribe('user.hasSubmitted', (hasSubmitted) => {
    if (hasSubmitted) {
      console.log('User has submitted the form');
      updateUIAfterSubmission();
    }
  });

  // Subscribe to all state changes (for debugging)
  if (process.env.NODE_ENV === 'development') {
    stateManager.subscribe('*', (newValue, oldValue, path) => {
      console.log(`State changed at ${path}:`, { oldValue, newValue });
    });
  }
}

// Example: Replace global variable access
// Before: let realCount = null;
// After: Use stateManager

export function setParticipantCount(count) {
  // Before: realCount = count;
  // After:
  stateManager.set('data.participantCount', count);
  stateManager.set('data.lastUpdated', new Date().toISOString());
}

export function getParticipantCount() {
  // Before: return realCount;
  // After:
  return stateManager.get('data.participantCount');
}

// Example: Managing form state
export function updateFormField(fieldName, value) {
  stateManager.set(`form.values.${fieldName}`, value);
}

export function setFormError(fieldName, error) {
  stateManager.set(`form.errors.${fieldName}`, error);
}

export function clearFormErrors() {
  stateManager.set('form.errors', {});
}

// Example: Managing UI state
export function setLoading(isLoading) {
  stateManager.set('ui.isLoading', isLoading);
}

export function showToast(message, type = 'info') {
  stateManager.set('ui.toastMessage', { message, type, timestamp: Date.now() });
}

// Example: Batch updates
export function submitFormStart() {
  stateManager.update({
    'form.isSubmitting': true,
    'form.errors': {},
    'ui.isLoading': true
  });
}

export function submitFormComplete(submissionData) {
  stateManager.update({
    'form.isSubmitting': false,
    'ui.isLoading': false,
    'user.hasSubmitted': true,
    'user.submissionData': submissionData
  });
}

// Helper functions that would be called by subscribers
function updateCounterDisplay(count) {
  const counterEl = document.querySelector('.counter-number');
  if (counterEl && count !== null) {
    counterEl.textContent = count.toLocaleString();
  }
}

function updateUIAfterSubmission() {
  // Update UI elements after form submission
  const formSection = document.querySelector('.form-section');
  const confirmationSection = document.querySelector('.confirmation-section');
  
  if (formSection) formSection.style.display = 'none';
  if (confirmationSection) confirmationSection.style.display = 'block';
}
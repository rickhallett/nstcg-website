/**
 * Alpine.js availability check
 * This can be used to verify Alpine.js is loaded
 */

// Check if Alpine is available
window.addEventListener('DOMContentLoaded', () => {
  // Alpine.js initializes after DOMContentLoaded
  setTimeout(() => {
    if (typeof Alpine !== 'undefined') {
      console.log('✅ Alpine.js is loaded and available');
      console.log('Alpine version:', Alpine.version);
    } else {
      console.warn('❌ Alpine.js is not loaded');
    }
  }, 100);
});

// Example Alpine.js component registration
document.addEventListener('alpine:init', () => {
  // Register global Alpine data or components here
  Alpine.data('exampleComponent', () => ({
    message: 'Alpine.js is working!',
    count: 0,
    increment() {
      this.count++;
    }
  }));

  console.log('Alpine.js initialized - components registered');
});
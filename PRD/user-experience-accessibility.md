# User Experience & Accessibility - Product Requirements Document

## Document Information
- **Author**: Development Team
- **Date**: January 2025
- **Version**: 1.0
- **Status**: Draft
- **Priority**: Medium

## Issue Assessment
- **Priority**: HIGH
- **Complexity**: 8 (Fibonacci)
- **Risk Level**: Medium
- **Time Estimate**: 2-3 weeks

### Priority Justification
- Legal compliance requirements (ADA/WCAG)
- Excludes users with disabilities
- Poor UX affects conversion rates
- Brand reputation risk

### Complexity Breakdown
- ARIA implementation across all components (3)
- Keyboard navigation system (3)
- Screen reader testing and fixes (2)

## Executive Summary
This PRD addresses critical user experience and accessibility issues in the NSTCG website. Current problems include form submission issues, lack of ARIA labels, missing keyboard navigation, and poor screen reader support. These improvements will ensure the platform is usable by all community members, regardless of their abilities.

## Problem Statement

### Current UX/Accessibility Issues

1. **Form Submission Problems**
   - Multiple submission attempts possible during processing
   - No clear loading states
   - Confusing error messages
   - Form state lost on error

2. **Missing ARIA Support**
   - Dynamic content not announced
   - Form errors not associated with fields
   - Modal dialogs not properly labeled
   - Live regions not implemented

3. **Keyboard Navigation Issues**
   - Tab order incorrect
   - Modal traps not implemented
   - Skip links missing
   - Interactive elements not keyboard accessible

4. **Screen Reader Incompatibility**
   - Images without alt text
   - Decorative images not hidden
   - Complex widgets not described
   - Status messages not announced

## Goals & Objectives

### Primary Goals
1. Achieve WCAG 2.1 AA compliance
2. Reduce form submission errors by 90%
3. Enable full keyboard navigation
4. Ensure 100% screen reader compatibility

### Success Metrics
- Zero critical accessibility violations
- < 2% form submission failure rate
- 100% keyboard navigable features
- Pass automated accessibility testing

## User Stories

### As a User with Disabilities
- I want to navigate the entire site using only my keyboard
- I want my screen reader to announce all important information
- I want to understand form errors and how to fix them
- I want to know when content updates dynamically

### As a Mobile User
- I want forms to be easy to fill on my phone
- I want touch targets to be large enough
- I want the site to work in portrait and landscape
- I want to zoom without breaking the layout

### As a User with Slow Internet
- I want to see loading states for all actions
- I want to know if something is processing
- I want actions to complete even if connection drops
- I want clear feedback on success or failure

## Technical Requirements

### 1. Form Enhancement

#### Submission State Management
```javascript
class FormManager {
  constructor(form) {
    this.form = form;
    this.submitButton = form.querySelector('[type="submit"]');
    this.isSubmitting = false;
    this.originalButtonText = this.submitButton.textContent;
    
    this.init();
  }
  
  init() {
    this.form.addEventListener('submit', this.handleSubmit.bind(this));
    
    // Add live region for announcements
    this.liveRegion = this.createLiveRegion();
  }
  
  createLiveRegion() {
    const region = document.createElement('div');
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    this.form.appendChild(region);
    return region;
  }
  
  async handleSubmit(e) {
    e.preventDefault();
    
    if (this.isSubmitting) {
      this.announce('Please wait, form is being submitted');
      return;
    }
    
    this.setSubmitting(true);
    
    try {
      const formData = this.getFormData();
      const validation = this.validate(formData);
      
      if (!validation.valid) {
        this.showErrors(validation.errors);
        return;
      }
      
      const result = await this.submit(formData);
      this.handleSuccess(result);
      
    } catch (error) {
      this.handleError(error);
    } finally {
      this.setSubmitting(false);
    }
  }
  
  setSubmitting(isSubmitting) {
    this.isSubmitting = isSubmitting;
    
    if (isSubmitting) {
      this.submitButton.disabled = true;
      this.submitButton.textContent = 'Processing...';
      this.submitButton.setAttribute('aria-busy', 'true');
      this.form.setAttribute('aria-busy', 'true');
    } else {
      this.submitButton.disabled = false;
      this.submitButton.textContent = this.originalButtonText;
      this.submitButton.removeAttribute('aria-busy');
      this.form.removeAttribute('aria-busy');
    }
  }
  
  showErrors(errors) {
    // Clear previous errors
    this.clearErrors();
    
    // Show new errors
    errors.forEach(error => {
      const field = this.form.querySelector(`[name="${error.field}"]`);
      if (field) {
        // Add error class
        field.classList.add('error');
        field.setAttribute('aria-invalid', 'true');
        
        // Create error message
        const errorId = `${error.field}-error`;
        const errorElement = document.createElement('span');
        errorElement.id = errorId;
        errorElement.className = 'field-error';
        errorElement.textContent = error.message;
        errorElement.setAttribute('role', 'alert');
        
        // Associate error with field
        field.setAttribute('aria-describedby', errorId);
        
        // Insert error after field
        field.parentNode.insertBefore(errorElement, field.nextSibling);
      }
    });
    
    // Announce errors
    const errorCount = errors.length;
    const message = `${errorCount} error${errorCount > 1 ? 's' : ''} found. Please review and correct.`;
    this.announce(message);
    
    // Focus first error field
    const firstError = this.form.querySelector('[aria-invalid="true"]');
    if (firstError) {
      firstError.focus();
    }
  }
  
  clearErrors() {
    // Remove error states
    this.form.querySelectorAll('.error').forEach(el => {
      el.classList.remove('error');
      el.removeAttribute('aria-invalid');
      el.removeAttribute('aria-describedby');
    });
    
    // Remove error messages
    this.form.querySelectorAll('.field-error').forEach(el => {
      el.remove();
    });
  }
  
  announce(message) {
    this.liveRegion.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      this.liveRegion.textContent = '';
    }, 1000);
  }
}
```

#### Progressive Enhancement
```javascript
class ProgressiveForm {
  constructor(form) {
    this.form = form;
    this.enhance();
  }
  
  enhance() {
    // Add proper input types
    this.enhanceInputTypes();
    
    // Add autofocus management
    this.manageAutofocus();
    
    // Add field validation
    this.addFieldValidation();
    
    // Add progress indicator
    this.addProgressIndicator();
  }
  
  enhanceInputTypes() {
    // Email inputs
    this.form.querySelectorAll('input[name*="email"]').forEach(input => {
      input.type = 'email';
      input.autocomplete = 'email';
      input.setAttribute('inputmode', 'email');
    });
    
    // Phone inputs
    this.form.querySelectorAll('input[name*="phone"]').forEach(input => {
      input.type = 'tel';
      input.autocomplete = 'tel';
      input.setAttribute('inputmode', 'tel');
    });
    
    // Name inputs
    this.form.querySelectorAll('input[name*="name"]').forEach(input => {
      if (input.name.includes('first')) {
        input.autocomplete = 'given-name';
      } else if (input.name.includes('last')) {
        input.autocomplete = 'family-name';
      } else {
        input.autocomplete = 'name';
      }
    });
  }
  
  addFieldValidation() {
    const fields = this.form.querySelectorAll('input[required], textarea[required]');
    
    fields.forEach(field => {
      // Add validation on blur
      field.addEventListener('blur', () => {
        this.validateField(field);
      });
      
      // Clear error on input
      field.addEventListener('input', () => {
        if (field.classList.contains('error')) {
          this.clearFieldError(field);
        }
      });
    });
  }
  
  validateField(field) {
    const value = field.value.trim();
    
    if (!value && field.hasAttribute('required')) {
      this.showFieldError(field, 'This field is required');
      return false;
    }
    
    if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        this.showFieldError(field, 'Please enter a valid email address');
        return false;
      }
    }
    
    return true;
  }
}
```

### 2. ARIA Implementation

#### Dynamic Content Announcements
```javascript
class AriaAnnouncer {
  constructor() {
    this.createRegions();
  }
  
  createRegions() {
    // Polite announcements
    this.polite = document.createElement('div');
    this.polite.setAttribute('role', 'status');
    this.polite.setAttribute('aria-live', 'polite');
    this.polite.className = 'sr-only';
    document.body.appendChild(this.polite);
    
    // Assertive announcements
    this.assertive = document.createElement('div');
    this.assertive.setAttribute('role', 'alert');
    this.assertive.setAttribute('aria-live', 'assertive');
    this.assertive.className = 'sr-only';
    document.body.appendChild(this.assertive);
  }
  
  announce(message, priority = 'polite') {
    const region = priority === 'assertive' ? this.assertive : this.polite;
    
    // Clear previous message
    region.textContent = '';
    
    // Set new message after a tick
    setTimeout(() => {
      region.textContent = message;
    }, 100);
    
    // Clear after announcement
    setTimeout(() => {
      region.textContent = '';
    }, 3000);
  }
}

// Global announcer instance
const announcer = new AriaAnnouncer();
```

#### Modal Accessibility
```javascript
class AccessibleModal {
  constructor(modal) {
    this.modal = modal;
    this.modalId = modal.id;
    this.triggers = document.querySelectorAll(`[data-modal-trigger="${this.modalId}"]`);
    this.closeButtons = modal.querySelectorAll('[data-modal-close]');
    this.previousFocus = null;
    
    this.init();
  }
  
  init() {
    // Set up ARIA attributes
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    
    // Find and set label
    const title = this.modal.querySelector('h1, h2, h3');
    if (title) {
      const titleId = `${this.modalId}-title`;
      title.id = titleId;
      this.modal.setAttribute('aria-labelledby', titleId);
    }
    
    // Set up triggers
    this.triggers.forEach(trigger => {
      trigger.addEventListener('click', () => this.open());
    });
    
    // Set up close buttons
    this.closeButtons.forEach(button => {
      button.addEventListener('click', () => this.close());
    });
    
    // Close on escape
    this.modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    });
  }
  
  open() {
    // Store current focus
    this.previousFocus = document.activeElement;
    
    // Show modal
    this.modal.classList.add('active');
    this.modal.removeAttribute('aria-hidden');
    
    // Trap focus
    this.trapFocus();
    
    // Focus first focusable element
    const firstFocusable = this.modal.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (firstFocusable) {
      firstFocusable.focus();
    }
    
    // Announce opening
    announcer.announce(`${this.modal.getAttribute('aria-label') || 'Modal'} opened`);
  }
  
  close() {
    // Hide modal
    this.modal.classList.remove('active');
    this.modal.setAttribute('aria-hidden', 'true');
    
    // Release focus trap
    this.releaseFocus();
    
    // Restore focus
    if (this.previousFocus) {
      this.previousFocus.focus();
    }
    
    // Announce closing
    announcer.announce('Modal closed');
  }
  
  trapFocus() {
    const focusableElements = this.modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    
    this.focusTrapHandler = (e) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };
    
    this.modal.addEventListener('keydown', this.focusTrapHandler);
  }
  
  releaseFocus() {
    if (this.focusTrapHandler) {
      this.modal.removeEventListener('keydown', this.focusTrapHandler);
    }
  }
}
```

### 3. Keyboard Navigation

#### Skip Links
```html
<!-- Skip links at top of page -->
<div class="skip-links">
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <a href="#navigation" class="skip-link">Skip to navigation</a>
  <a href="#footer" class="skip-link">Skip to footer</a>
</div>

<style>
.skip-link {
  position: absolute;
  left: -9999px;
  z-index: 999;
  padding: 1em;
  background: #000;
  color: #fff;
  text-decoration: none;
}

.skip-link:focus {
  left: 0;
  top: 0;
}
</style>
```

#### Keyboard Navigation Manager
```javascript
class KeyboardNavigationManager {
  constructor() {
    this.init();
  }
  
  init() {
    // Add keyboard indicators
    this.addKeyboardIndicators();
    
    // Enhance interactive elements
    this.enhanceInteractiveElements();
    
    // Add custom keyboard shortcuts
    this.addKeyboardShortcuts();
  }
  
  addKeyboardIndicators() {
    // Show focus indicators only for keyboard users
    document.addEventListener('mousedown', () => {
      document.body.classList.add('using-mouse');
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.remove('using-mouse');
      }
    });
  }
  
  enhanceInteractiveElements() {
    // Make all clickable elements keyboard accessible
    document.querySelectorAll('[onclick]').forEach(element => {
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '0');
      }
      
      // Add keyboard activation
      element.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          element.click();
        }
      });
    });
  }
  
  addKeyboardShortcuts() {
    const shortcuts = {
      '/': () => this.focusSearch(),
      'g h': () => this.navigateTo('/'),
      'g d': () => this.navigateTo('/donate'),
      'g l': () => this.navigateTo('/leaderboard'),
      '?': () => this.showShortcuts()
    };
    
    let keys = '';
    
    document.addEventListener('keydown', (e) => {
      // Ignore if in input
      if (this.isInInput()) return;
      
      keys += e.key;
      
      // Check for matches
      Object.entries(shortcuts).forEach(([shortcut, handler]) => {
        if (keys.endsWith(shortcut)) {
          e.preventDefault();
          handler();
          keys = '';
        }
      });
      
      // Clear after timeout
      clearTimeout(this.keyTimeout);
      this.keyTimeout = setTimeout(() => {
        keys = '';
      }, 1000);
    });
  }
  
  isInInput() {
    const activeElement = document.activeElement;
    return activeElement.tagName === 'INPUT' || 
           activeElement.tagName === 'TEXTAREA' || 
           activeElement.isContentEditable;
  }
}
```

### 4. Screen Reader Support

#### Image Accessibility
```javascript
class ImageAccessibility {
  constructor() {
    this.enhanceImages();
  }
  
  enhanceImages() {
    document.querySelectorAll('img').forEach(img => {
      // Check for alt text
      if (!img.hasAttribute('alt')) {
        // Determine if decorative
        if (this.isDecorative(img)) {
          img.setAttribute('alt', '');
          img.setAttribute('role', 'presentation');
        } else {
          // Generate meaningful alt text
          const altText = this.generateAltText(img);
          img.setAttribute('alt', altText);
          console.warn(`Missing alt text for image: ${img.src}`);
        }
      }
      
      // Add loading state
      if (img.loading !== 'eager') {
        img.loading = 'lazy';
      }
    });
  }
  
  isDecorative(img) {
    // Check if image is decorative
    return img.classList.contains('decorative') ||
           img.classList.contains('icon') ||
           img.parentElement.getAttribute('role') === 'presentation';
  }
  
  generateAltText(img) {
    // Try to generate from filename
    const filename = img.src.split('/').pop().split('.')[0];
    return filename.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}
```

#### Table Accessibility
```javascript
class TableAccessibility {
  constructor() {
    this.enhanceTables();
  }
  
  enhanceTables() {
    document.querySelectorAll('table').forEach(table => {
      // Add caption if missing
      if (!table.querySelector('caption')) {
        const caption = document.createElement('caption');
        caption.className = 'sr-only';
        caption.textContent = this.generateCaption(table);
        table.insertBefore(caption, table.firstChild);
      }
      
      // Mark up headers
      const headers = table.querySelectorAll('th');
      headers.forEach((header, index) => {
        if (!header.hasAttribute('scope')) {
          header.setAttribute('scope', this.determineScope(header));
        }
        
        if (!header.id) {
          header.id = `table-header-${index}`;
        }
      });
      
      // Associate data cells with headers
      const rows = table.querySelectorAll('tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        cells.forEach((cell, cellIndex) => {
          if (!cell.hasAttribute('headers')) {
            const headerId = table.querySelector(`th:nth-child(${cellIndex + 1})`).id;
            cell.setAttribute('headers', headerId);
          }
        });
      });
    });
  }
  
  determineScope(header) {
    // Determine if row or column header
    const row = header.parentElement;
    const firstCellInRow = row.querySelector('th, td');
    
    return header === firstCellInRow ? 'row' : 'col';
  }
  
  generateCaption(table) {
    // Try to generate caption from context
    const previousHeading = table.previousElementSibling;
    if (previousHeading && previousHeading.tagName.match(/^H[1-6]$/)) {
      return previousHeading.textContent;
    }
    
    return 'Data table';
  }
}
```

## Implementation Plan

### Phase 1: Form Accessibility (Week 1)
1. Implement form state management
2. Add ARIA labels and descriptions
3. Add loading states and announcements
4. Test with screen readers

### Phase 2: Keyboard Navigation (Week 2)
1. Add skip links
2. Implement focus management
3. Add keyboard shortcuts
4. Test keyboard-only navigation

### Phase 3: Screen Reader Support (Week 3)
1. Add alt text to all images
2. Implement live regions
3. Enhance tables and lists
4. Test with multiple screen readers

### Phase 4: Mobile Accessibility (Week 4)
1. Increase touch targets
2. Improve form inputs
3. Test with mobile screen readers
4. Optimize for one-handed use

## Testing Strategy

### Automated Testing
```javascript
// Jest test example
describe('Accessibility', () => {
  test('forms have proper labels', async () => {
    const { container } = render(<SignupForm />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  
  test('modals trap focus', () => {
    const modal = new AccessibleModal(document.querySelector('#modal'));
    modal.open();
    
    const focusableElements = modal.modal.querySelectorAll('[tabindex]');
    expect(document.activeElement).toBe(focusableElements[0]);
  });
});
```

### Manual Testing Checklist
- [ ] Navigate entire site with keyboard only
- [ ] Test with NVDA on Windows
- [ ] Test with JAWS on Windows
- [ ] Test with VoiceOver on macOS
- [ ] Test with VoiceOver on iOS
- [ ] Test with TalkBack on Android
- [ ] Test with 200% zoom
- [ ] Test with high contrast mode
- [ ] Test with reduced motion

## Success Criteria

### Accessibility Scores
- Lighthouse Accessibility: 100
- axe DevTools: 0 violations
- WAVE: 0 errors, 0 contrast errors

### User Testing
- 100% task completion with keyboard
- 100% task completion with screen reader
- < 30 second average task time increase

## Documentation

### Developer Guidelines
- Component accessibility checklist
- ARIA pattern library
- Testing procedures
- Common pitfalls

### User Documentation
- Keyboard shortcuts guide
- Screen reader tips
- Accessibility features overview
- Contact for accessibility issues

## Appendix

### Tools & Resources
- axe DevTools for testing
- NVDA for Windows testing
- VoiceOver for Mac/iOS testing
- WAVE browser extension

### References
- WCAG 2.1 Guidelines
- ARIA Authoring Practices Guide
- WebAIM Screen Reader Survey
- A11y Project Checklist
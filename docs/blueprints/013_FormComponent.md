[<- Back to Index](./000_master_blueprint.md)

# Blueprint: FormComponent.js

**Objective:** To create a reusable, "dumb" UI component for forms.

**Test Specification:** `tests/components/Form/FormComponent.test.js`

```javascript
import { FormComponent } from '../../js/components/Form/FormComponent.js';
import { EventBus } from '../../js/core/EventBus.js';
import { expect } from '../../js/testing/expect.js';
import { describe, it, beforeEach, mockFn } from '../../js/testing/veritas.js';

jest.mock('../../js/core/EventBus.js'); // Mock the EventBus to spy on its methods

describe('FormComponent', () => {
  let host;
  let mockEventBusInstance;

  beforeEach(() => {
    document.body.innerHTML = '<div id="host"></div>';
    host = document.getElementById('host');
    EventBus._resetInstance();
    mockEventBusInstance = EventBus.getInstance();
  });

  // == Rendering Logic ==
  describe('Rendering', () => {
    it('should render a form element with the correct inputs', () => {
      const formComponent = new FormComponent(host, {});
      formComponent.attach();
      const form = host.querySelector('form');
      expect(form).not.toBeNull();
      expect(host.querySelector('input[name="firstName"]')).not.toBeNull();
      expect(host.querySelector('input[name="email"]')).not.toBeNull();
      expect(host.querySelector('button[type="submit"]')).not.toBeNull();
    });

    it('should display initial values if provided in props', () => {
      const initialData = { firstName: 'John', email: 'john@test.com' };
      const formComponent = new FormComponent(host, { initialData });
      formComponent.attach();
      expect(host.querySelector('input[name="firstName"]').value).toBe('John');
      expect(host.querySelector('input[name="email"]').value).toBe('john@test.com');
    });

    it('should display validation errors when passed in props', () => {
      const errors = { email: 'Invalid email format' };
      const formComponent = new FormComponent(host, { errors });
      formComponent.attach();
      const errorEl = host.querySelector('.form-error-email'); // Assuming a convention for error elements
      expect(errorEl).not.toBeNull();
      expect(errorEl.textContent).toBe('Invalid email format');
    });
  });

  // == Event Emission ==
  describe('Event Emission', () => {
    it('should prevent the default form submission browser behavior', () => {
      const formComponent = new FormComponent(host, {});
      formComponent.attach();
      const mockPreventDefault = mockFn();
      const form = host.querySelector('form');
      // We need a way to simulate a submit event with a mock preventDefault
      form.dispatchEvent(new SubmitEvent('submit', { cancelable: true, preventDefault: mockPreventDefault }));
      expect(mockPreventDefault).toHaveBeenCalled();
    });

    it('should emit a "form:submit" event on the EventBus when the form is submitted', () => {
      const formComponent = new FormComponent(host, {});
      formComponent.attach();
      
      // Simulate filling the form
      host.querySelector('input[name="firstName"]').value = 'Jane';
      host.querySelector('input[name="email"]').value = 'jane@test.com';

      host.querySelector('form').submit();
      
      expect(mockEventBusInstance.emit).toHaveBeenCalledWith('form:submit', {
        firstName: 'Jane',
        email: 'jane@test.com' 
        // ...and other form fields
      });
    });

    it('should emit a "form:change" event when an input value changes', () => {
        const formComponent = new FormComponent(host, {});
        formComponent.attach();
        const input = host.querySelector('input[name="email"]');
        input.value = 'new@email.com';
        input.dispatchEvent(new Event('change', { bubbles: true }));
        expect(mockEventBusInstance.emit).toHaveBeenCalledWith('form:change', {
          field: 'email',
          value: 'new@email.com'
        });
    });
  });
  
  // == Architectural Purity Checks ==
  describe('Architectural Purity', () => {
      it('should NOT contain any business logic for user registration', () => {
          // This is a conceptual test. The code review should enforce that
          // the FormComponent.js file contains no imports from the /models/ or /services/ directories.
          // The test can assert that no methods like `registerUser` or `saveToApi` exist on the component instance.
          const formComponent = new FormComponent(host, {});
          expect(formComponent.registerUser).toBeUndefined();
      });
  });
});
```

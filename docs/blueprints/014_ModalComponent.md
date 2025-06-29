[<- Back to Index](./000_master_blueprint.md)

# Blueprint: ModalComponent.js

**Objective:** To create a reusable, accessible modal dialog component.

**Test Specification:** `tests/components/Modal/ModalComponent.test.js`

```javascript
import { ModalComponent } from '../../js/components/Modal/ModalComponent.js';
import { EventBus } from '../../js/core/EventBus.js';
import { expect } from '../../js/testing/expect.js';
import { describe, it, beforeEach, mockFn } from '../../js/testing/veritas.js';

jest.mock('../../js/core/EventBus.js');

describe('ModalComponent', () => {
  let host;
  let modalComponent;
  let mockEventBus;
  
  const modalId = 'test-modal';
  const modalProps = {
    title: 'Test Modal',
    content: '<p>Modal Content</p>',
  };

  beforeEach(() => {
    // A modal needs to be appended to the body, not a host div
    document.body.innerHTML = ''; 
    EventBus._resetInstance();
    mockEventBus = EventBus.getInstance();
    
    modalComponent = new ModalComponent(document.body, { id: modalId, ...modalProps });
    modalComponent.attach(); // Adds the modal to the DOM but doesn't show it
  });

  it('should render the modal into the DOM but be hidden initially', () => {
    const modalElement = document.getElementById(modalId);
    expect(modalElement).not.toBeNull();
    expect(window.getComputedStyle(modalElement).display).toBe('none'); // Or check for a 'is-hidden' class
  });

  describe('show()', () => {
    it('should make the modal visible', () => {
      modalComponent.show();
      const modalElement = document.getElementById(modalId);
      expect(window.getComputedStyle(modalElement).display).not.toBe('none');
    });

    it('should emit a "modal:opened" event', () => {
      modalComponent.show();
      expect(mockEventBus.emit).toHaveBeenCalledWith('modal:opened', { id: modalId });
    });
  });

  describe('hide()', () => {
    it('should hide the modal', () => {
      modalComponent.show();
      modalComponent.hide();
      const modalElement = document.getElementById(modalId);
      // Test might need to account for CSS transition delays
      expect(window.getComputedStyle(modalElement).display).toBe('none');
    });

    it('should emit a "modal:closed" event', () => {
      modalComponent.show();
      modalComponent.hide();
      expect(mockEventBus.emit).toHaveBeenCalledWith('modal:closed', { id: modalId });
    });
  });

  it('should hide when the close button is clicked', () => {
    const hideSpy = mockSpy(modalComponent, 'hide');
    modalComponent.show();
    const closeButton = document.querySelector(`#${modalId} .modal-close-button`);
    closeButton.click();
    expect(hideSpy).toHaveBeenCalled();
  });

  it('should hide when the overlay is clicked', () => {
    const hideSpy = mockSpy(modalComponent, 'hide');
    modalComponent.show();
    const overlay = document.querySelector(`#${modalId} .modal-overlay`);
    overlay.click();
    expect(hideSpy).toHaveBeenCalled();
  });
  
  it('should update its content when updateContent() is called', () => {
    const newContent = '<h2>Updated Content</h2>';
    modalComponent.updateContent(newContent);
    const contentElement = document.querySelector(`#${modalId} .modal-content`);
    expect(contentElement.innerHTML).toBe(newContent);
  });
});
```

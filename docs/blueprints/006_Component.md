[<- Back to Index](./000_master_blueprint.md)

# Blueprint: Component.js

**Objective:** To create a base class for all UI components.

**Test Specification:** `tests/core/Component.test.js`

```javascript
import { Component } from '../../js/core/Component.js';
import { StateManager } from '../../js/core/StateManager.js';
import { expect } from '../../js/testing/expect.js';
import { describe, it, beforeEach, mockFn } from '../../js/testing/veritas.js';

// A simple test component for our tests
class TestComponent extends Component {
  constructor(host, props) {
    super(host, props);
    // Subscribe to a state path that will be used in render
    this.subscribeToState('test.value'); 
  }

  render() {
    // Get the current state
    const stateValue = StateManager.getInstance().get('test.value') || this.props.defaultValue;
    const p = document.createElement('p');
    p.textContent = `Value: ${stateValue}`;
    p.id = 'test-component-p';
    return p;
  }
}

describe('Component Base Class', () => {
  let host;
  let stateManager;

  beforeEach(() => {
    document.body.innerHTML = '<div id="host"></div>';
    host = document.getElementById('host');
    StateManager._resetInstance();
    stateManager = StateManager.getInstance();
    stateManager.initialize({ test: { value: 'Initial' } });
  });

  // == Lifecycle Methods ==
  describe('Lifecycle', () => {
    it('should correctly store the host element and props on construction', () => {
      const props = { id: 1 };
      const component = new TestComponent(host, props);
      expect(component.host).toBe(host);
      expect(component.props).toBe(props);
    });

    it('should perform an initial render and mount to the host when attach() is called', () => {
      const component = new TestComponent(host, { defaultValue: 'Default' });
      component.attach();
      expect(host.innerHTML).not.toBe('');
      const p = host.querySelector('#test-component-p');
      expect(p).not.toBeNull();
      expect(p.textContent).toBe('Value: Initial'); // It should use the state value
    });

    it('should remove its DOM element and unsubscribe from state when destroy() is called', () => {
      const component = new TestComponent(host, {});
      component.attach();
      component.destroy();
      expect(host.innerHTML).toBe('');
      // Verify it no longer reacts to state changes
      const renderSpy = mockSpy(component, 'render');
      stateManager.set('test.value', 'Should not re-render');
      expect(renderSpy.callCount).toBe(0);
    });
  });

  // == State Reactivity ==
  describe('Reactivity', () => {
    it('should automatically re-render when a subscribed state path changes', () => {
      const component = new TestComponent(host, {});
      component.attach(); // Initial render
      
      expect(host.textContent).toBe('Value: Initial');
      
      stateManager.set('test.value', 'Updated');
      
      expect(host.textContent).toBe('Value: Updated');
    });

    it('should use the diffing utility to perform an efficient update, not a full innerHTML replacement', () => {
      const component = new TestComponent(host, {});
      component.attach();
      
      const originalParagraphElement = host.querySelector('p');
      originalParagraphElement.dataset.test = 'preserved'; // Add a property to the real DOM node
      
      stateManager.set('test.value', 'Updated');
      
      const newParagraphElement = host.querySelector('p');
      expect(newParagraphElement).toBe(originalParagraphElement); // The node itself should be the same
      expect(newParagraphElement.dataset.test).toBe('preserved'); // The property should be preserved
    });

    it('should not re-render if an unsubscribed part of the state changes', () => {
      const component = new TestComponent(host, {});
      component.attach();
      
      const renderSpy = mockSpy(component, 'render');
      stateManager.set('some.other.state', 'New Data');
      
      // Since it's only called once during attach(), callCount should be 0 here.
      // Or we can reset the spy after attach() and assert it's 0.
      expect(renderSpy.callCount).toBe(0);
    });
  });
});
```

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { Window } from 'happy-dom';
import { Component } from './Component';
import { StateManager } from '../StateManager';
import { EventBus } from '../EventBus';
import { diff, patch } from '../dom-diff';

// Mock implementation for abstract Component testing
class TestComponent extends Component {
  render(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'test-component';
    div.textContent = this.props.text || 'Default text';
    
    if (this.props.showCount) {
      const count = document.createElement('span');
      count.textContent = String(this.state.count || 0);
      div.appendChild(count);
    }
    
    return div;
  }
}

// Component with state subscription
class StateSubscribingComponent extends Component {
  constructor(host: HTMLElement, props: any = {}) {
    super(host, props);
    this.subscribeToState('user.name');
  }
  
  render(): HTMLElement {
    const div = document.createElement('div');
    const userName = this.getState('user.name') || 'Guest';
    div.textContent = `Hello, ${userName}!`;
    return div;
  }
}

// Component with event handling
class EventHandlingComponent extends Component {
  render(): HTMLElement {
    const button = document.createElement('button');
    button.textContent = 'Click me';
    button.addEventListener('click', () => {
      this.emit('button:clicked', { component: 'test' });
    });
    return button;
  }
}

describe('Component', () => {
  let window: Window;
  let document: Document;
  let container: HTMLElement;
  let stateManager: StateManager;
  let eventBus: EventBus;

  beforeEach(() => {
    // Set up happy-dom environment
    window = new Window();
    document = window.document;
    globalThis.document = document;
    globalThis.window = window as any;
    globalThis.HTMLElement = window.HTMLElement as any;
    globalThis.Element = window.Element as any;
    globalThis.Node = window.Node as any;
    globalThis.Text = window.Text as any;
    
    // Reset singletons
    StateManager._resetInstance();
    EventBus._resetInstance();
    
    // Initialize core services
    stateManager = StateManager.getInstance();
    eventBus = EventBus.getInstance();
    stateManager.setEventBus(eventBus);
    stateManager.initialize({ user: { name: 'John' }, count: 0 });
    
    // Create container
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
    window.close();
  });

  describe('constructor', () => {
    it('should initialize with host element and props', () => {
      const host = document.createElement('div');
      const props = { text: 'Hello' };
      const component = new TestComponent(host, props);
      
      expect(component).toBeDefined();
      expect(component.props).toEqual(props);
    });

    it('should set up StateManager and EventBus references', () => {
      const host = document.createElement('div');
      const component = new TestComponent(host);
      
      // Component should have access to services
      expect(component['stateManager']).toBe(stateManager);
      expect(component['eventBus']).toBe(eventBus);
    });

    it('should initialize with empty props if not provided', () => {
      const host = document.createElement('div');
      const component = new TestComponent(host);
      
      expect(component.props).toEqual({});
    });
  });

  describe('attach', () => {
    it('should render and append to host element', () => {
      const host = document.createElement('div');
      container.appendChild(host);
      
      const component = new TestComponent(host, { text: 'Test' });
      component.attach();
      
      expect(host.children).toHaveLength(1);
      expect(host.firstElementChild?.textContent).toBe('Test');
    });

    it('should store the current DOM reference', () => {
      const host = document.createElement('div');
      container.appendChild(host);
      
      const component = new TestComponent(host);
      component.attach();
      
      expect(component['currentDOM']).toBeDefined();
      expect(component['currentDOM']).toBe(host.firstElementChild);
    });

    it('should set up state change listeners for subscribed paths', () => {
      const host = document.createElement('div');
      container.appendChild(host);
      
      const component = new StateSubscribingComponent(host);
      component.attach();
      
      // Initial render
      expect(host.firstElementChild?.textContent).toBe('Hello, John!');
      
      // Update state
      stateManager.set('user.name', 'Jane');
      
      // Component should re-render
      expect(host.firstElementChild?.textContent).toBe('Hello, Jane!');
    });

    it('should be idempotent (safe to call multiple times)', () => {
      const host = document.createElement('div');
      container.appendChild(host);
      
      const component = new TestComponent(host, { text: 'Test' });
      component.attach();
      component.attach(); // Second call
      
      // Should still have only one child
      expect(host.children).toHaveLength(1);
    });
  });

  describe('destroy', () => {
    it('should remove the component from the DOM', () => {
      const host = document.createElement('div');
      container.appendChild(host);
      
      const component = new TestComponent(host);
      component.attach();
      
      expect(host.children).toHaveLength(1);
      
      component.destroy();
      
      expect(host.children).toHaveLength(0);
    });

    it('should unsubscribe from all state changes', () => {
      const host = document.createElement('div');
      container.appendChild(host);
      
      const component = new StateSubscribingComponent(host);
      component.attach();
      
      component.destroy();
      
      // Update state after destroy
      stateManager.set('user.name', 'After destroy');
      
      // Component should not re-render
      expect(host.textContent).toBe(''); // Empty after destroy
    });

    it('should clean up internal references', () => {
      const host = document.createElement('div');
      container.appendChild(host);
      
      const component = new TestComponent(host);
      component.attach();
      component.destroy();
      
      expect(component['currentDOM']).toBeNull();
      expect(component['unsubscribers']).toHaveLength(0);
    });

    it('should be safe to call multiple times', () => {
      const host = document.createElement('div');
      container.appendChild(host);
      
      const component = new TestComponent(host);
      component.attach();
      
      expect(() => {
        component.destroy();
        component.destroy(); // Second call
      }).not.toThrow();
    });
  });

  describe('render', () => {
    it('should be abstract and must be implemented by subclasses', () => {
      // This is enforced at the TypeScript level
      // The TestComponent class implements render() correctly
      const host = document.createElement('div');
      const component = new TestComponent(host);
      
      const rendered = component.render();
      expect(rendered).toBeInstanceOf(window.HTMLElement);
    });
  });

  describe('update', () => {
    it('should re-render when called', () => {
      const host = document.createElement('div');
      container.appendChild(host);
      
      const component = new TestComponent(host, { text: 'Initial' });
      component.attach();
      
      expect(host.firstElementChild?.textContent).toBe('Initial');
      
      // Change props and update
      component.props.text = 'Updated';
      component.update();
      
      expect(host.firstElementChild?.textContent).toBe('Updated');
    });

    it('should use dom-diff for efficient updates', () => {
      const host = document.createElement('div');
      container.appendChild(host);
      
      const component = new TestComponent(host, { text: 'Initial', showCount: true });
      component.attach();
      
      const initialSpan = host.querySelector('span');
      expect(initialSpan?.textContent).toBe('0');
      
      // Update only the count
      component.state.count = 5;
      component.update();
      
      const updatedSpan = host.querySelector('span');
      expect(updatedSpan?.textContent).toBe('5');
      
      // The div should be the same element (not replaced)
      expect(host.firstElementChild?.className).toBe('test-component');
    });

    it('should handle updates before attach gracefully', () => {
      const host = document.createElement('div');
      const component = new TestComponent(host);
      
      // Update before attach should not throw
      expect(() => component.update()).not.toThrow();
    });
  });

  describe('subscribeToState', () => {
    it('should subscribe to state changes at specified path', () => {
      const host = document.createElement('div');
      container.appendChild(host);
      
      const component = new StateSubscribingComponent(host);
      const updateSpy = mock();
      component.update = updateSpy;
      
      component.attach();
      
      // Change the subscribed state
      stateManager.set('user.name', 'Updated');
      
      // Update should be called
      expect(updateSpy).toHaveBeenCalled();
    });

    it('should support multiple subscriptions', () => {
      class MultiSubscriptionComponent extends Component {
        constructor(host: HTMLElement, props: any = {}) {
          super(host, props);
          this.subscribeToState('user.name');
          this.subscribeToState('count');
        }
        
        render(): HTMLElement {
          const div = document.createElement('div');
          const name = this.getState('user.name');
          const count = this.getState('count');
          div.textContent = `${name}: ${count}`;
          return div;
        }
      }
      
      const host = document.createElement('div');
      container.appendChild(host);
      
      const component = new MultiSubscriptionComponent(host);
      component.attach();
      
      expect(host.firstElementChild?.textContent).toBe('John: 0');
      
      stateManager.set('user.name', 'Jane');
      expect(host.firstElementChild?.textContent).toBe('Jane: 0');
      
      stateManager.set('count', 5);
      expect(host.firstElementChild?.textContent).toBe('Jane: 5');
    });

    it('should unsubscribe when component is destroyed', () => {
      const host = document.createElement('div');
      container.appendChild(host);
      
      const component = new StateSubscribingComponent(host);
      component.attach();
      
      component.destroy();
      
      // Change state after destroy
      stateManager.set('user.name', 'Should not update');
      
      // Component should not update
      expect(host.textContent).toBe('');
    });
  });

  describe('getState', () => {
    it('should retrieve state value at path', () => {
      const host = document.createElement('div');
      const component = new TestComponent(host);
      
      expect(component.getState('user.name')).toBe('John');
      expect(component.getState('count')).toBe(0);
    });

    it('should return undefined for non-existent paths', () => {
      const host = document.createElement('div');
      const component = new TestComponent(host);
      
      expect(component.getState('non.existent.path')).toBeUndefined();
    });

    it('should return entire state when no path provided', () => {
      const host = document.createElement('div');
      const component = new TestComponent(host);
      
      const state = component.getState();
      expect(state).toEqual({ user: { name: 'John' }, count: 0 });
    });
  });

  describe('emit', () => {
    it('should emit events through EventBus', () => {
      const host = document.createElement('div');
      container.appendChild(host);
      
      const component = new EventHandlingComponent(host);
      component.attach();
      
      const handler = mock();
      eventBus.on('button:clicked', handler);
      
      // Click the button
      const button = host.querySelector('button');
      button?.click();
      
      expect(handler).toHaveBeenCalledWith({ component: 'test' });
    });

    it('should emit events with payload', () => {
      const host = document.createElement('div');
      const component = new TestComponent(host);
      
      const handler = mock();
      eventBus.on('test:event', handler);
      
      const payload = { data: 'test data' };
      component.emit('test:event', payload);
      
      expect(handler).toHaveBeenCalledWith(payload);
    });
  });

  describe('lifecycle', () => {
    it('should follow proper lifecycle: construct -> attach -> update -> destroy', () => {
      const host = document.createElement('div');
      container.appendChild(host);
      
      // Construct
      const component = new TestComponent(host, { text: 'Lifecycle' });
      expect(host.children).toHaveLength(0);
      
      // Attach
      component.attach();
      expect(host.children).toHaveLength(1);
      expect(host.firstElementChild?.textContent).toBe('Lifecycle');
      
      // Update
      component.props.text = 'Updated';
      component.update();
      expect(host.firstElementChild?.textContent).toBe('Updated');
      
      // Destroy
      component.destroy();
      expect(host.children).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle render errors gracefully', () => {
      class ErrorComponent extends Component {
        render(): HTMLElement {
          throw new Error('Render error');
        }
      }
      
      const host = document.createElement('div');
      const component = new ErrorComponent(host);
      
      // Should not throw
      expect(() => component.attach()).not.toThrow();
      
      // Host should remain empty
      expect(host.children).toHaveLength(0);
    });
  });
});
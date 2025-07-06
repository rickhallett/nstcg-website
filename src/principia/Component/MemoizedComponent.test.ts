import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { Window } from 'happy-dom';
import { MemoizedComponent, PureComponent, StaticComponent, memo } from './MemoizedComponent';
import { OptimizedComponent } from './OptimizedComponent';
import { StateManager } from '../StateManager/StateManager';
import { ManagedEventBus } from '../EventBus/ManagedEventBus';

// Test components
class TestMemoizedComponent extends MemoizedComponent {
  render(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'memoized';
    div.textContent = `Count: ${this.props.count}, Name: ${this.props.name}`;
    
    // Add state value if subscribed
    const items = this.getState('items');
    if (items) {
      const list = document.createElement('ul');
      items.forEach((item: any) => {
        const li = document.createElement('li');
        li.textContent = item;
        list.appendChild(li);
      });
      div.appendChild(list);
    }
    
    return div;
  }
}

class TestPureComponent extends PureComponent {
  render(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'pure';
    div.textContent = `Pure: ${this.props.value}`;
    return div;
  }
}

class TestStaticComponent extends StaticComponent {
  render(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'static';
    div.textContent = 'Static content';
    return div;
  }
}

class ExpensiveComponent extends MemoizedComponent {
  render(): HTMLElement {
    const div = document.createElement('div');
    
    // Use memoization for expensive computation
    const expensiveResult = this.useMemo(
      'expensive',
      () => {
        // Simulate expensive computation
        let sum = 0;
        for (let i = 0; i < this.props.iterations; i++) {
          sum += i;
        }
        return sum;
      },
      [this.props.iterations]
    );
    
    div.textContent = `Result: ${expensiveResult}`;
    
    // Memoized callback
    const handleClick = this.useCallback(
      'click',
      () => console.log('Clicked!'),
      []
    );
    
    div.onclick = handleClick;
    
    return div;
  }
}

describe('MemoizedComponent', () => {
  let window: Window;
  let document: Document;
  let container: HTMLElement;

  beforeEach(() => {
    // Reset singletons FIRST before any other setup
    StateManager._resetInstance();
    ManagedEventBus._resetInstance();
    
    window = new Window();
    document = window.document;
    globalThis.document = document;
    globalThis.window = window as any;
    globalThis.HTMLElement = window.HTMLElement as any;
    globalThis.Element = window.Element as any;
    globalThis.Node = window.Node as any;
    globalThis.Text = window.Text as any;
    globalThis.requestAnimationFrame = ((fn: Function) => setTimeout(fn, 0)) as any;
    
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
    window.close();
  });

  describe('basic memoization', () => {
    it('should skip render when props are unchanged', () => {
      const component = new TestMemoizedComponent(container, {
        props: { count: 1, name: 'Test' },
        trackRenders: true
      });
      
      component.attach();
      expect(component.getRenderCount()).toBe(1);
      
      // Update with same props
      component.update();
      expect(component.getRenderCount()).toBe(1);
      
      // Update with different props
      component.props.count = 2;
      component.update();
      expect(component.getRenderCount()).toBe(2);
    });

    it('should use custom equality function', () => {
      const customEqual = mock((a: any, b: any) => {
        // Always consider equal if both have same id
        return a.id === b.id;
      });
      
      const component = new TestMemoizedComponent(container, {
        props: { id: 1, value: 'A' },
        propsEqual: customEqual
      });
      
      component.attach();
      const initialRender = container.innerHTML;
      
      // Change value but keep same id
      component.props.value = 'B';
      component.update();
      
      expect(customEqual).toHaveBeenCalled();
      expect(container.innerHTML).toBe(initialRender); // No re-render
    });

    it('should support deep equality checking', () => {
      const component = new TestMemoizedComponent(container, {
        props: { 
          user: { name: 'John', age: 30 },
          count: 1
        },
        deepEqual: true,
        trackRenders: true
      });
      
      component.attach();
      const render1 = component.getRenderCount();
      
      // Update with equivalent object
      component.props = {
        user: { name: 'John', age: 30 },
        count: 1
      };
      component.update();
      expect(component.getRenderCount()).toBe(render1); // No re-render
      
      // Update with different nested value
      component.props = {
        user: { name: 'John', age: 31 },
        count: 1
      };
      component.update();
      expect(component.getRenderCount()).toBe(render1 + 1);
    });
  });

  describe('state memoization', () => {
    it('should skip render when subscribed state is unchanged', () => {
      // Note: This test demonstrates memoization with manual state tracking.
      // In a real app, the Component base class would handle automatic updates on state changes.
      
      class StateComponent extends MemoizedComponent {
        private items: string[] = [];
        
        constructor(host: HTMLElement, options?: any) {
          super(host, options);
          // Simulate state subscription by tracking in component
          this.items = ['A', 'B', 'C'];
        }
        
        render(): HTMLElement {
          const div = document.createElement('div');
          div.textContent = this.items.join(',');
          return div;
        }
        
        // Override getState to return our local state
        protected getState(path: string): any {
          if (path === 'items') return this.items;
          return undefined;
        }
        
        // Method to update our simulated state
        setItems(newItems: string[]) {
          this.items = newItems;
        }
      }
      
      const component = new StateComponent(container, {
        trackRenders: true,
        deepEqual: true  // Use deep equality for arrays
      });
      
      // Manually subscribe to state path
      (component as any).subscribeToState('items');
      
      component.attach();
      expect(component.getRenderCount()).toBe(1);
      expect(container.textContent).toBe('A,B,C');
      
      // Set same state value
      component.setItems(['A', 'B', 'C']);
      component.update();
      expect(component.getRenderCount()).toBe(1); // No re-render due to memoization
      
      // Set different state value
      component.setItems(['A', 'B', 'C', 'D']);
      component.update();
      expect(component.getRenderCount()).toBe(2);
      expect(container.textContent).toBe('A,B,C,D');
    });
  });

  describe('force update', () => {
    it('should force update regardless of memoization', () => {
      const component = new TestMemoizedComponent(container, {
        props: { count: 1 },
        trackRenders: true
      });
      
      component.attach();
      expect(component.getRenderCount()).toBe(1);
      
      // Force update without prop changes
      component.forceUpdate();
      expect(component.getRenderCount()).toBe(2);
    });
  });

  describe('useMemo', () => {
    it('should memoize expensive computations', () => {
      const expensiveFn = mock(() => {
        // Simulate expensive computation
        return Math.random();
      });
      
      class MemoComponent extends MemoizedComponent {
        render(): HTMLElement {
          const div = document.createElement('div');
          
          const result = this.useMemo(
            'expensive',
            expensiveFn,
            [this.props.input]
          );
          
          div.textContent = `Result: ${result}`;
          return div;
        }
      }
      
      const component = new MemoComponent(container, {
        props: { input: 'A' }
      });
      
      component.attach();
      expect(expensiveFn).toHaveBeenCalledTimes(1);
      const firstResult = container.textContent;
      
      // Update without changing dependency
      component.props.other = 'B';
      component.update();
      expect(expensiveFn).toHaveBeenCalledTimes(1);
      expect(container.textContent).toBe(firstResult);
      
      // Update with changed dependency
      component.props.input = 'B';
      component.update();
      expect(expensiveFn).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple dependencies', () => {
      const component = new ExpensiveComponent(container, {
        props: { iterations: 100 }
      });
      
      component.attach();
      const result1 = container.textContent;
      
      // Same iterations, no recompute
      component.update();
      expect(container.textContent).toBe(result1);
      
      // Different iterations, recompute
      component.props.iterations = 200;
      component.update();
      expect(container.textContent).not.toBe(result1);
    });
  });

  describe('useCallback', () => {
    it('should memoize callbacks', () => {
      const callbackRefs: any[] = [];
      
      class CallbackComponent extends MemoizedComponent {
        render(): HTMLElement {
          const div = document.createElement('div');
          
          const callback = this.useCallback(
            'handler',
            () => console.log(this.props.message),
            [this.props.message]
          );
          
          callbackRefs.push(callback);
          
          div.onclick = callback;
          return div;
        }
      }
      
      const component = new CallbackComponent(container, {
        props: { message: 'Hello' }
      });
      
      component.attach();
      expect(callbackRefs.length).toBe(1);
      
      component.update();
      expect(callbackRefs.length).toBe(1); // Should not re-render
      
      // Force render with same props
      component.forceUpdate();
      expect(callbackRefs.length).toBe(2);
      
      // Same dependency, same callback reference
      expect(callbackRefs[0]).toBe(callbackRefs[1]);
      
      // Change dependency
      component.props.message = 'World';
      component.update();
      
      // New callback reference
      expect(callbackRefs[2]).not.toBe(callbackRefs[0]);
    });
  });

  describe('PureComponent', () => {
    it('should use shallow comparison', () => {
      const component = new TestPureComponent(container, {
        props: { value: 'Test', obj: { a: 1 } },
        trackRenders: true
      });
      
      component.attach();
      const render1 = component.getRenderCount();
      
      // Same object reference, no re-render
      component.update();
      expect(component.getRenderCount()).toBe(render1);
      
      // New object reference, re-render
      component.props.obj = { a: 1 };
      component.update();
      expect(component.getRenderCount()).toBe(render1 + 1);
    });
  });

  describe('StaticComponent', () => {
    it('should only render once', () => {
      const component = new TestStaticComponent(container, {
        trackRenders: true
      });
      
      component.attach();
      expect(component.getRenderCount()).toBe(1);
      const initialContent = container.innerHTML;
      
      // Try to update multiple times
      component.update();
      component.forceUpdate();
      component.update();
      
      // Should still have only rendered once
      expect(component.getRenderCount()).toBe(1);
      expect(container.innerHTML).toBe(initialContent);
    });
  });

  describe('memo HOC', () => {
    it('should memoize any component', () => {
      class RegularComponent extends OptimizedComponent {
        render(): HTMLElement {
          const div = document.createElement('div');
          div.textContent = `Regular: ${this.props.text}`;
          return div;
        }
      }
      
      const MemoizedRegular = memo(RegularComponent);
      const component = new MemoizedRegular(container, {
        props: { text: 'Hello' }
      });
      
      component.attach();
      const initialContent = container.innerHTML;
      
      // Update with same props
      component.update();
      expect(container.innerHTML).toBe(initialContent);
      
      // Update with different props
      component.props.text = 'World';
      component.update();
      expect(container.innerHTML).toContain('World');
    });
  });

  describe('memory management', () => {
    it('should clear cache on destroy', () => {
      const component = new ExpensiveComponent(container, {
        props: { iterations: 100 }
      });
      
      component.attach();
      
      // Use memoization
      component.props.iterations = 200;
      component.update();
      
      // Destroy should clear cache
      const clearSpy = mock();
      component['clearMemoCache'] = clearSpy;
      component.destroy();
      
      expect(clearSpy).toHaveBeenCalled();
    });
  });

  describe('performance', () => {
    it('should improve performance for expensive renders', () => {
      class ExpensiveRenderComponent extends MemoizedComponent {
        render(): HTMLElement {
          const div = document.createElement('div');
          
          // Simulate expensive render
          for (let i = 0; i < 1000; i++) {
            const span = document.createElement('span');
            span.textContent = `${i}`;
            div.appendChild(span);
          }
          
          return div;
        }
      }
      
      const component = new ExpensiveRenderComponent(container, {
        props: { value: 1 }
      });
      
      const start1 = performance.now();
      component.attach();
      const renderTime = performance.now() - start1;
      
      // Multiple updates with same props should be instant
      const start2 = performance.now();
      for (let i = 0; i < 10; i++) {
        component.update();
      }
      const skipTime = performance.now() - start2;
      
      // Skipped renders should be much faster
      expect(skipTime).toBeLessThan(renderTime);
    });
  });
});
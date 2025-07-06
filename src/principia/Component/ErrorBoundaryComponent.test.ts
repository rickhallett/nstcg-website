import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { ErrorBoundaryComponent } from './ErrorBoundaryComponent';
import { ManagedEventBus } from '../EventBus/ManagedEventBus';
import { StateManager } from '../StateManager';
import { LoggerService } from '../LoggerService';

// Test components with various error scenarios
class BrokenRenderComponent extends ErrorBoundaryComponent {
  render(): HTMLElement {
    throw new Error('Render failed!');
  }
}

class BrokenLifecycleComponent extends ErrorBoundaryComponent {
  render(): HTMLElement {
    const div = document.createElement('div');
    div.textContent = 'Will break in lifecycle';
    return div;
  }
  
  onAfterAttach(): void {
    throw new Error('Lifecycle error!');
  }
}

class WorkingComponent extends ErrorBoundaryComponent {
  renderCount = 0;
  
  render(): HTMLElement {
    this.renderCount++;
    const div = document.createElement('div');
    div.textContent = `Render count: ${this.renderCount}`;
    return div;
  }
}

class RecoverableComponent extends ErrorBoundaryComponent {
  attemptCount = 0;
  
  render(): HTMLElement {
    this.attemptCount++;
    if (this.attemptCount < 3) {
      throw new Error(`Attempt ${this.attemptCount} failed`);
    }
    const div = document.createElement('div');
    div.textContent = 'Successfully recovered!';
    return div;
  }
}

class ParentComponent extends ErrorBoundaryComponent {
  childError: Error | null = null;
  
  onChildError(error: Error, child: ErrorBoundaryComponent): boolean {
    this.childError = error;
    // Return true to handle the error (prevent propagation)
    return true;
  }
  
  render(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'parent';
    div.textContent = this.childError ? `Child error: ${this.childError.message}` : 'Parent ready';
    return div;
  }
}

describe('ErrorBoundaryComponent', () => {
  let host: HTMLElement;
  let logger: LoggerService;
  
  beforeEach(() => {
    // Reset singletons
    ManagedEventBus._resetInstance();
    StateManager._resetInstance();
    LoggerService._resetInstance();
    
    // Create host
    host = document.createElement('div');
    document.body.appendChild(host);
    
    // Get logger for spy
    logger = LoggerService.getInstance();
  });
  
  afterEach(() => {
    if (host.parentNode) {
      host.parentNode.removeChild(host);
    }
  });
  
  describe('error catching', () => {
    it('should catch errors during render and show fallback UI', () => {
      const component = new BrokenRenderComponent(host);
      const errorSpy = mock();
      logger.error = errorSpy;
      
      component.attach();
      
      // Should show error UI instead of crashing
      expect(host.innerHTML).toContain('error-boundary');
      expect(host.innerHTML).toContain('Render failed!');
      expect(errorSpy).toHaveBeenCalledWith('Component error:', expect.any(Error));
    });
    
    it('should catch errors in lifecycle methods', () => {
      const component = new BrokenLifecycleComponent(host);
      const errorSpy = mock();
      logger.error = errorSpy;
      
      // Should not throw
      expect(() => component.attach()).not.toThrow();
      
      // Should show error UI
      expect(host.innerHTML).toContain('error-boundary');
      expect(host.innerHTML).toContain('Lifecycle error!');
    });
    
    it('should provide customizable error UI', () => {
      class CustomErrorComponent extends ErrorBoundaryComponent {
        render(): HTMLElement {
          throw new Error('Custom error');
        }
        
        renderError(error: Error): HTMLElement {
          const div = document.createElement('div');
          div.className = 'custom-error';
          div.innerHTML = `<h1>Oops!</h1><p>${error.message}</p>`;
          return div;
        }
      }
      
      const component = new CustomErrorComponent(host);
      component.attach();
      
      expect(host.innerHTML).toContain('custom-error');
      expect(host.innerHTML).toContain('<h1>Oops!</h1>');
      expect(host.innerHTML).toContain('Custom error');
    });
    
    it('should catch errors in event handlers', () => {
      class EventErrorComponent extends ErrorBoundaryComponent {
        render(): HTMLElement {
          const button = document.createElement('button');
          button.textContent = 'Click me';
          button.onclick = () => {
            throw new Error('Click handler error');
          };
          return button;
        }
      }
      
      const component = new EventErrorComponent(host);
      component.attach();
      
      const errorSpy = mock();
      logger.error = errorSpy;
      
      // Click the button
      const button = host.querySelector('button')!;
      button.click();
      
      // Error should be logged but not crash
      expect(errorSpy).toHaveBeenCalled();
    });
  });
  
  describe('error recovery', () => {
    it('should support retry mechanism', () => {
      const component = new RecoverableComponent(host);
      component.maxRetries = 3;
      
      component.attach();
      
      // Should eventually succeed after retries
      expect(host.innerHTML).toContain('Successfully recovered!');
      expect(component.attemptCount).toBe(3);
    });
    
    it('should emit error events', () => {
      const component = new BrokenRenderComponent(host);
      const eventBus = ManagedEventBus.getInstance();
      const errorHandler = mock();
      
      eventBus.on('component:error', errorHandler);
      component.attach();
      
      expect(errorHandler).toHaveBeenCalledWith({
        error: expect.any(Error),
        component: component,
        phase: 'render'
      });
    });
    
    it('should reset error state on successful render', () => {
      let shouldFail = true;
      
      class ConditionalErrorComponent extends ErrorBoundaryComponent {
        render(): HTMLElement {
          if (shouldFail) {
            throw new Error('Conditional error');
          }
          const div = document.createElement('div');
          div.textContent = 'Success!';
          return div;
        }
      }
      
      const component = new ConditionalErrorComponent(host);
      component.attach();
      
      // Should show error
      expect(host.innerHTML).toContain('error-boundary');
      
      // Fix the condition and update
      shouldFail = false;
      component.update();
      
      // Should show success
      expect(host.innerHTML).toContain('Success!');
      expect(host.innerHTML).not.toContain('error-boundary');
    });
  });
  
  describe('error propagation', () => {
    it('should propagate errors to parent components', () => {
      const parent = new ParentComponent(host);
      parent.attach();
      
      const childHost = document.createElement('div');
      host.appendChild(childHost);
      
      const child = new BrokenRenderComponent(childHost);
      parent.addChild(child);
      child.attach();
      
      // Parent should have caught the error
      expect(parent.childError).toBeTruthy();
      expect(parent.childError?.message).toBe('Render failed!');
      expect(host.innerHTML).toContain('Child error: Render failed!');
    });
    
    it('should allow parent to ignore child errors', () => {
      class IgnorantParent extends ParentComponent {
        onChildError(error: Error, child: ErrorBoundaryComponent): boolean {
          // Return false to let error propagate
          return false;
        }
      }
      
      const parent = new IgnorantParent(host);
      const errorSpy = mock();
      logger.error = errorSpy;
      
      parent.attach();
      
      const childHost = document.createElement('div');
      host.appendChild(childHost);
      
      const child = new BrokenRenderComponent(childHost);
      parent.addChild(child);
      child.attach();
      
      // Error should propagate and be logged
      expect(errorSpy).toHaveBeenCalledWith('Unhandled component error:', expect.any(Error));
    });
  });
  
  describe('lifecycle hooks', () => {
    it('should call all lifecycle hooks in correct order', () => {
      const calls: string[] = [];
      
      class LifecycleTestComponent extends ErrorBoundaryComponent {
        onBeforeRender(): void { calls.push('onBeforeRender'); }
        render(): HTMLElement {
          calls.push('render');
          return document.createElement('div');
        }
        onAfterRender(element: HTMLElement): void { calls.push('onAfterRender'); }
        onBeforeAttach(): void { calls.push('onBeforeAttach'); }
        onAfterAttach(): void { calls.push('onAfterAttach'); }
        onBeforeUpdate(): void { calls.push('onBeforeUpdate'); }
        onAfterUpdate(): void { calls.push('onAfterUpdate'); }
        onBeforeDestroy(): void { calls.push('onBeforeDestroy'); }
        onAfterDestroy(): void { calls.push('onAfterDestroy'); }
      }
      
      const component = new LifecycleTestComponent(host);
      
      // Attach
      component.attach();
      expect(calls).toEqual([
        'onBeforeAttach',
        'onBeforeRender',
        'render',
        'onAfterRender',
        'onAfterAttach'
      ]);
      
      calls.length = 0;
      
      // Update
      component.update();
      expect(calls).toEqual([
        'onBeforeUpdate',
        'onBeforeRender',
        'render',
        'onAfterRender',
        'onAfterUpdate'
      ]);
      
      calls.length = 0;
      
      // Destroy
      component.destroy();
      expect(calls).toEqual([
        'onBeforeDestroy',
        'onAfterDestroy'
      ]);
    });
    
    it('should handle errors in lifecycle hooks', () => {
      class BrokenHooksComponent extends ErrorBoundaryComponent {
        onBeforeRender(): void {
          throw new Error('onBeforeRender error');
        }
        
        render(): HTMLElement {
          // Should not be called
          const div = document.createElement('div');
          div.textContent = 'Should not see this';
          return div;
        }
      }
      
      const component = new BrokenHooksComponent(host);
      const errorSpy = mock();
      logger.error = errorSpy;
      
      component.attach();
      
      // Should show error UI
      expect(host.innerHTML).toContain('error-boundary');
      expect(host.innerHTML).toContain('onBeforeRender error');
      expect(host.innerHTML).not.toContain('Should not see this');
    });
  });
  
  describe('error context and debugging', () => {
    it('should provide detailed error context', () => {
      const component = new BrokenRenderComponent(host);
      let capturedContext: any = null;
      
      component.onError = (error, context) => {
        capturedContext = context;
      };
      
      component.attach();
      
      expect(capturedContext).toBeTruthy();
      expect(capturedContext.phase).toBe('render');
      expect(capturedContext.component).toBe(component);
      expect(capturedContext.props).toBeDefined();
      expect(capturedContext.state).toBeDefined();
    });
    
    it('should track error history', () => {
      const component = new BrokenRenderComponent(host);
      component.attach();
      
      const errorHistory = component.getErrorHistory();
      expect(errorHistory.length).toBe(1);
      expect(errorHistory[0].error.message).toBe('Render failed!');
      expect(errorHistory[0].timestamp).toBeDefined();
      expect(errorHistory[0].phase).toBe('render');
    });
    
    it('should support error state snapshots', () => {
      class StatefulErrorComponent extends ErrorBoundaryComponent {
        state = { count: 0 };
        
        render(): HTMLElement {
          this.state.count++;
          if (this.state.count === 2) {
            throw new Error('Count is 2!');
          }
          const div = document.createElement('div');
          div.textContent = `Count: ${this.state.count}`;
          return div;
        }
      }
      
      const component = new StatefulErrorComponent(host);
      component.attach(); // count = 1, success
      component.update(); // count = 2, error
      
      const snapshot = component.getErrorStateSnapshot();
      expect(snapshot).toBeTruthy();
      expect(snapshot.state.count).toBe(2);
      expect(snapshot.props).toBeDefined();
      expect(snapshot.timestamp).toBeDefined();
    });
  });
  
  describe('production vs development mode', () => {
    it('should show detailed errors in development', () => {
      const component = new BrokenRenderComponent(host);
      component.isDevelopment = true;
      component.attach();
      
      // Should show stack trace
      expect(host.innerHTML).toContain('error-boundary');
      expect(host.innerHTML).toContain('Render failed!');
      expect(host.innerHTML).toContain('Stack trace');
    });
    
    it('should show generic message in production', () => {
      const component = new BrokenRenderComponent(host);
      component.isDevelopment = false;
      component.attach();
      
      // Should show generic message
      expect(host.innerHTML).toContain('error-boundary');
      expect(host.innerHTML).toContain('Something went wrong');
      expect(host.innerHTML).not.toContain('Stack trace');
      expect(host.innerHTML).not.toContain('Render failed!');
    });
  });
  
  describe('async error handling', () => {
    it('should catch errors in async operations', async () => {
      class AsyncErrorComponent extends ErrorBoundaryComponent {
        render(): HTMLElement {
          const div = document.createElement('div');
          div.textContent = 'Loading...';
          
          // Simulate async operation
          this.loadData();
          
          return div;
        }
        
        async loadData() {
          await new Promise(resolve => setTimeout(resolve, 10));
          throw new Error('Async load failed');
        }
      }
      
      const component = new AsyncErrorComponent(host);
      const errorSpy = mock();
      
      component.onError = errorSpy;
      component.attach();
      
      // Wait for async error
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
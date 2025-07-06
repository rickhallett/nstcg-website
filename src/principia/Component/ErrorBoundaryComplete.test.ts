import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { ErrorBoundaryComponent, ErrorBoundary } from './ErrorBoundaryComplete';
import { ManagedEventBus } from '../EventBus/ManagedEventBus';
import { StateManager } from '../StateManager';
import { LoggerService } from '../LoggerService';

// Test components
class BrokenComponent extends ErrorBoundaryComponent {
  doRender(): HTMLElement {
    throw new Error('Render error!');
  }
}

class WorkingComponent extends ErrorBoundaryComponent {
  renderCount = 0;
  
  doRender(): HTMLElement {
    this.renderCount++;
    const div = document.createElement('div');
    div.className = 'working';
    div.textContent = `Render ${this.renderCount}`;
    return div;
  }
}

class EventErrorComponent extends ErrorBoundaryComponent {
  doRender(): HTMLElement {
    const button = document.createElement('button');
    button.textContent = 'Click me';
    button.onclick = () => {
      throw new Error('Click error!');
    };
    return button;
  }
}

class RecoverableComponent extends ErrorBoundaryComponent {
  attempts = 0;
  
  constructor(host: HTMLElement, props: any = {}) {
    super(host, { ...props, maxRetries: 2 });
  }
  
  doRender(): HTMLElement {
    this.attempts++;
    if (this.attempts < 3) {
      throw new Error(`Attempt ${this.attempts}`);
    }
    const div = document.createElement('div');
    div.textContent = 'Success!';
    return div;
  }
}

describe('ErrorBoundaryComplete', () => {
  let host: HTMLElement;
  let logger: LoggerService;
  
  beforeEach(() => {
    ManagedEventBus._resetInstance();
    StateManager._resetInstance();
    LoggerService._resetInstance();
    
    host = document.createElement('div');
    document.body.appendChild(host);
    
    logger = LoggerService.getInstance();
  });
  
  afterEach(() => {
    if (host.parentNode) {
      host.parentNode.removeChild(host);
    }
  });
  
  describe('basic error catching', () => {
    it('should catch render errors and show fallback UI', () => {
      const component = new BrokenComponent(host);
      const errorSpy = mock();
      logger.error = errorSpy;
      
      component.attach();
      
      expect(host.innerHTML).toContain('error-boundary');
      expect(host.innerHTML).toContain('Component Error');
      expect(host.innerHTML).toContain('Render error!');
      expect(errorSpy).toHaveBeenCalledWith('Component error in render:', expect.any(Error));
    });
    
    it('should not crash the application', () => {
      const component = new BrokenComponent(host);
      
      expect(() => component.attach()).not.toThrow();
      expect(component.getErrorState().hasError).toBe(true);
      expect(component.getErrorState().error?.message).toBe('Render error!');
    });
    
    it('should show production-friendly error in production mode', () => {
      const component = new BrokenComponent(host, { isDevelopment: false });
      component.attach();
      
      expect(host.innerHTML).toContain('Something went wrong');
      expect(host.innerHTML).not.toContain('Render error!');
      expect(host.innerHTML).not.toContain('Stack trace');
    });
  });
  
  describe('error recovery', () => {
    it('should support retry with maxRetries', () => {
      const component = new RecoverableComponent(host);
      component.attach();
      
      expect(component.attempts).toBe(3);
      expect(host.innerHTML).toContain('Success!');
      expect(host.innerHTML).not.toContain('error-boundary');
    });
    
    it('should clear error state on successful update', () => {
      let shouldError = true;
      
      class ConditionalComponent extends ErrorBoundaryComponent {
        doRender(): HTMLElement {
          if (shouldError) {
            throw new Error('Conditional error');
          }
          const div = document.createElement('div');
          div.textContent = 'No error';
          return div;
        }
      }
      
      const component = new ConditionalComponent(host);
      component.attach();
      
      expect(component.getErrorState().hasError).toBe(true);
      expect(host.innerHTML).toContain('Conditional error');
      
      shouldError = false;
      component.update();
      
      expect(component.getErrorState().hasError).toBe(false);
      expect(host.innerHTML).toContain('No error');
      expect(host.innerHTML).not.toContain('error-boundary');
    });
    
    it('should support manual retry', () => {
      const component = new BrokenComponent(host);
      component.attach();
      
      expect(component.getErrorState().hasError).toBe(true);
      
      // Override doRender for retry
      component.doRender = () => {
        const div = document.createElement('div');
        div.textContent = 'Fixed!';
        return div;
      };
      
      component.retry();
      
      expect(component.getErrorState().hasError).toBe(false);
      expect(host.innerHTML).toContain('Fixed!');
    });
  });
  
  describe('event handler errors', () => {
    it('should catch errors in event handlers', () => {
      const component = new EventErrorComponent(host);
      const errorSpy = mock();
      logger.error = errorSpy;
      
      component.attach();
      
      const button = host.querySelector('button')!;
      button.click();
      
      expect(errorSpy).toHaveBeenCalledWith('Component error in event:', expect.any(Error));
      expect(component.getErrorState().hasError).toBe(true);
    });
    
    it('should show error UI after event error', () => {
      const component = new EventErrorComponent(host);
      component.attach();
      
      const button = host.querySelector('button')!;
      button.click();
      
      // Component should update to show error
      expect(host.innerHTML).toContain('error-boundary');
      expect(host.innerHTML).toContain('Click error!');
    });
  });
  
  describe('error propagation', () => {
    it('should propagate errors to parent components', () => {
      class ParentComponent extends ErrorBoundaryComponent {
        childError: Error | null = null;
        
        doRender(): HTMLElement {
          const div = document.createElement('div');
          div.className = 'parent';
          div.textContent = this.childError 
            ? `Child error: ${this.childError.message}`
            : 'No errors';
          return div;
        }
        
        onChildError(error: Error, child: ErrorBoundary): boolean {
          this.childError = error;
          return true; // Handle error
        }
      }
      
      const parent = new ParentComponent(host);
      parent.attach();
      
      const childHost = document.createElement('div');
      host.appendChild(childHost);
      
      const child = new BrokenComponent(childHost);
      parent.addChild(child);
      child.attach();
      
      // Parent should have updated
      expect(parent.getErrorState().hasError).toBe(false);
      expect(host.querySelector('.parent')!.textContent).toBe('Child error: Render error!');
    });
  });
  
  describe('error history', () => {
    it('should track error history', () => {
      const component = new BrokenComponent(host);
      component.attach();
      
      const history = component.getErrorHistory();
      expect(history.length).toBe(1);
      expect(history[0].error.message).toBe('Render error!');
      expect(history[0].info.phase).toBe('render');
    });
    
    it('should maintain error history across retries', () => {
      const component = new RecoverableComponent(host);
      component.attach();
      
      const history = component.getErrorHistory();
      expect(history.length).toBe(2); // Two failed attempts before success
      expect(history[0].error.message).toBe('Attempt 1');
      expect(history[1].error.message).toBe('Attempt 2');
    });
  });
  
  describe('custom error handling', () => {
    it('should support custom fallback UI', () => {
      const customFallback = (error: Error) => {
        const div = document.createElement('div');
        div.className = 'custom-error';
        div.innerHTML = `<h1>Oops!</h1><p>${error.message}</p>`;
        return div;
      };
      
      const component = new BrokenComponent(host, { fallbackUI: customFallback });
      component.attach();
      
      expect(host.innerHTML).toContain('custom-error');
      expect(host.innerHTML).toContain('<h1>Oops!</h1>');
      expect(host.innerHTML).toContain('Render error!');
    });
    
    it('should support custom error handler', () => {
      const errorHandler = mock();
      
      const component = new BrokenComponent(host, { onError: errorHandler });
      component.attach();
      
      expect(errorHandler).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          phase: 'render',
          componentName: 'BrokenComponent'
        })
      );
    });
  });
  
  describe('lifecycle integration', () => {
    it('should work with normal component lifecycle', () => {
      const component = new WorkingComponent(host);
      
      component.attach();
      expect(component.renderCount).toBe(1);
      expect(host.innerHTML).toContain('Render 1');
      
      component.update();
      expect(component.renderCount).toBe(2);
      expect(host.innerHTML).toContain('Render 2');
      
      component.destroy();
      expect(host.innerHTML).toBe('');
    });
  });
});
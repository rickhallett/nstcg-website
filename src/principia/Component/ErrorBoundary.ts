/**
 * @module ErrorBoundary
 * @description Production-ready error boundary implementation
 * 
 * Provides comprehensive error handling for components including:
 * - Error catching in render and lifecycle
 * - Customizable error UI
 * - Error recovery and retry
 * - Parent-child error propagation
 * - Development vs production modes
 */

import { ManagedComponent } from './ManagedComponent';
import { LoggerService } from '../LoggerService';
import { diff, patch } from '../dom-diff';

/**
 * Error context information
 */
export interface ErrorContext {
  phase: 'construct' | 'render' | 'attach' | 'update' | 'destroy' | 'event' | 'async';
  method?: string;
  props?: any;
  state?: any;
  timestamp: number;
}

/**
 * Error record for history
 */
export interface ErrorRecord {
  error: Error;
  context: ErrorContext;
  id: string;
}

/**
 * Options for error boundary behavior
 */
export interface ErrorBoundaryOptions {
  fallbackUI?: (error: Error, context: ErrorContext) => HTMLElement;
  onError?: (error: Error, context: ErrorContext) => void;
  maxRetries?: number;
  propagateErrors?: boolean;
  logErrors?: boolean;
  isDevelopment?: boolean;
}

/**
 * Error boundary mixin - adds error handling to any component
 */
export function withErrorBoundary<T extends typeof ManagedComponent>(
  BaseComponent: T,
  options: ErrorBoundaryOptions = {}
): T {
  return class extends BaseComponent {
    private _errorState = {
      hasError: false,
      error: null as Error | null,
      context: null as ErrorContext | null,
      retryCount: 0,
      errorHistory: [] as ErrorRecord[]
    };
    
    private _errorOptions: Required<ErrorBoundaryOptions> = {
      fallbackUI: options.fallbackUI || defaultErrorUI,
      onError: options.onError || (() => {}),
      maxRetries: options.maxRetries ?? 0,
      propagateErrors: options.propagateErrors ?? true,
      logErrors: options.logErrors ?? true,
      isDevelopment: options.isDevelopment ?? true
    };
    
    private _logger = LoggerService.getInstance();
    private _parent: any = null;
    private _children = new Set<any>();
    
    constructor(...args: any[]) {
      try {
        super(...args);
      } catch (error) {
        this._handleError(error as Error, 'construct');
        throw error; // Re-throw constructor errors
      }
    }
    
    /**
     * Override attach to add error handling
     */
    public attach(): void {
      try {
        // Reset error state on new attach
        if (this._errorState.hasError) {
          this._errorState.hasError = false;
          this._errorState.error = null;
          this._errorState.context = null;
          this._errorState.retryCount = 0;
        }
        
        super.attach();
      } catch (error) {
        this._handleError(error as Error, 'attach');
        // Show error UI
        const errorUI = this._errorOptions.fallbackUI(
          this._errorState.error!,
          this._errorState.context!
        );
        this.host.appendChild(errorUI);
        this.currentDOM = errorUI;
        this.isAttached = true;
      }
    }
    
    /**
     * Override update to add error handling
     */
    public update(): void {
      try {
        // Clear error state on update if we had an error
        if (this._errorState.hasError) {
          this._errorState.hasError = false;
          this._errorState.error = null;
          this._errorState.context = null;
          this._errorState.retryCount = 0;
        }
        
        super.update();
      } catch (error) {
        this._handleError(error as Error, 'update');
        // Show error UI
        if (this.currentDOM) {
          const errorUI = this._errorOptions.fallbackUI(
            this._errorState.error!,
            this._errorState.context!
          );
          this.host.innerHTML = '';
          this.host.appendChild(errorUI);
          this.currentDOM = errorUI;
        }
      }
    }
    
    /**
     * Override destroy to add error handling
     */
    public destroy(): void {
      this._wrapLifecycle(() => {
        // Clean up parent-child relationships
        if (this._parent) {
          this._parent._children.delete(this);
        }
        this._children.forEach(child => {
          child._parent = null;
        });
        this._children.clear();
        
        super.destroy();
      }, 'destroy');
    }
    
    /**
     * Override render to add error handling
     */
    public render(): HTMLElement {
      if (this._errorState.hasError && this._errorState.retryCount > this._errorOptions.maxRetries) {
        return this._errorOptions.fallbackUI(
          this._errorState.error!,
          this._errorState.context!
        );
      }
      
      try {
        const element = super.render();
        this._wrapEventHandlers(element);
        return element;
      } catch (error) {
        this._handleError(error as Error, 'render');
        
        if (this._errorState.retryCount <= this._errorOptions.maxRetries) {
          this._errorState.retryCount++;
          return this.render(); // Retry
        }
        
        return this._errorOptions.fallbackUI(
          this._errorState.error!,
          this._errorState.context!
        );
      }
    }
    
    /**
     * Add a child component for error propagation
     */
    public addChild(child: any): void {
      this._children.add(child);
      child._parent = this;
    }
    
    /**
     * Remove a child component
     */
    public removeChild(child: any): void {
      this._children.delete(child);
      if (child._parent === this) {
        child._parent = null;
      }
    }
    
    /**
     * Handle child component errors
     * Override to customize child error handling
     */
    public onChildError(error: Error, child: any): boolean {
      // Default: propagate to parent
      return false;
    }
    
    /**
     * Get error state
     */
    public getErrorState() {
      return { ...this._errorState };
    }
    
    /**
     * Get error history
     */
    public getErrorHistory(): ErrorRecord[] {
      return [...this._errorState.errorHistory];
    }
    
    /**
     * Clear error and retry
     */
    public retry(): void {
      this._errorState.hasError = false;
      this._errorState.error = null;
      this._errorState.context = null;
      this._errorState.retryCount = 0;
      this.update();
    }
    
    /**
     * Wrap lifecycle method with error handling
     */
    private _wrapLifecycle(fn: () => void, phase: ErrorContext['phase']): void {
      try {
        fn();
      } catch (error) {
        this._handleError(error as Error, phase);
      }
    }
    
    /**
     * Handle an error
     */
    private _handleError(error: Error, phase: ErrorContext['phase'], method?: string): void {
      const context: ErrorContext = {
        phase,
        method,
        props: this.props,
        state: this.state,
        timestamp: Date.now()
      };
      
      // Add isDevelopment to context for error UI
      (context as any).isDevelopment = this._errorOptions.isDevelopment;
      
      // Update error state
      this._errorState.hasError = true;
      this._errorState.error = error;
      this._errorState.context = context;
      
      // Add to history
      const errorRecord: ErrorRecord = {
        error,
        context,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      this._errorState.errorHistory.push(errorRecord);
      
      // Log if enabled
      if (this._errorOptions.logErrors) {
        this._logger.error(`Component error in ${phase}:`, error);
      }
      
      // Call error handler
      this._errorOptions.onError(error, context);
      
      // Emit error event
      this.emit('component:error', {
        error,
        component: this,
        phase,
        context
      });
      
      // Propagate to parent if enabled
      if (this._errorOptions.propagateErrors && this._parent) {
        const handled = this._parent.onChildError(error, this);
        if (handled && this._parent.update) {
          this._parent.update();
        }
      }
    }
    
    /**
     * Wrap event handlers to catch errors
     */
    private _wrapEventHandlers(element: HTMLElement): void {
      const wrapHandler = (handler: EventListener, eventType: string) => {
        return (event: Event) => {
          try {
            handler.call(element, event);
          } catch (error) {
            this._handleError(error as Error, 'event', eventType);
          }
        };
      };
      
      // Walk the DOM tree
      const walk = (node: Element) => {
        // Check attributes for inline handlers
        Array.from(node.attributes).forEach(attr => {
          if (attr.name.startsWith('on')) {
            const eventType = attr.name.substring(2);
            const handler = (node as any)[attr.name];
            if (typeof handler === 'function') {
              (node as any)[attr.name] = wrapHandler(handler, eventType);
            }
          }
        });
        
        // Recurse to children
        Array.from(node.children).forEach(walk);
      };
      
      walk(element);
    }
  } as any;
}

/**
 * Default error UI
 */
function defaultErrorUI(error: Error, context: ErrorContext): HTMLElement {
  const container = document.createElement('div');
  container.className = 'error-boundary';
  container.setAttribute('role', 'alert');
  container.style.cssText = `
    padding: 20px;
    margin: 10px;
    background-color: #fee;
    border: 1px solid #fcc;
    border-radius: 4px;
    color: #c00;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  `;
  
  // Get isDevelopment from the component's options (passed through context)
  const isDev = (context as any).isDevelopment ?? true;
  
  if (isDev) {
    container.innerHTML = `
      <h3 style="margin: 0 0 10px 0; color: #c00;">⚠️ Component Error</h3>
      <p style="margin: 0 0 10px 0;"><strong>${error.message}</strong></p>
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
        Phase: ${context.phase}${context.method ? ` (${context.method})` : ''}
      </p>
      <details style="margin-top: 10px;">
        <summary style="cursor: pointer; color: #666;">Stack trace</summary>
        <pre style="margin: 10px 0 0 0; padding: 10px; background: #fafafa; border-radius: 4px; overflow: auto; font-size: 12px; line-height: 1.4;">${error.stack}</pre>
      </details>
    `;
  } else {
    container.innerHTML = `
      <p style="margin: 0;">Something went wrong. Please refresh the page to try again.</p>
    `;
  }
  
  return container;
}

/**
 * ErrorBoundaryComponent class using the mixin
 */
export class ErrorBoundaryComponent extends withErrorBoundary(ManagedComponent) {
  // This class has all error boundary features built-in
}
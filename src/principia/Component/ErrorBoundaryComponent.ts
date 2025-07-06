/**
 * @module ErrorBoundaryComponent
 * @description Enhanced component with error boundaries and comprehensive lifecycle
 * 
 * Provides error catching, recovery, and lifecycle hooks to prevent component
 * errors from crashing the entire application. Follows React's error boundary
 * pattern adapted for vanilla JavaScript.
 * 
 * Features:
 * - Catches errors in render, lifecycle methods, and event handlers
 * - Customizable error UI with fallback
 * - Retry mechanism for recoverable errors
 * - Error propagation to parent components
 * - Comprehensive lifecycle hooks
 * - Development vs production error display
 * - Error history and state snapshots for debugging
 */

import { ManagedComponent } from './ManagedComponent';
import { LoggerService } from '../LoggerService';
import { diff, patch } from '../dom-diff';

/**
 * Error context provided to error handlers
 */
export interface ErrorContext {
  phase: 'render' | 'attach' | 'update' | 'destroy' | 'lifecycle' | 'event' | 'async';
  component: ErrorBoundaryComponent;
  props: any;
  state: any;
  method?: string;
  retryCount?: number;
}

/**
 * Error history entry
 */
export interface ErrorHistoryEntry {
  error: Error;
  context: ErrorContext;
  timestamp: number;
  phase: string;
}

/**
 * State snapshot for debugging
 */
export interface ErrorStateSnapshot {
  state: any;
  props: any;
  timestamp: number;
  error: Error;
}

/**
 * Base class for components with error boundary capabilities
 * 
 * @abstract
 * @class ErrorBoundaryComponent
 * @extends ManagedComponent
 */
export abstract class ErrorBoundaryComponent extends ManagedComponent {
  /**
   * Maximum retry attempts for recoverable errors
   */
  public maxRetries: number = 0;
  
  /**
   * Development mode flag for detailed error display
   */
  public isDevelopment: boolean = true;
  
  /**
   * Current error state
   */
  private errorState: {
    hasError: boolean;
    error: Error | null;
    retryCount: number;
    errorHistory: ErrorHistoryEntry[];
    lastSnapshot: ErrorStateSnapshot | null;
  } = {
    hasError: false,
    error: null,
    retryCount: 0,
    errorHistory: [],
    lastSnapshot: null
  };
  
  /**
   * Child components for error propagation
   */
  private children: Set<ErrorBoundaryComponent> = new Set();
  
  /**
   * Parent component reference
   */
  private parent: ErrorBoundaryComponent | null = null;
  
  /**
   * Logger instance
   */
  protected logger: LoggerService;
  
  /**
   * Promise rejection handler
   */
  private unhandledRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;
  
  constructor(host: HTMLElement, props: any = {}) {
    super(host, props);
    this.logger = LoggerService.getInstance();
    this.setupAsyncErrorHandling();
  }
  
  /**
   * Lifecycle: Called before render
   * Override in subclasses for custom logic
   */
  protected onBeforeRender(): void {
    // Override in subclasses
  }
  
  /**
   * Lifecycle: Called after render with the rendered element
   * Override in subclasses for custom logic
   */
  protected onAfterRender(element: HTMLElement): void {
    // Override in subclasses
  }
  
  /**
   * Lifecycle: Called before attaching to DOM
   * Override in subclasses for custom logic
   */
  protected onBeforeAttach(): void {
    // Override in subclasses
  }
  
  /**
   * Lifecycle: Called after attached to DOM
   * Override in subclasses for custom logic
   */
  protected onAfterAttach(): void {
    // Override in subclasses
  }
  
  /**
   * Lifecycle: Called before update
   * Override in subclasses for custom logic
   */
  protected onBeforeUpdate(): void {
    // Override in subclasses
  }
  
  /**
   * Lifecycle: Called after update
   * Override in subclasses for custom logic
   */
  protected onAfterUpdate(): void {
    // Override in subclasses
  }
  
  /**
   * Lifecycle: Called before destroy
   * Override in subclasses for custom logic
   */
  protected onBeforeDestroy(): void {
    // Override in subclasses
  }
  
  /**
   * Lifecycle: Called after destroy
   * Override in subclasses for custom logic
   */
  protected onAfterDestroy(): void {
    // Override in subclasses
  }
  
  /**
   * Error handler - called when an error occurs
   * Override to customize error handling
   * 
   * @param error The error that occurred
   * @param context Error context information
   */
  protected onError(error: Error, context: ErrorContext): void {
    // Default implementation - can be overridden
    this.logger.error('Component error:', error);
    
    // Emit error event
    this.emit('component:error', {
      error,
      component: this,
      phase: context.phase
    });
  }
  
  /**
   * Called when a child component has an error
   * Return true to handle the error, false to let it propagate
   * 
   * @param error The error from the child
   * @param child The child component that errored
   * @returns Whether the error was handled
   */
  protected onChildError(error: Error, child: ErrorBoundaryComponent): boolean {
    // Default: let errors propagate
    return false;
  }
  
  /**
   * Render error UI
   * Override to customize error display
   * 
   * @param error The error to display
   * @returns Error UI element
   */
  protected renderError(error: Error): HTMLElement {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-boundary';
    errorContainer.style.cssText = `
      padding: 20px;
      background-color: #fee;
      border: 1px solid #fcc;
      border-radius: 4px;
      color: #c00;
      font-family: sans-serif;
    `;
    
    if (this.isDevelopment) {
      // Detailed error in development
      errorContainer.innerHTML = `
        <h3 style="margin-top: 0;">Component Error</h3>
        <p><strong>${error.message}</strong></p>
        <details>
          <summary>Stack trace</summary>
          <pre style="overflow: auto; background: #fafafa; padding: 10px; font-size: 12px;">${error.stack}</pre>
        </details>
        ${this.maxRetries > 0 ? `<p><small>Retry ${this.errorState.retryCount}/${this.maxRetries}</small></p>` : ''}
      `;
    } else {
      // Generic error in production
      errorContainer.innerHTML = `
        <p>Something went wrong. Please try refreshing the page.</p>
      `;
    }
    
    return errorContainer;
  }
  
  /**
   * Attach the component with error handling
   */
  public attach(): void {
    try {
      this.executeLifecycleMethod('onBeforeAttach', 'attach');
      
      // Try to render with retries
      const element = this.renderWithErrorBoundary('attach');
      
      if (element) {
        if (this.currentDOM) {
          // Update existing
          const patches = diff(this.currentDOM as Element, element);
          patch(patches);
        } else {
          // Initial attach
          this.host.appendChild(element);
          this.currentDOM = element;
        }
        
        this.isAttached = true;
        
        // Execute after attach in try-catch to handle lifecycle errors
        try {
          this.executeLifecycleMethod('onAfterAttach', 'attach');
        } catch (error) {
          // Lifecycle error - show error UI
          this.handleError(error as Error, 'lifecycle', 'onAfterAttach');
          const errorUI = this.renderError(error as Error);
          this.host.innerHTML = '';
          this.host.appendChild(errorUI);
          this.currentDOM = errorUI;
        }
      }
    } catch (error) {
      this.handleError(error as Error, 'attach');
      // Show error UI
      const errorUI = this.renderError(error as Error);
      this.host.appendChild(errorUI);
      this.currentDOM = errorUI;
    }
  }
  
  /**
   * Update the component with error handling
   */
  public update(): void {
    if (!this.isAttached || !this.currentDOM) {
      return;
    }
    
    try {
      this.executeLifecycleMethod('onBeforeUpdate', 'update');
      
      // Clear error state on successful update attempt
      if (this.errorState.hasError) {
        this.errorState.hasError = false;
        this.errorState.error = null;
        this.errorState.retryCount = 0;
      }
      
      const element = this.renderWithErrorBoundary('update');
      
      if (element) {
        const patches = diff(this.currentDOM as Element, element);
        patch(patches);
        this.currentDOM = this.host.firstElementChild;
        
        this.executeLifecycleMethod('onAfterUpdate', 'update');
      }
    } catch (error) {
      this.handleError(error as Error, 'update');
    }
  }
  
  /**
   * Destroy the component with error handling
   */
  public destroy(): void {
    try {
      this.executeLifecycleMethod('onBeforeDestroy', 'destroy');
      
      // Remove from parent's children
      if (this.parent) {
        this.parent.children.delete(this);
      }
      
      // Clean up async error handling
      this.cleanupAsyncErrorHandling();
      
      // Call parent destroy
      super.destroy();
      
      this.executeLifecycleMethod('onAfterDestroy', 'destroy');
    } catch (error) {
      this.handleError(error as Error, 'destroy');
      // Still try to clean up even if there's an error
      super.destroy();
    }
  }
  
  /**
   * Add a child component for error propagation
   * 
   * @param child The child component to add
   */
  public addChild(child: ErrorBoundaryComponent): void {
    this.children.add(child);
    child.parent = this;
  }
  
  /**
   * Remove a child component
   * 
   * @param child The child component to remove
   */
  public removeChild(child: ErrorBoundaryComponent): void {
    this.children.delete(child);
    if (child.parent === this) {
      child.parent = null;
    }
  }
  
  /**
   * Get error history for debugging
   * 
   * @returns Array of error history entries
   */
  public getErrorHistory(): ErrorHistoryEntry[] {
    return [...this.errorState.errorHistory];
  }
  
  /**
   * Get error state snapshot for debugging
   * 
   * @returns The last error state snapshot or null
   */
  public getErrorStateSnapshot(): ErrorStateSnapshot | null {
    return this.errorState.lastSnapshot;
  }
  
  /**
   * Render with error boundary protection
   * @private
   */
  private renderWithErrorBoundary(phase: 'attach' | 'update'): HTMLElement | null {
    let retryCount = 0;
    let lastError: Error | null = null;
    
    while (retryCount <= this.maxRetries) {
      try {
        this.executeLifecycleMethod('onBeforeRender', 'render');
        const element = this.render();
        this.wrapEventHandlers(element);
        this.executeLifecycleMethod('onAfterRender', 'render', element);
        return element;
      } catch (error) {
        lastError = error as Error;
        retryCount++;
        this.errorState.retryCount = retryCount;
        
        if (retryCount > this.maxRetries) {
          // Max retries exceeded
          this.handleError(lastError, 'render');
          return this.renderError(lastError);
        }
        
        // Log retry attempt
        this.logger.warn(`Retry ${retryCount}/${this.maxRetries} for component render`);
      }
    }
    
    return null;
  }
  
  /**
   * Wrap event handlers to catch errors
   * @private
   */
  private wrapEventHandlers(element: HTMLElement): void {
    const wrapHandler = (handler: Function) => {
      return (...args: any[]) => {
        try {
          return handler.apply(this, args);
        } catch (error) {
          this.handleError(error as Error, 'event');
        }
      };
    };
    
    // Wrap inline event handlers
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_ELEMENT,
      null
    );
    
    let node: Element | null = walker.currentNode as Element;
    while (node) {
      // Check for inline event handlers
      const attributes = Array.from(node.attributes);
      for (const attr of attributes) {
        if (attr.name.startsWith('on')) {
          const handler = (node as any)[attr.name];
          if (typeof handler === 'function') {
            (node as any)[attr.name] = wrapHandler(handler);
          }
        }
      }
      node = walker.nextNode() as Element | null;
    }
  }
  
  /**
   * Execute a lifecycle method with error handling
   * @private
   */
  private executeLifecycleMethod(method: string, phase: string, ...args: any[]): void {
    try {
      const fn = (this as any)[method];
      if (typeof fn === 'function') {
        fn.apply(this, args);
      }
    } catch (error) {
      this.handleError(error as Error, phase as any, method);
    }
  }
  
  /**
   * Handle an error
   * @private
   */
  private handleError(error: Error, phase: ErrorContext['phase'], method?: string): void {
    // Update error state
    this.errorState.hasError = true;
    this.errorState.error = error;
    
    // Create error context
    const context: ErrorContext = {
      phase,
      component: this,
      props: this.props,
      state: this.state,
      method,
      retryCount: this.errorState.retryCount
    };
    
    // Add to error history
    this.errorState.errorHistory.push({
      error,
      context,
      timestamp: Date.now(),
      phase
    });
    
    // Create state snapshot
    this.errorState.lastSnapshot = {
      state: { ...this.state },
      props: { ...this.props },
      timestamp: Date.now(),
      error
    };
    
    // Call error handler
    this.onError(error, context);
    
    // Propagate to parent if not handled
    if (this.parent) {
      const handled = this.parent.onChildError(error, this);
      if (handled) {
        // Parent handled the error, trigger parent update
        this.parent.update();
      } else {
        this.logger.error('Unhandled component error:', error);
      }
    } else {
      this.logger.error('Unhandled component error:', error);
    }
  }
  
  /**
   * Setup async error handling
   * @private
   */
  private setupAsyncErrorHandling(): void {
    // Wrap setTimeout/setInterval
    const originalSetTimeout = window.setTimeout;
    const originalSetInterval = window.setInterval;
    
    // Store bound methods for cleanup
    this._wrappedSetTimeout = (handler: Function, timeout?: number, ...args: any[]) => {
      return originalSetTimeout(() => {
        try {
          handler(...args);
        } catch (error) {
          this.handleError(error as Error, 'async');
        }
      }, timeout);
    };
    
    this._wrappedSetInterval = (handler: Function, timeout?: number, ...args: any[]) => {
      return originalSetInterval(() => {
        try {
          handler(...args);
        } catch (error) {
          this.handleError(error as Error, 'async');
        }
      }, timeout);
    };
    
    // Handle unhandled promise rejections
    this.unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      const error = new Error(`Unhandled promise rejection: ${event.reason}`);
      this.handleError(error, 'async');
    };
    
    window.addEventListener('unhandledrejection', this.unhandledRejectionHandler);
  }
  
  /**
   * Cleanup async error handling
   * @private
   */
  private cleanupAsyncErrorHandling(): void {
    if (this.unhandledRejectionHandler) {
      window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler);
      this.unhandledRejectionHandler = null;
    }
  }
  
  /**
   * Helper methods for wrapped async functions
   * @private
   */
  private _wrappedSetTimeout?: typeof setTimeout;
  private _wrappedSetInterval?: typeof setInterval;
  
  /**
   * Protected wrappers for async operations
   */
  protected setTimeout(handler: Function, timeout?: number, ...args: any[]): number {
    return (this._wrappedSetTimeout || setTimeout)(handler, timeout, ...args);
  }
  
  protected setInterval(handler: Function, timeout?: number, ...args: any[]): number {
    return (this._wrappedSetInterval || setInterval)(handler, timeout, ...args);
  }
  
}
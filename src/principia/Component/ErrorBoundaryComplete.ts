/**
 * @module ErrorBoundaryComplete
 * @description Complete error boundary implementation for Principia.js
 * 
 * Provides comprehensive error handling including:
 * - Error catching in render and lifecycle methods
 * - Customizable error UI
 * - Error recovery with retry mechanism
 * - Parent-child error propagation
 * - Development vs production modes
 * - Error history tracking
 */

import { ManagedComponent } from './ManagedComponent';
import { LoggerService } from '../LoggerService';
import { diff, patch } from '../dom-diff';

/**
 * Error context information
 */
export interface ErrorInfo {
  phase: 'constructor' | 'render' | 'attach' | 'update' | 'destroy' | 'lifecycle' | 'event';
  method?: string;
  componentName: string;
  props: any;
  state: any;
  timestamp: number;
}

/**
 * Base class for components with error boundaries
 */
export class ErrorBoundary extends ManagedComponent {
  /**
   * Error state
   */
  protected errorState = {
    hasError: false,
    error: null as Error | null,
    errorInfo: null as ErrorInfo | null,
    errorHistory: [] as Array<{ error: Error; info: ErrorInfo }>,
    retryCount: 0
  };
  
  /**
   * Configuration
   */
  protected errorConfig = {
    maxRetries: 0,
    logErrors: true,
    isDevelopment: true,
    onError: null as ((error: Error, info: ErrorInfo) => void) | null,
    fallbackUI: null as ((error: Error, info: ErrorInfo) => HTMLElement) | null
  };
  
  /**
   * Logger instance
   */
  protected logger: LoggerService;
  
  /**
   * Parent error boundary (if any)
   */
  private parentErrorBoundary: ErrorBoundary | null = null;
  
  /**
   * Child error boundaries
   */
  private childErrorBoundaries = new Set<ErrorBoundary>();
  
  constructor(host: HTMLElement, props: any = {}) {
    super(host, props);
    this.logger = LoggerService.getInstance();
    
    // Extract error config from props
    if (props.maxRetries !== undefined) this.errorConfig.maxRetries = props.maxRetries;
    if (props.isDevelopment !== undefined) this.errorConfig.isDevelopment = props.isDevelopment;
    if (props.onError) this.errorConfig.onError = props.onError;
    if (props.fallbackUI) this.errorConfig.fallbackUI = props.fallbackUI;
    if (props.logErrors !== undefined) this.errorConfig.logErrors = props.logErrors;
  }
  
  /**
   * Component lifecycle: called when an error is caught
   * Override this to handle errors in your component
   */
  protected componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Default implementation - can be overridden
    if (this.errorConfig.logErrors) {
      this.logger.error(`Component error in ${errorInfo.phase}:`, error);
    }
    
    // Call custom error handler if provided
    if (this.errorConfig.onError) {
      this.errorConfig.onError(error, errorInfo);
    }
    
    // Emit error event
    this.emit('component:error', {
      error,
      errorInfo,
      component: this
    });
  }
  
  /**
   * Handle errors from child components
   * Return true to stop propagation, false to continue
   */
  protected onChildError(error: Error, child: ErrorBoundary): boolean {
    // Default: let errors propagate
    return false;
  }
  
  /**
   * Render error UI
   * Override this to customize error display
   */
  protected renderError(error: Error, errorInfo: ErrorInfo): HTMLElement {
    // Use custom fallback UI if provided
    if (this.errorConfig.fallbackUI) {
      return this.errorConfig.fallbackUI(error, errorInfo);
    }
    
    // Default error UI
    const container = document.createElement('div');
    container.className = 'error-boundary';
    container.setAttribute('role', 'alert');
    container.style.cssText = `
      padding: 20px;
      background-color: #fee;
      border: 1px solid #fcc;
      border-radius: 4px;
      color: #c00;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    `;
    
    if (this.errorConfig.isDevelopment) {
      container.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: #c00;">⚠️ Component Error</h3>
        <p style="margin: 0 0 10px 0;"><strong>${error.message}</strong></p>
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
          Component: ${errorInfo.componentName}<br>
          Phase: ${errorInfo.phase}${errorInfo.method ? ` (${errorInfo.method})` : ''}<br>
          ${this.errorConfig.maxRetries > 0 ? `Retry: ${this.errorState.retryCount}/${this.errorConfig.maxRetries}` : ''}
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
   * Override render to add error handling
   */
  public render(): HTMLElement {
    // If we're in error state and exceeded retries, show error UI
    if (this.errorState.hasError && this.errorState.retryCount > this.errorConfig.maxRetries) {
      return this.renderError(this.errorState.error!, this.errorState.errorInfo!);
    }
    
    try {
      // Call the actual render method (must be implemented by subclass)
      const element = this.doRender();
      
      // Wrap event handlers for error catching
      this.wrapEventHandlers(element);
      
      // Reset retry count on successful render
      if (this.errorState.retryCount > 0) {
        this.errorState.retryCount = 0;
      }
      
      return element;
    } catch (error) {
      return this.handleRenderError(error as Error);
    }
  }
  
  /**
   * The actual render method to be implemented by subclasses
   */
  protected doRender(): HTMLElement {
    // This method should be overridden by subclasses
    throw new Error('doRender() must be implemented by subclass');
  }
  
  /**
   * Handle render errors with retry logic
   */
  private handleRenderError(error: Error): HTMLElement {
    const errorInfo = this.createErrorInfo('render');
    
    // Update error state
    this.errorState.hasError = true;
    this.errorState.error = error;
    this.errorState.errorInfo = errorInfo;
    this.errorState.retryCount++;
    
    // Add to history
    this.errorState.errorHistory.push({ error, info: errorInfo });
    
    // Call lifecycle method
    this.componentDidCatch(error, errorInfo);
    
    // Propagate to parent if not handled
    this.propagateError(error);
    
    // If we can retry, do so
    if (this.errorState.retryCount <= this.errorConfig.maxRetries) {
      return this.render(); // Recursive retry
    }
    
    // Otherwise show error UI
    return this.renderError(error, errorInfo);
  }
  
  /**
   * Override update to clear error state on successful update
   */
  public update(): void {
    // Clear error state if we're recovering
    if (this.errorState.hasError) {
      this.errorState.hasError = false;
      this.errorState.error = null;
      this.errorState.errorInfo = null;
      this.errorState.retryCount = 0;
    }
    
    try {
      super.update();
    } catch (error) {
      this.handleLifecycleError(error as Error, 'update');
    }
  }
  
  /**
   * Override destroy to handle errors
   */
  public destroy(): void {
    try {
      // Remove from parent
      if (this.parentErrorBoundary) {
        this.parentErrorBoundary.removeChild(this);
      }
      
      // Clear children
      this.childErrorBoundaries.clear();
      
      super.destroy();
    } catch (error) {
      this.handleLifecycleError(error as Error, 'destroy');
      // Still try to clean up
      super.destroy();
    }
  }
  
  /**
   * Add a child error boundary
   */
  public addChild(child: ErrorBoundary): void {
    this.childErrorBoundaries.add(child);
    child.parentErrorBoundary = this;
  }
  
  /**
   * Remove a child error boundary
   */
  public removeChild(child: ErrorBoundary): void {
    this.childErrorBoundaries.delete(child);
    if (child.parentErrorBoundary === this) {
      child.parentErrorBoundary = null;
    }
  }
  
  /**
   * Get current error state
   */
  public getErrorState() {
    return {
      hasError: this.errorState.hasError,
      error: this.errorState.error,
      errorInfo: this.errorState.errorInfo,
      retryCount: this.errorState.retryCount
    };
  }
  
  /**
   * Get error history
   */
  public getErrorHistory() {
    return [...this.errorState.errorHistory];
  }
  
  /**
   * Retry rendering after an error
   */
  public retry(): void {
    this.errorState.hasError = false;
    this.errorState.error = null;
    this.errorState.errorInfo = null;
    this.errorState.retryCount = 0;
    this.update();
  }
  
  /**
   * Create error info object
   */
  private createErrorInfo(phase: ErrorInfo['phase'], method?: string): ErrorInfo {
    return {
      phase,
      method,
      componentName: this.constructor.name,
      props: { ...this.props },
      state: { ...this.state },
      timestamp: Date.now()
    };
  }
  
  /**
   * Handle lifecycle errors
   */
  private handleLifecycleError(error: Error, phase: ErrorInfo['phase']): void {
    const errorInfo = this.createErrorInfo(phase);
    
    this.errorState.hasError = true;
    this.errorState.error = error;
    this.errorState.errorInfo = errorInfo;
    this.errorState.errorHistory.push({ error, info: errorInfo });
    
    this.componentDidCatch(error, errorInfo);
    this.propagateError(error);
  }
  
  /**
   * Propagate error to parent
   */
  private propagateError(error: Error): void {
    if (this.parentErrorBoundary) {
      const handled = this.parentErrorBoundary.onChildError(error, this);
      if (handled) {
        // Parent handled it, trigger parent update
        this.parentErrorBoundary.update();
      }
    }
  }
  
  /**
   * Wrap event handlers to catch errors
   */
  private wrapEventHandlers(element: HTMLElement): void {
    const walk = (node: Element) => {
      // Check for inline event handlers
      Array.from(node.attributes).forEach(attr => {
        if (attr.name.startsWith('on')) {
          const originalHandler = (node as any)[attr.name];
          if (typeof originalHandler === 'function') {
            (node as any)[attr.name] = (...args: any[]) => {
              try {
                return originalHandler.apply(node, args);
              } catch (error) {
                const errorInfo = this.createErrorInfo('event', attr.name);
                this.errorState.errorHistory.push({ error: error as Error, info: errorInfo });
                this.componentDidCatch(error as Error, errorInfo);
                
                // Show error UI
                this.errorState.hasError = true;
                this.errorState.error = error as Error;
                this.errorState.errorInfo = errorInfo;
                this.update();
              }
            };
          }
        }
      });
      
      // Recurse to children
      Array.from(node.children).forEach(walk);
    };
    
    walk(element);
  }
}

/**
 * Convenience class that uses doRender pattern
 */
export abstract class ErrorBoundaryComponent extends ErrorBoundary {
  // Subclasses should implement doRender() instead of render()
  abstract doRender(): HTMLElement;
}
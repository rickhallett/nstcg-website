/**
 * @module SimpleErrorBoundaryComponent
 * @description Simplified but robust error boundary component
 * 
 * A more focused implementation that reliably catches and displays errors
 * in component render and lifecycle methods.
 */

import { ManagedComponent } from './ManagedComponent';
import { LoggerService } from '../LoggerService';
import { diff, patch } from '../dom-diff';

export interface ErrorInfo {
  error: Error;
  errorInfo: {
    componentStack?: string;
    phase: 'render' | 'attach' | 'update' | 'destroy' | 'lifecycle';
    method?: string;
  };
}

/**
 * Simplified error boundary component
 */
export abstract class SimpleErrorBoundaryComponent extends ManagedComponent {
  protected hasError: boolean = false;
  protected error: Error | null = null;
  protected errorInfo: ErrorInfo['errorInfo'] | null = null;
  protected logger: LoggerService;
  
  constructor(host: HTMLElement, props: any = {}) {
    super(host, props);
    this.logger = LoggerService.getInstance();
  }
  
  /**
   * Component did catch an error
   * Override to handle errors
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo['errorInfo']): void {
    this.logger.error('Component error:', error);
    this.emit('component:error', { error, component: this, phase: errorInfo.phase });
  }
  
  /**
   * Render error fallback UI
   * Override to customize
   */
  renderError(error: Error, errorInfo: ErrorInfo['errorInfo']): HTMLElement {
    const container = document.createElement('div');
    container.className = 'error-boundary';
    container.style.cssText = `
      padding: 20px;
      background-color: #fee;
      border: 1px solid #fcc;
      border-radius: 4px;
      color: #c00;
      font-family: sans-serif;
    `;
    
    container.innerHTML = `
      <h3 style="margin-top: 0;">Component Error</h3>
      <p><strong>${error.message}</strong></p>
      <details>
        <summary>Stack trace</summary>
        <pre style="overflow: auto; background: #fafafa; padding: 10px; font-size: 12px;">${error.stack}</pre>
      </details>
    `;
    
    return container;
  }
  
  /**
   * Attach with error boundary
   */
  public attach(): void {
    this.safeExecute(() => {
      // Reset error state on new attach
      this.hasError = false;
      this.error = null;
      this.errorInfo = null;
      
      const element = this.safeRender();
      if (element) {
        this.host.appendChild(element);
        this.currentDOM = element;
        this.isAttached = true;
      }
    }, 'attach');
  }
  
  /**
   * Update with error boundary
   */
  public update(): void {
    if (!this.isAttached) return;
    
    this.safeExecute(() => {
      // Reset error state on successful update
      if (this.hasError) {
        this.hasError = false;
        this.error = null;
        this.errorInfo = null;
      }
      
      const newElement = this.safeRender();
      if (newElement && this.currentDOM) {
        const patches = diff(this.currentDOM as Element, newElement);
        patch(patches);
        this.currentDOM = this.host.firstElementChild;
      }
    }, 'update');
  }
  
  /**
   * Safe render with error catching
   */
  private safeRender(): HTMLElement | null {
    try {
      return this.render();
    } catch (error) {
      this.handleError(error as Error, { phase: 'render' });
      return this.renderError(this.error!, this.errorInfo!);
    }
  }
  
  /**
   * Safe execute with error catching
   */
  private safeExecute(fn: () => void, phase: ErrorInfo['errorInfo']['phase']): void {
    try {
      fn();
    } catch (error) {
      this.handleError(error as Error, { phase });
    }
  }
  
  /**
   * Handle caught error
   */
  private handleError(error: Error, errorInfo: ErrorInfo['errorInfo']): void {
    this.hasError = true;
    this.error = error;
    this.errorInfo = errorInfo;
    
    // Call lifecycle method
    this.componentDidCatch(error, errorInfo);
    
    // If we're already attached, show error UI
    if (this.isAttached && this.currentDOM) {
      const errorUI = this.renderError(error, errorInfo);
      this.host.innerHTML = '';
      this.host.appendChild(errorUI);
      this.currentDOM = errorUI;
    }
  }
  
  /**
   * Get current error state
   */
  public getErrorState(): { hasError: boolean; error: Error | null; errorInfo: ErrorInfo['errorInfo'] | null } {
    return {
      hasError: this.hasError,
      error: this.error,
      errorInfo: this.errorInfo
    };
  }
  
  /**
   * Clear error state and retry
   */
  public clearError(): void {
    this.hasError = false;
    this.error = null;
    this.errorInfo = null;
    this.update();
  }
}
/**
 * @module ErrorTracker
 * @description Comprehensive error tracking and reporting
 * 
 * Captures, categorizes, and reports errors with context
 * and stack trace analysis.
 */

import { EventBus } from '../EventBus/EventBus';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error categories
 */
export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  SYSTEM = 'system',
  USER = 'user',
  UNKNOWN = 'unknown'
}

/**
 * Tracked error entry
 */
export interface TrackedError {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context: ErrorContext;
  fingerprint: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  resolved: boolean;
  metadata?: Record<string, any>;
}

/**
 * Error context
 */
export interface ErrorContext {
  url?: string;
  userAgent?: string;
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  environment?: string;
  release?: string;
  custom?: Record<string, any>;
}

/**
 * Error tracker configuration
 */
export interface ErrorTrackerConfig {
  /**
   * Enable tracking
   */
  enabled?: boolean;
  
  /**
   * Maximum errors to keep
   */
  maxErrors?: number;
  
  /**
   * Context provider function
   */
  contextProvider?: () => ErrorContext;
  
  /**
   * Error reporter function
   */
  reporter?: (errors: ErrorReport) => void;
  
  /**
   * Report interval (ms)
   */
  reportInterval?: number;
  
  /**
   * Capture unhandled rejections
   */
  captureUnhandled?: boolean;
  
  /**
   * Error filters
   */
  filters?: ErrorFilter[];
  
  /**
   * Custom fingerprint function
   */
  fingerprint?: (error: Error, context: ErrorContext) => string;
}

/**
 * Error filter
 */
export interface ErrorFilter {
  test: (error: Error, context: ErrorContext) => boolean;
  action: 'ignore' | 'modify';
  modify?: (error: Error, context: ErrorContext) => Error;
}

/**
 * Error report
 */
export interface ErrorReport {
  timestamp: number;
  errors: TrackedError[];
  summary: {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byCategory: Record<ErrorCategory, number>;
    topErrors: TrackedError[];
    errorRate: number;
  };
}

/**
 * ErrorTracker class
 */
export class ErrorTracker {
  private static instance: ErrorTracker | null = null;
  
  private enabled: boolean;
  private maxErrors: number;
  private contextProvider?: () => ErrorContext;
  private reporter?: (errors: ErrorReport) => void;
  private reportInterval: number;
  private captureUnhandled: boolean;
  private filters: ErrorFilter[];
  private fingerprintFn?: (error: Error, context: ErrorContext) => string;
  
  private errors: Map<string, TrackedError> = new Map();
  private reportTimer: NodeJS.Timeout | null = null;
  private unhandledHandlers: Array<() => void> = [];
  
  private constructor(config: ErrorTrackerConfig = {}) {
    this.enabled = config.enabled ?? true;
    this.maxErrors = config.maxErrors ?? 100;
    this.contextProvider = config.contextProvider;
    this.reporter = config.reporter;
    this.reportInterval = config.reportInterval ?? 300000; // 5 minutes
    this.captureUnhandled = config.captureUnhandled ?? true;
    this.filters = config.filters ?? [];
    this.fingerprintFn = config.fingerprint;
    
    if (this.enabled) {
      this.setupReporting();
      this.setupUnhandledCapture();
      this.setupEventListeners();
    }
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(config?: ErrorTrackerConfig): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker(config);
    }
    return ErrorTracker.instance;
  }
  
  /**
   * Reset instance (for testing)
   */
  public static resetInstance(): void {
    if (ErrorTracker.instance) {
      ErrorTracker.instance.destroy();
      ErrorTracker.instance = null;
    }
  }
  
  /**
   * Track an error
   */
  public track(
    error: Error | string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    metadata?: Record<string, any>
  ): void {
    if (!this.enabled) return;
    
    // Convert string to Error
    const err = typeof error === 'string' ? new Error(error) : error;
    
    // Get context
    const context = this.getContext();
    
    // Apply filters
    const filtered = this.applyFilters(err, context);
    if (!filtered) return;
    
    // Categorize error
    const category = this.categorizeError(filtered);
    
    // Generate fingerprint
    const fingerprint = this.generateFingerprint(filtered, context);
    
    // Check if error already exists
    const existing = this.errors.get(fingerprint);
    
    if (existing) {
      // Update existing error
      existing.count++;
      existing.lastSeen = Date.now();
      existing.resolved = false;
      
      // Update metadata
      if (metadata) {
        existing.metadata = { ...existing.metadata, ...metadata };
      }
    } else {
      // Create new error entry
      const trackedError: TrackedError = {
        id: this.generateId(),
        timestamp: Date.now(),
        message: filtered.message,
        stack: filtered.stack,
        severity,
        category,
        context,
        fingerprint,
        count: 1,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        resolved: false,
        metadata
      };
      
      this.errors.set(fingerprint, trackedError);
      
      // Emit event for new errors
      EventBus.getInstance().emit('error:tracked', trackedError);
      
      // Check severity
      if (severity === ErrorSeverity.CRITICAL) {
        EventBus.getInstance().emit('error:critical', trackedError);
      }
    }
    
    // Maintain max errors
    this.pruneErrors();
  }
  
  /**
   * Track with specific category
   */
  public trackNetwork(error: Error | string, metadata?: Record<string, any>): void {
    this.track(error, ErrorSeverity.MEDIUM, {
      ...metadata,
      category: ErrorCategory.NETWORK
    });
  }
  
  /**
   * Track validation error
   */
  public trackValidation(error: Error | string, metadata?: Record<string, any>): void {
    this.track(error, ErrorSeverity.LOW, {
      ...metadata,
      category: ErrorCategory.VALIDATION
    });
  }
  
  /**
   * Track critical error
   */
  public trackCritical(error: Error | string, metadata?: Record<string, any>): void {
    this.track(error, ErrorSeverity.CRITICAL, metadata);
  }
  
  /**
   * Get tracked errors
   */
  public getErrors(): TrackedError[] {
    return Array.from(this.errors.values());
  }
  
  /**
   * Get error by fingerprint
   */
  public getError(fingerprint: string): TrackedError | undefined {
    return this.errors.get(fingerprint);
  }
  
  /**
   * Resolve an error
   */
  public resolve(fingerprint: string): void {
    const error = this.errors.get(fingerprint);
    if (error) {
      error.resolved = true;
      EventBus.getInstance().emit('error:resolved', error);
    }
  }
  
  /**
   * Clear errors
   */
  public clear(): void {
    this.errors.clear();
  }
  
  /**
   * Get error summary
   */
  public getSummary(): ErrorReport['summary'] {
    const errors = this.getErrors();
    const summary: ErrorReport['summary'] = {
      total: errors.length,
      bySeverity: {
        [ErrorSeverity.LOW]: 0,
        [ErrorSeverity.MEDIUM]: 0,
        [ErrorSeverity.HIGH]: 0,
        [ErrorSeverity.CRITICAL]: 0
      },
      byCategory: {
        [ErrorCategory.NETWORK]: 0,
        [ErrorCategory.VALIDATION]: 0,
        [ErrorCategory.PERMISSION]: 0,
        [ErrorCategory.SYSTEM]: 0,
        [ErrorCategory.USER]: 0,
        [ErrorCategory.UNKNOWN]: 0
      },
      topErrors: [],
      errorRate: 0
    };
    
    // Count by severity and category
    for (const error of errors) {
      summary.bySeverity[error.severity]++;
      summary.byCategory[error.category]++;
    }
    
    // Get top errors
    summary.topErrors = errors
      .filter(e => !e.resolved)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Calculate error rate
    const totalCount = errors.reduce((sum, e) => sum + e.count, 0);
    const timeRange = Date.now() - Math.min(...errors.map(e => e.firstSeen));
    if (timeRange > 0) {
      summary.errorRate = totalCount / (timeRange / 1000 / 60); // errors per minute
    }
    
    return summary;
  }
  
  /**
   * Set enabled state
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    if (enabled && !this.reportTimer) {
      this.setupReporting();
      this.setupUnhandledCapture();
    } else if (!enabled) {
      this.destroy();
    }
  }
  
  /**
   * Get context
   */
  private getContext(): ErrorContext {
    const baseContext: ErrorContext = {};
    
    if (typeof window !== 'undefined') {
      baseContext.url = window.location.href;
      baseContext.userAgent = window.navigator.userAgent;
    }
    
    // Merge with custom context
    const customContext = this.contextProvider?.() ?? {};
    
    return { ...baseContext, ...customContext };
  }
  
  /**
   * Apply filters
   */
  private applyFilters(error: Error, context: ErrorContext): Error | null {
    for (const filter of this.filters) {
      if (filter.test(error, context)) {
        if (filter.action === 'ignore') {
          return null;
        } else if (filter.action === 'modify' && filter.modify) {
          error = filter.modify(error, context);
        }
      }
    }
    
    return error;
  }
  
  /**
   * Categorize error
   */
  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    
    // Network errors
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('xhr') ||
      message.includes('timeout') ||
      error.name === 'NetworkError'
    ) {
      return ErrorCategory.NETWORK;
    }
    
    // Validation errors
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required') ||
      error.name === 'ValidationError'
    ) {
      return ErrorCategory.VALIDATION;
    }
    
    // Permission errors
    if (
      message.includes('permission') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      error.name === 'PermissionError'
    ) {
      return ErrorCategory.PERMISSION;
    }
    
    // System errors
    if (
      message.includes('system') ||
      message.includes('internal') ||
      error.name === 'SystemError'
    ) {
      return ErrorCategory.SYSTEM;
    }
    
    // User errors
    if (
      message.includes('user') ||
      message.includes('input') ||
      error.name === 'UserError'
    ) {
      return ErrorCategory.USER;
    }
    
    return ErrorCategory.UNKNOWN;
  }
  
  /**
   * Generate fingerprint
   */
  private generateFingerprint(error: Error, context: ErrorContext): string {
    if (this.fingerprintFn) {
      return this.fingerprintFn(error, context);
    }
    
    // Default fingerprinting
    const parts = [
      error.name,
      error.message,
      context.component,
      context.action
    ].filter(Boolean);
    
    // Add stack trace location if available
    if (error.stack) {
      const stackLines = error.stack.split('\n');
      const relevantLine = stackLines.find(line => 
        !line.includes('node_modules') && 
        (line.includes('.js') || line.includes('.ts'))
      );
      
      if (relevantLine) {
        parts.push(relevantLine.trim());
      }
    }
    
    return parts.join('|');
  }
  
  /**
   * Prune old errors
   */
  private pruneErrors(): void {
    if (this.errors.size <= this.maxErrors) return;
    
    // Sort by last seen and remove oldest
    const sorted = Array.from(this.errors.entries())
      .sort((a, b) => a[1].lastSeen - b[1].lastSeen);
    
    const toRemove = sorted.slice(0, sorted.length - this.maxErrors);
    
    for (const [fingerprint] of toRemove) {
      this.errors.delete(fingerprint);
    }
  }
  
  /**
   * Setup reporting
   */
  private setupReporting(): void {
    if (this.reportTimer) return;
    
    this.reportTimer = setInterval(() => {
      this.generateReport();
    }, this.reportInterval);
    
    // Initial report after 10 seconds
    setTimeout(() => this.generateReport(), 10000);
  }
  
  /**
   * Generate report
   */
  private generateReport(): void {
    const report: ErrorReport = {
      timestamp: Date.now(),
      errors: this.getErrors(),
      summary: this.getSummary()
    };
    
    if (this.reporter) {
      this.reporter(report);
    }
    
    EventBus.getInstance().emit('error:report', report);
  }
  
  /**
   * Setup unhandled error capture
   */
  private setupUnhandledCapture(): void {
    if (!this.captureUnhandled) return;
    
    if (typeof window !== 'undefined') {
      // Browser environment
      const errorHandler = (event: ErrorEvent) => {
        this.track(event.error || new Error(event.message), ErrorSeverity.HIGH, {
          source: 'unhandled',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      };
      
      const rejectionHandler = (event: PromiseRejectionEvent) => {
        const error = event.reason instanceof Error ? 
          event.reason : 
          new Error(`Unhandled Promise Rejection: ${event.reason}`);
        
        this.track(error, ErrorSeverity.HIGH, {
          source: 'unhandled-promise'
        });
      };
      
      window.addEventListener('error', errorHandler);
      window.addEventListener('unhandledrejection', rejectionHandler);
      
      this.unhandledHandlers.push(
        () => window.removeEventListener('error', errorHandler),
        () => window.removeEventListener('unhandledrejection', rejectionHandler)
      );
    }
  }
  
  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    const eventBus = EventBus.getInstance();
    
    // Listen for API errors
    eventBus.on('api:error', (data: any) => {
      this.trackNetwork(data.error, {
        url: data.context?.url,
        method: data.context?.method
      });
    });
    
    // Listen for component errors
    eventBus.on('component:error', (data: any) => {
      this.track(data.error, ErrorSeverity.MEDIUM, {
        component: data.component,
        props: data.props
      });
    });
  }
  
  /**
   * Generate ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Destroy tracker
   */
  private destroy(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }
    
    // Remove unhandled handlers
    for (const handler of this.unhandledHandlers) {
      handler();
    }
    this.unhandledHandlers = [];
    
    this.clear();
  }
}

/**
 * Global error tracking functions
 */
export function trackError(
  error: Error | string,
  severity?: ErrorSeverity,
  metadata?: Record<string, any>
): void {
  ErrorTracker.getInstance().track(error, severity, metadata);
}

export function trackNetworkError(error: Error | string, metadata?: Record<string, any>): void {
  ErrorTracker.getInstance().trackNetwork(error, metadata);
}

export function trackValidationError(error: Error | string, metadata?: Record<string, any>): void {
  ErrorTracker.getInstance().trackValidation(error, metadata);
}

export function trackCriticalError(error: Error | string, metadata?: Record<string, any>): void {
  ErrorTracker.getInstance().trackCritical(error, metadata);
}
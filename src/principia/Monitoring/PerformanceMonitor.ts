/**
 * @module PerformanceMonitor
 * @description Performance monitoring and metrics collection
 * 
 * Provides comprehensive performance tracking for components,
 * API calls, state changes, and custom metrics.
 */

import { EventBus } from '../EventBus/EventBus';

/**
 * Performance entry types
 */
export enum MetricType {
  COMPONENT_RENDER = 'component-render',
  API_CALL = 'api-call',
  STATE_CHANGE = 'state-change',
  EVENT = 'event',
  CUSTOM = 'custom'
}

/**
 * Performance entry
 */
export interface PerformanceEntry {
  id: string;
  type: MetricType;
  name: string;
  startTime: number;
  duration: number;
  metadata?: Record<string, any>;
  marks?: Record<string, number>;
}

/**
 * Performance thresholds
 */
export interface PerformanceThresholds {
  componentRender?: number;
  apiCall?: number;
  stateChange?: number;
  event?: number;
  custom?: Record<string, number>;
}

/**
 * Monitor configuration
 */
export interface MonitorConfig {
  /**
   * Enable monitoring
   */
  enabled?: boolean;
  
  /**
   * Maximum entries to keep in memory
   */
  maxEntries?: number;
  
  /**
   * Performance thresholds
   */
  thresholds?: PerformanceThresholds;
  
  /**
   * Report interval (ms)
   */
  reportInterval?: number;
  
  /**
   * Custom reporter function
   */
  reporter?: (metrics: PerformanceReport) => void;
  
  /**
   * Enable console warnings
   */
  enableWarnings?: boolean;
  
  /**
   * Enable detailed tracking
   */
  detailed?: boolean;
}

/**
 * Performance report
 */
export interface PerformanceReport {
  timestamp: number;
  entries: PerformanceEntry[];
  summary: {
    totalEntries: number;
    avgDuration: Record<MetricType, number>;
    slowEntries: PerformanceEntry[];
    errorRate: number;
  };
  vitals?: WebVitals;
}

/**
 * Web Vitals metrics
 */
export interface WebVitals {
  fcp?: number;  // First Contentful Paint
  lcp?: number;  // Largest Contentful Paint
  fid?: number;  // First Input Delay
  cls?: number;  // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
}

/**
 * Active measurement
 */
interface ActiveMeasurement {
  id: string;
  type: MetricType;
  name: string;
  startTime: number;
  marks: Map<string, number>;
  metadata: Record<string, any>;
}

/**
 * PerformanceMonitor class
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor | null = null;
  
  private enabled: boolean;
  private maxEntries: number;
  private thresholds: PerformanceThresholds;
  private reportInterval: number;
  private reporter?: (metrics: PerformanceReport) => void;
  private enableWarnings: boolean;
  private detailed: boolean;
  
  private entries: PerformanceEntry[] = [];
  private activeMeasurements: Map<string, ActiveMeasurement> = new Map();
  private reportTimer: NodeJS.Timeout | null = null;
  private errorCount: number = 0;
  
  private constructor(config: MonitorConfig = {}) {
    this.enabled = config.enabled ?? true;
    this.maxEntries = config.maxEntries ?? 1000;
    this.thresholds = config.thresholds ?? {
      componentRender: 16, // 60fps
      apiCall: 1000,
      stateChange: 50,
      event: 100
    };
    this.reportInterval = config.reportInterval ?? 60000; // 1 minute
    this.reporter = config.reporter;
    this.enableWarnings = config.enableWarnings ?? true;
    this.detailed = config.detailed ?? false;
    
    if (this.enabled) {
      this.setupReporting();
      this.setupEventListeners();
      this.measureWebVitals();
    }
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(config?: MonitorConfig): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(config);
    }
    return PerformanceMonitor.instance;
  }
  
  /**
   * Reset instance (for testing)
   */
  public static resetInstance(): void {
    if (PerformanceMonitor.instance) {
      PerformanceMonitor.instance.destroy();
      PerformanceMonitor.instance = null;
    }
  }
  
  /**
   * Start a measurement
   */
  public startMeasurement(
    type: MetricType,
    name: string,
    metadata?: Record<string, any>
  ): string {
    if (!this.enabled) return '';
    
    const id = this.generateId();
    const measurement: ActiveMeasurement = {
      id,
      type,
      name,
      startTime: performance.now(),
      marks: new Map(),
      metadata: metadata || {}
    };
    
    this.activeMeasurements.set(id, measurement);
    return id;
  }
  
  /**
   * Add a mark to active measurement
   */
  public mark(measurementId: string, markName: string): void {
    if (!this.enabled) return;
    
    const measurement = this.activeMeasurements.get(measurementId);
    if (measurement) {
      measurement.marks.set(markName, performance.now());
    }
  }
  
  /**
   * End a measurement
   */
  public endMeasurement(measurementId: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;
    
    const measurement = this.activeMeasurements.get(measurementId);
    if (!measurement) return;
    
    const endTime = performance.now();
    const duration = endTime - measurement.startTime;
    
    // Convert marks to relative times
    const marks: Record<string, number> = {};
    measurement.marks.forEach((time, name) => {
      marks[name] = time - measurement.startTime;
    });
    
    const entry: PerformanceEntry = {
      id: measurement.id,
      type: measurement.type,
      name: measurement.name,
      startTime: measurement.startTime,
      duration,
      metadata: { ...measurement.metadata, ...metadata },
      marks: Object.keys(marks).length > 0 ? marks : undefined
    };
    
    this.addEntry(entry);
    this.activeMeasurements.delete(measurementId);
    
    // Check threshold
    this.checkThreshold(entry);
  }
  
  /**
   * Measure a function execution
   */
  public async measure<T>(
    type: MetricType,
    name: string,
    fn: () => T | Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const id = this.startMeasurement(type, name, metadata);
    
    try {
      const result = await fn();
      this.endMeasurement(id, { success: true });
      return result;
    } catch (error) {
      this.errorCount++;
      this.endMeasurement(id, { success: false, error: error.message });
      throw error;
    }
  }
  
  /**
   * Create a measurement decorator
   */
  public createDecorator(type: MetricType, namePrefix?: string) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function(...args: any[]) {
        const name = namePrefix ? `${namePrefix}.${propertyKey}` : propertyKey;
        const monitor = PerformanceMonitor.getInstance();
        
        return monitor.measure(
          type,
          name,
          () => originalMethod.apply(this, args),
          { className: target.constructor.name }
        );
      };
      
      return descriptor;
    };
  }
  
  /**
   * Get current metrics
   */
  public getMetrics(): PerformanceEntry[] {
    return [...this.entries];
  }
  
  /**
   * Get metrics summary
   */
  public getSummary(): PerformanceReport['summary'] {
    const summary: PerformanceReport['summary'] = {
      totalEntries: this.entries.length,
      avgDuration: {} as Record<MetricType, number>,
      slowEntries: [],
      errorRate: 0
    };
    
    // Calculate average durations by type
    const durationsByType: Record<string, number[]> = {};
    
    for (const entry of this.entries) {
      if (!durationsByType[entry.type]) {
        durationsByType[entry.type] = [];
      }
      durationsByType[entry.type].push(entry.duration);
      
      // Check if slow
      const threshold = this.getThreshold(entry.type, entry.name);
      if (entry.duration > threshold) {
        summary.slowEntries.push(entry);
      }
    }
    
    // Calculate averages
    for (const [type, durations] of Object.entries(durationsByType)) {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      summary.avgDuration[type as MetricType] = avg;
    }
    
    // Calculate error rate
    const totalCalls = this.entries.filter(e => 
      e.metadata?.success !== undefined
    ).length;
    
    if (totalCalls > 0) {
      const errors = this.entries.filter(e => 
        e.metadata?.success === false
      ).length;
      summary.errorRate = errors / totalCalls;
    }
    
    // Sort slow entries by duration
    summary.slowEntries.sort((a, b) => b.duration - a.duration);
    
    return summary;
  }
  
  /**
   * Clear metrics
   */
  public clear(): void {
    this.entries = [];
    this.activeMeasurements.clear();
    this.errorCount = 0;
  }
  
  /**
   * Enable/disable monitoring
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    if (enabled && !this.reportTimer) {
      this.setupReporting();
    } else if (!enabled && this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }
  }
  
  /**
   * Add entry
   */
  private addEntry(entry: PerformanceEntry): void {
    this.entries.push(entry);
    
    // Maintain max entries
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
    
    // Emit event
    EventBus.getInstance().emit('performance:entry', entry);
  }
  
  /**
   * Check threshold
   */
  private checkThreshold(entry: PerformanceEntry): void {
    if (!this.enableWarnings) return;
    
    const threshold = this.getThreshold(entry.type, entry.name);
    
    if (entry.duration > threshold) {
      console.warn(
        `[Performance] Slow ${entry.type}: ${entry.name} took ${entry.duration.toFixed(2)}ms (threshold: ${threshold}ms)`,
        entry.metadata
      );
      
      EventBus.getInstance().emit('performance:slow', entry);
    }
  }
  
  /**
   * Get threshold for entry
   */
  private getThreshold(type: MetricType, name: string): number {
    if (type === MetricType.CUSTOM && this.thresholds.custom?.[name]) {
      return this.thresholds.custom[name];
    }
    
    switch (type) {
      case MetricType.COMPONENT_RENDER:
        return this.thresholds.componentRender ?? 16;
      case MetricType.API_CALL:
        return this.thresholds.apiCall ?? 1000;
      case MetricType.STATE_CHANGE:
        return this.thresholds.stateChange ?? 50;
      case MetricType.EVENT:
        return this.thresholds.event ?? 100;
      default:
        return 1000;
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
  }
  
  /**
   * Generate report
   */
  private async generateReport(): Promise<void> {
    const report: PerformanceReport = {
      timestamp: Date.now(),
      entries: this.detailed ? this.getMetrics() : [],
      summary: this.getSummary(),
      vitals: await this.getWebVitals()
    };
    
    if (this.reporter) {
      this.reporter(report);
    }
    
    EventBus.getInstance().emit('performance:report', report);
  }
  
  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    const eventBus = EventBus.getInstance();
    
    // Monitor component renders
    eventBus.on('component:render', (data: any) => {
      const id = this.startMeasurement(
        MetricType.COMPONENT_RENDER,
        data.name,
        { props: data.props }
      );
      
      // End measurement on next tick
      setTimeout(() => {
        this.endMeasurement(id);
      }, 0);
    });
    
    // Monitor state changes
    eventBus.on('state:changed', (data: any) => {
      const id = this.startMeasurement(
        MetricType.STATE_CHANGE,
        data.path || 'state',
        { value: data.value }
      );
      
      setTimeout(() => {
        this.endMeasurement(id);
      }, 0);
    });
  }
  
  /**
   * Measure Web Vitals
   */
  private measureWebVitals(): void {
    if (typeof window === 'undefined' || !window.performance) return;
    
    // Measure FCP
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(e => e.name === 'first-contentful-paint');
    
    if (fcp) {
      EventBus.getInstance().emit('performance:vital', {
        name: 'FCP',
        value: fcp.startTime
      });
    }
    
    // Observe LCP
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          
          EventBus.getInstance().emit('performance:vital', {
            name: 'LCP',
            value: lastEntry.startTime
          });
        });
        
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // PerformanceObserver not supported
      }
    }
  }
  
  /**
   * Get Web Vitals
   */
  private async getWebVitals(): Promise<WebVitals | undefined> {
    if (typeof window === 'undefined' || !window.performance) return undefined;
    
    const vitals: WebVitals = {};
    
    // Get navigation timing
    const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navTiming) {
      vitals.ttfb = navTiming.responseStart - navTiming.requestStart;
    }
    
    // Get paint timing
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(e => e.name === 'first-contentful-paint');
    if (fcp) {
      vitals.fcp = fcp.startTime;
    }
    
    return vitals;
  }
  
  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Destroy monitor
   */
  private destroy(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }
    
    this.clear();
  }
}

/**
 * Performance decorator
 */
export function monitored(type: MetricType = MetricType.CUSTOM, namePrefix?: string) {
  return PerformanceMonitor.getInstance().createDecorator(type, namePrefix);
}

/**
 * Measure helper function
 */
export async function measure<T>(
  name: string,
  fn: () => T | Promise<T>,
  type: MetricType = MetricType.CUSTOM
): Promise<T> {
  return PerformanceMonitor.getInstance().measure(type, name, fn);
}
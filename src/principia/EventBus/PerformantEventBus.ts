/**
 * @module PerformantEventBus
 * @description High-performance EventBus with batching, priorities, and optimizations
 * 
 * Key features:
 * - Event batching with microtask scheduling
 * - Priority-based event handling
 * - Event interception and middleware
 * - Performance metrics tracking
 * - Wildcard event support
 * - Once listeners
 * - Event namespacing
 */

import { EventBus } from './EventBus';
import { ManagedEventBus } from './ManagedEventBus';

/**
 * Event priority levels
 */
export enum EventPriority {
  IMMEDIATE = 0,  // Processed immediately, no batching
  HIGH = 1,       // Processed first in batch
  NORMAL = 2,     // Default priority
  LOW = 3,        // Processed last in batch
  IDLE = 4        // Processed when idle
}

/**
 * Event options
 */
export interface EventOptions {
  priority?: EventPriority;
  once?: boolean;
  namespace?: string;
}

/**
 * Handler with metadata
 */
interface HandlerMetadata {
  handler: Function;
  priority: EventPriority;
  once: boolean;
  namespace?: string;
  owner?: WeakRef<object>;
}

/**
 * Batched event
 */
interface BatchedEvent {
  eventName: string;
  payload: any;
  priority: EventPriority;
  timestamp: number;
}

/**
 * Event metrics
 */
export interface EventMetrics {
  totalEvents: number;
  batchedEvents: number;
  immediateEvents: number;
  droppedEvents: number;
  averageBatchSize: number;
  maxBatchSize: number;
  processingTime: number;
  eventCounts: Map<string, number>;
}

/**
 * Middleware function
 */
export type EventMiddleware = (eventName: string, payload: any, next: () => void) => void;

/**
 * PerformantEventBus - High-performance event system
 */
export class PerformantEventBus extends ManagedEventBus {
  /**
   * Singleton instance
   */
  private static performantInstance: PerformantEventBus | null = null;
  
  /**
   * Handler storage with metadata
   */
  private handlers: Map<string, HandlerMetadata[]> = new Map();
  
  /**
   * Event batch queue
   */
  private eventBatch: BatchedEvent[] = [];
  
  /**
   * Batch processing scheduled
   */
  private batchScheduled: boolean = false;
  
  /**
   * Maximum batch size
   */
  private maxBatchSize: number = 100;
  
  /**
   * Event metrics
   */
  private metrics: EventMetrics = {
    totalEvents: 0,
    batchedEvents: 0,
    immediateEvents: 0,
    droppedEvents: 0,
    averageBatchSize: 0,
    maxBatchSize: 0,
    processingTime: 0,
    eventCounts: new Map()
  };
  
  /**
   * Middleware stack
   */
  private middleware: EventMiddleware[] = [];
  
  /**
   * Wildcard handlers
   */
  private wildcardHandlers: HandlerMetadata[] = [];
  
  /**
   * Performance tracking enabled
   */
  private trackPerformance: boolean = false;
  
  /**
   * Event deduplication
   */
  private dedupeWindow: number = 10; // ms
  private recentEvents: Map<string, number> = new Map();
  
  /**
   * Get singleton instance
   */
  public static getInstance(): PerformantEventBus {
    if (!PerformantEventBus.performantInstance) {
      PerformantEventBus.performantInstance = new PerformantEventBus();
    }
    return PerformantEventBus.performantInstance;
  }
  
  /**
   * Reset instance for testing
   */
  public static _resetInstance(): void {
    PerformantEventBus.performantInstance = null;
    ManagedEventBus._resetInstance();
  }
  
  /**
   * Enhanced on method with options
   */
  public on(
    eventName: string,
    handler: Function,
    ownerOrOptions?: object | EventOptions,
    options?: EventOptions
  ): () => void {
    // Parse arguments
    let owner: object | undefined;
    let opts: EventOptions = {};
    
    if (ownerOrOptions && typeof ownerOrOptions === 'object') {
      if ('priority' in ownerOrOptions || 'once' in ownerOrOptions || 'namespace' in ownerOrOptions) {
        opts = ownerOrOptions as EventOptions;
      } else {
        owner = ownerOrOptions;
        opts = options || {};
      }
    }
    
    // Create handler metadata
    const metadata: HandlerMetadata = {
      handler,
      priority: opts.priority || EventPriority.NORMAL,
      once: opts.once || false,
      namespace: opts.namespace,
      owner: owner ? new WeakRef(owner) : undefined
    };
    
    // Handle wildcard
    if (eventName === '*') {
      this.wildcardHandlers.push(metadata);
      return () => this.removeWildcardHandler(metadata);
    }
    
    // Add to handlers
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    
    const handlers = this.handlers.get(eventName)!;
    
    // Insert based on priority
    const insertIndex = handlers.findIndex(h => h.priority > metadata.priority);
    if (insertIndex === -1) {
      handlers.push(metadata);
    } else {
      handlers.splice(insertIndex, 0, metadata);
    }
    
    // Return unsubscribe function
    return () => this.off(eventName, handler);
  }
  
  /**
   * Enhanced emit with batching
   */
  public emit(eventName: string, payload?: any, priority?: EventPriority): void {
    // For parent class compatibility, also allow emit without priority
    if (typeof priority === 'undefined' && arguments.length === 2) {
      priority = EventPriority.NORMAL;
    }
    
    this.metrics.totalEvents++;
    this.updateEventCount(eventName);
    
    const eventPriority = priority !== undefined ? priority : EventPriority.NORMAL;
    
    // Immediate events bypass batching and deduplication
    if (eventPriority === EventPriority.IMMEDIATE) {
      this.metrics.immediateEvents++;
      this.processEvent(eventName, payload);
      return;
    }
    
    // Check for deduplication for non-immediate events
    if (this.shouldDedupe(eventName, payload)) {
      this.metrics.droppedEvents++;
      return;
    }
    
    // Add to batch
    this.eventBatch.push({
      eventName,
      payload,
      priority: eventPriority,
      timestamp: Date.now()
    });
    
    this.metrics.batchedEvents++;
    
    // Check batch size limit
    if (this.eventBatch.length >= this.maxBatchSize) {
      this.processBatch();
    } else {
      this.scheduleBatch();
    }
  }
  
  /**
   * Process event immediately
   */
  private processEvent(eventName: string, payload: any): void {
    const start = this.trackPerformance ? performance.now() : 0;
    
    // Run middleware
    this.runMiddleware(eventName, payload, () => {
      // Process wildcard handlers - create a copy to handle modifications during iteration
      if (this.wildcardHandlers.length > 0) {
        const wildcardCopy = [...this.wildcardHandlers];
        wildcardCopy.forEach(metadata => {
          this.invokeHandler(metadata, '*', payload, eventName);
        });
      }
      
      // Process specific handlers
      const handlers = this.handlers.get(eventName);
      if (handlers && handlers.length > 0) {
        // Create a copy to handle modifications during iteration
        const handlersCopy = [...handlers];
        handlersCopy.forEach(metadata => {
          this.invokeHandler(metadata, eventName, payload, eventName);
        });
      }
    });
    
    if (this.trackPerformance) {
      this.metrics.processingTime += performance.now() - start;
    }
  }
  
  /**
   * Invoke a single handler
   */
  private invokeHandler(metadata: HandlerMetadata, handlerEventName: string, payload: any, actualEventName?: string): void {
    const eventNameForHandler = actualEventName || handlerEventName;
    
    // Check if handler was already invoked (for once handlers)
    if (metadata.once && (metadata as any)._invoked) {
      return;
    }
    
    // Check if owner still exists
    if (metadata.owner && !metadata.owner.deref()) {
      this.removeHandler(handlerEventName, metadata);
      return;
    }
    
    // Mark as invoked for once handlers
    if (metadata.once) {
      (metadata as any)._invoked = true;
    }
    
    try {
      metadata.handler(payload, eventNameForHandler);
    } catch (error) {
      console.error(`Error in event handler for '${eventNameForHandler}':`, error);
    }
    
    // Remove after successful invocation
    if (metadata.once) {
      this.removeHandler(handlerEventName, metadata);
    }
  }
  
  /**
   * Schedule batch processing
   */
  private scheduleBatch(): void {
    if (this.batchScheduled) {
      return;
    }
    
    this.batchScheduled = true;
    
    // Use different scheduling based on priority
    const hasHighPriority = this.eventBatch.some(e => e.priority === EventPriority.HIGH);
    
    if (hasHighPriority) {
      // Use microtask for high priority
      queueMicrotask(() => this.processBatch());
    } else {
      // Use macrotask for normal priority
      setTimeout(() => this.processBatch(), 0);
    }
  }
  
  /**
   * Process event batch
   */
  private processBatch(): void {
    this.batchScheduled = false;
    
    if (this.eventBatch.length === 0) {
      return;
    }
    
    // Update metrics
    this.metrics.maxBatchSize = Math.max(this.metrics.maxBatchSize, this.eventBatch.length);
    const totalBatches = this.metrics.batchedEvents / (this.metrics.averageBatchSize || 1);
    this.metrics.averageBatchSize = 
      (this.metrics.averageBatchSize * totalBatches + this.eventBatch.length) / (totalBatches + 1);
    
    // Sort by priority
    const batch = this.eventBatch.sort((a, b) => a.priority - b.priority);
    this.eventBatch = [];
    
    // Process events
    batch.forEach(event => {
      this.processEvent(event.eventName, event.payload);
    });
  }
  
  /**
   * Add middleware
   */
  public use(middleware: EventMiddleware): void {
    this.middleware.push(middleware);
  }
  
  /**
   * Run middleware stack
   */
  private runMiddleware(eventName: string, payload: any, finalHandler: () => void): void {
    let index = 0;
    
    const next = () => {
      if (index >= this.middleware.length) {
        finalHandler();
        return;
      }
      
      const middleware = this.middleware[index++];
      middleware(eventName, payload, next);
    };
    
    next();
  }
  
  /**
   * Remove handler
   */
  private removeHandler(eventName: string, metadata: HandlerMetadata): void {
    // Check if it's a wildcard handler
    if (eventName === '*' || this.wildcardHandlers.includes(metadata)) {
      this.removeWildcardHandler(metadata);
      return;
    }
    
    const handlers = this.handlers.get(eventName);
    if (handlers) {
      const index = handlers.indexOf(metadata);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
      
      if (handlers.length === 0) {
        this.handlers.delete(eventName);
      }
    }
  }
  
  /**
   * Remove wildcard handler
   */
  private removeWildcardHandler(metadata: HandlerMetadata): void {
    const index = this.wildcardHandlers.indexOf(metadata);
    if (index !== -1) {
      this.wildcardHandlers.splice(index, 1);
    }
  }
  
  /**
   * Check if event should be deduped
   */
  private shouldDedupe(eventName: string, payload: any): boolean {
    const key = `${eventName}:${JSON.stringify(payload)}`;
    const lastEmit = this.recentEvents.get(key);
    const now = Date.now();
    
    if (lastEmit && now - lastEmit < this.dedupeWindow) {
      return true;
    }
    
    this.recentEvents.set(key, now);
    
    // Clean old entries
    if (this.recentEvents.size > 1000) {
      const cutoff = now - this.dedupeWindow;
      for (const [k, time] of this.recentEvents) {
        if (time < cutoff) {
          this.recentEvents.delete(k);
        }
      }
    }
    
    return false;
  }
  
  /**
   * Update event count
   */
  private updateEventCount(eventName: string): void {
    this.metrics.eventCounts.set(
      eventName,
      (this.metrics.eventCounts.get(eventName) || 0) + 1
    );
  }
  
  /**
   * Get metrics
   */
  public getMetrics(): EventMetrics {
    return { ...this.metrics, eventCounts: new Map(this.metrics.eventCounts) };
  }
  
  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      totalEvents: 0,
      batchedEvents: 0,
      immediateEvents: 0,
      droppedEvents: 0,
      averageBatchSize: 0,
      maxBatchSize: 0,
      processingTime: 0,
      eventCounts: new Map()
    };
  }
  
  /**
   * Enable performance tracking
   */
  public enablePerformanceTracking(enabled: boolean = true): void {
    this.trackPerformance = enabled;
  }
  
  /**
   * Set max batch size
   */
  public setMaxBatchSize(size: number): void {
    this.maxBatchSize = size;
  }
  
  /**
   * Set deduplication window
   */
  public setDedupeWindow(ms: number): void {
    this.dedupeWindow = ms;
  }
  
  /**
   * Remove handlers by namespace
   */
  public removeNamespace(namespace: string): void {
    // Remove from regular handlers
    for (const [eventName, handlers] of this.handlers) {
      const filtered = handlers.filter(h => h.namespace !== namespace);
      if (filtered.length === 0) {
        this.handlers.delete(eventName);
      } else {
        this.handlers.set(eventName, filtered);
      }
    }
    
    // Remove from wildcard handlers
    this.wildcardHandlers = this.wildcardHandlers.filter(h => h.namespace !== namespace);
  }
  
  /**
   * Emit with namespace
   */
  public emitNamespaced(namespace: string, eventName: string, payload?: any): void {
    const namespacedEvent = `${namespace}:${eventName}`;
    this.emit(namespacedEvent, payload);
  }
  
  /**
   * Once listener helper
   */
  public once(eventName: string, handler: Function, owner?: object): () => void {
    return this.on(eventName, handler, owner, { once: true });
  }
  
  /**
   * Wait for event (Promise-based)
   */
  public waitFor(eventName: string, timeout?: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = timeout ? setTimeout(() => {
        unsubscribe();
        reject(new Error(`Timeout waiting for event '${eventName}'`));
      }, timeout) : null;
      
      const unsubscribe = this.once(eventName, (payload: any) => {
        if (timer) clearTimeout(timer);
        resolve(payload);
      });
    });
  }
  
  /**
   * Flush pending events
   */
  public flush(): void {
    if (this.eventBatch.length > 0) {
      this.processBatch();
    }
  }
  
  /**
   * Enhanced off method
   */
  public off(eventName: string, handler?: Function): void {
    if (!handler) {
      // Remove all handlers for event
      this.handlers.delete(eventName);
      return;
    }
    
    const handlers = this.handlers.get(eventName);
    if (handlers) {
      const filtered = handlers.filter(h => h.handler !== handler);
      if (filtered.length === 0) {
        this.handlers.delete(eventName);
      } else {
        this.handlers.set(eventName, filtered);
      }
    }
  }
  
  /**
   * Clear all handlers
   */
  public clear(): void {
    this.handlers.clear();
    this.wildcardHandlers = [];
    this.eventBatch = [];
    this.middleware = [];
    this.recentEvents.clear();
    this.resetMetrics();
  }
}
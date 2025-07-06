/**
 * @module LazyStateManager
 * @description Enhanced StateManager with lazy cloning for better memory efficiency
 * 
 * Key improvements:
 * - Lazy cloning with proxy objects
 * - Copy-on-write semantics
 * - Structural sharing for unchanged parts
 * - Memory usage tracking
 * - Batch update optimizations
 */

import { StateManager } from './StateManager';
import { EventBus } from '../EventBus/EventBus';

/**
 * Proxy handler for lazy cloning
 */
class LazyCloneHandler<T extends object> implements ProxyHandler<T> {
  private cloned: boolean = false;
  private clonedValue: T | null = null;
  private readonly original: T;
  private readonly path: string;
  private readonly onWrite?: () => void;

  constructor(original: T, path: string, onWrite?: () => void) {
    this.original = original;
    this.path = path;
    this.onWrite = onWrite;
  }

  private ensureCloned(): T {
    if (!this.cloned) {
      this.clonedValue = Array.isArray(this.original) 
        ? [...this.original] as T
        : { ...this.original };
      this.cloned = true;
      if (this.onWrite) {
        this.onWrite();
      }
    }
    return this.clonedValue!;
  }

  get(target: T, prop: string | symbol, receiver: any): any {
    const value = this.cloned ? this.clonedValue![prop as keyof T] : this.original[prop as keyof T];
    
    // Return lazy proxies for nested objects
    if (value && typeof value === 'object' && !LazyStateManager.isProxy(value)) {
      return LazyStateManager.createLazyProxy(
        value,
        `${this.path}.${String(prop)}`,
        this.onWrite
      );
    }
    
    return value;
  }

  set(target: T, prop: string | symbol, value: any, receiver: any): boolean {
    const cloned = this.ensureCloned();
    cloned[prop as keyof T] = value;
    return true;
  }

  has(target: T, prop: string | symbol): boolean {
    const source = this.cloned ? this.clonedValue! : this.original;
    return prop in source;
  }

  ownKeys(target: T): ArrayLike<string | symbol> {
    const source = this.cloned ? this.clonedValue! : this.original;
    return Reflect.ownKeys(source);
  }

  getOwnPropertyDescriptor(target: T, prop: string | symbol): PropertyDescriptor | undefined {
    const source = this.cloned ? this.clonedValue! : this.original;
    return Object.getOwnPropertyDescriptor(source, prop);
  }
}

/**
 * State snapshot for efficient diffing
 */
interface StateSnapshot {
  timestamp: number;
  state: any;
  memoryUsage: number;
}

/**
 * Batch update context
 */
interface BatchContext {
  updates: Map<string, any>;
  isActive: boolean;
  scheduled: boolean;
}

/**
 * LazyStateManager - StateManager with lazy cloning optimizations
 */
export class LazyStateManager extends StateManager {
  /**
   * Singleton instance
   */
  private static lazyInstance: LazyStateManager | null = null;
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): LazyStateManager {
    if (!LazyStateManager.lazyInstance) {
      LazyStateManager.lazyInstance = new LazyStateManager();
    }
    return LazyStateManager.lazyInstance;
  }
  
  /**
   * Reset instance for testing
   */
  public static _resetInstance(): void {
    LazyStateManager.lazyInstance = null;
    StateManager._resetInstance();
  }
  /**
   * Proxy cache to avoid recreating proxies
   */
  private proxyCache: WeakMap<object, any> = new WeakMap();
  
  /**
   * Path-based proxy cache for consistent references
   */
  private pathProxyCache: Map<string, any> = new Map();
  
  /**
   * Track which paths have been accessed for optimization
   */
  private accessedPaths: Set<string> = new Set();
  
  /**
   * State snapshots for time-travel debugging
   */
  private snapshots: StateSnapshot[] = [];
  private maxSnapshots: number = 10;
  
  /**
   * Batch update context
   */
  private batchContext: BatchContext = {
    updates: new Map(),
    isActive: false,
    scheduled: false
  };
  
  /**
   * Memory usage tracking
   */
  private memoryUsageEnabled: boolean = false;
  
  /**
   * Create lazy proxy for an object
   */
  static createLazyProxy<T extends object>(
    obj: T,
    path: string = '',
    onWrite?: () => void
  ): T {
    const handler = new LazyCloneHandler(obj, path, onWrite);
    return new Proxy(obj, handler);
  }
  
  /**
   * Check if a value is a proxy
   */
  static isProxy(value: any): boolean {
    try {
      // This will throw for proxies in most engines
      return value !== Object.getPrototypeOf(value);
    } catch {
      return true;
    }
  }
  
  /**
   * Override get to return lazy proxies
   */
  public get(path?: string): any {
    // Get the value using base class
    const value = super.get(path);
    
    if (!path) {
      // Track full state access
      this.accessedPaths.add('*');
      if (value && typeof value === 'object') {
        return this.createStateLazyProxy(value);
      }
      return value;
    }
    
    // Track path access
    this.accessedPaths.add(path);
    
    // Return lazy proxy for objects
    if (value && typeof value === 'object') {
      // Check path-based cache first
      if (this.pathProxyCache.has(path)) {
        return this.pathProxyCache.get(path);
      }
      
      // Check object cache
      if (this.proxyCache.has(value)) {
        const proxy = this.proxyCache.get(value);
        this.pathProxyCache.set(path, proxy);
        return proxy;
      }
      
      const proxy = this.createStateLazyProxy(value, path);
      this.proxyCache.set(value, proxy);
      this.pathProxyCache.set(path, proxy);
      return proxy;
    }
    
    return value;
  }
  
  /**
   * Create a lazy proxy for state values
   */
  private createStateLazyProxy(obj: any, path: string = ''): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    
    return LazyStateManager.createLazyProxy(obj, path, () => {
      // Mark state as modified when written to
      if (this.memoryUsageEnabled) {
        console.log(`[LazyStateManager] Copy-on-write triggered for path: ${path}`);
      }
    });
  }
  
  /**
   * Override set for batch update support
   */
  public set(path: string, value: any): void {
    if (this.batchContext.isActive) {
      this.batchContext.updates.set(path, value);
      this.scheduleBatchFlush();
      return;
    }
    
    // Take snapshot before update
    if (this.snapshots.length >= this.maxSnapshots) {
      this.snapshots.shift();
    }
    
    if (this.memoryUsageEnabled) {
      this.snapshots.push({
        timestamp: Date.now(),
        state: this.cloneDeep(super.get()),
        memoryUsage: this.estimateMemoryUsage()
      });
    }
    
    super.set(path, value);
  }
  
  /**
   * Start a batch update
   */
  public startBatch(): void {
    this.batchContext.isActive = true;
    this.batchContext.updates.clear();
  }
  
  /**
   * End a batch update and apply all changes
   */
  public endBatch(): void {
    if (!this.batchContext.isActive) {
      return;
    }
    
    this.batchContext.isActive = false;
    this.flushBatchUpdates();
  }
  
  /**
   * Schedule batch flush for next tick
   */
  private scheduleBatchFlush(): void {
    if (this.batchContext.scheduled) {
      return;
    }
    
    this.batchContext.scheduled = true;
    Promise.resolve().then(() => {
      this.batchContext.scheduled = false;
      if (this.batchContext.isActive && this.batchContext.updates.size > 0) {
        // Auto-end batch if still active
        this.endBatch();
      }
    });
  }
  
  /**
   * Flush all batch updates
   */
  private flushBatchUpdates(): void {
    if (this.batchContext.updates.size === 0) {
      return;
    }
    
    const updates = Array.from(this.batchContext.updates.entries());
    this.batchContext.updates.clear();
    
    // Apply all updates
    const updatedPaths: string[] = [];
    updates.forEach(([path, value]) => {
      super.set(path, value);
      updatedPaths.push(path);
    });
    
    // Emit batch change event
    EventBus.getInstance().emit('state:batch-changed', { 
      paths: updatedPaths,
      values: updates.map(([_, value]) => value)
    });
  }
  
  /**
   * Get accessed paths (for debugging/optimization)
   */
  public getAccessedPaths(): string[] {
    return Array.from(this.accessedPaths);
  }
  
  /**
   * Clear accessed paths tracking
   */
  public clearAccessTracking(): void {
    this.accessedPaths.clear();
  }
  
  /**
   * Enable memory usage tracking
   */
  public enableMemoryTracking(enabled: boolean = true): void {
    this.memoryUsageEnabled = enabled;
  }
  
  /**
   * Estimate memory usage of state
   */
  private estimateMemoryUsage(): number {
    const state = super.get(); // Get full state
    const jsonString = JSON.stringify(state);
    // Rough estimate: 2 bytes per character (UTF-16)
    return jsonString.length * 2;
  }
  
  /**
   * Get memory usage statistics
   */
  public getMemoryStats(): {
    currentSize: number;
    accessedPaths: number;
    proxyCacheSize: number;
    snapshotCount: number;
  } {
    return {
      currentSize: this.estimateMemoryUsage(),
      accessedPaths: this.accessedPaths.size,
      proxyCacheSize: 0, // WeakMap size is not directly accessible
      snapshotCount: this.snapshots.length
    };
  }
  
  /**
   * Get state snapshots for debugging
   */
  public getSnapshots(): StateSnapshot[] {
    return [...this.snapshots];
  }
  
  /**
   * Restore state from a snapshot
   */
  public restoreSnapshot(timestamp: number): boolean {
    const snapshot = this.snapshots.find(s => s.timestamp === timestamp);
    if (!snapshot) {
      return false;
    }
    
    // We need to reset the state through the base class
    const state = this.cloneDeep(snapshot.state);
    super.initialize(state);
    EventBus.getInstance().emit('state:restored', { timestamp });
    return true;
  }
  
  /**
   * Override update for structural sharing
   */
  public update(updates: Record<string, any>): void {
    // Use batch updates for efficiency
    this.startBatch();
    
    Object.entries(updates).forEach(([path, value]) => {
      this.set(path, value);
    });
    
    this.endBatch();
  }
  
  /**
   * Get shallow clone (no deep cloning for efficiency)
   */
  public getShallow(path?: string): any {
    const value = super.get(path);
    
    if (!value || typeof value !== 'object') {
      return value;
    }
    
    // Return direct reference (caller's responsibility to not mutate)
    return value;
  }
  
  /**
   * Override cloneDeep for efficiency
   */
  protected cloneDeep(obj: any): any {
    // Use structured cloning when available (modern browsers/Node.js)
    if (typeof structuredClone === 'function') {
      try {
        return structuredClone(obj);
      } catch {
        // Fall back to JSON method for non-cloneable objects
      }
    }
    
    // Fallback to JSON cloning with circular reference handling
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      // If JSON fails (circular refs), return a shallow clone
      if (Array.isArray(obj)) {
        return [...obj];
      }
      return { ...obj };
    }
  }
}

/**
 * Utility function to create a lazy state manager
 */
export function createLazyStateManager(
  initialState: any = {},
  options: {
    enableMemoryTracking?: boolean;
    maxSnapshots?: number;
  } = {}
): LazyStateManager {
  const manager = LazyStateManager.getInstance();
  
  if (options.enableMemoryTracking) {
    manager.enableMemoryTracking(true);
  }
  
  if (options.maxSnapshots !== undefined) {
    (manager as any).maxSnapshots = options.maxSnapshots;
  }
  
  manager.initialize(initialState);
  return manager;
}
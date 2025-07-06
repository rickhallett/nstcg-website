/**
 * @module MemoizedComponent
 * @description Component with memoization to prevent unnecessary re-renders
 * 
 * Extends OptimizedComponent with:
 * - Props and state comparison to skip renders
 * - Configurable equality checking
 * - Render count tracking
 * - Force update capability
 * - Memoization of expensive computations
 */

import { OptimizedComponent, OptimizedComponentOptions } from './OptimizedComponent';

/**
 * Equality check function type
 */
export type EqualityFn<T> = (a: T, b: T) => boolean;

/**
 * Memoization options
 */
export interface MemoizationOptions extends OptimizedComponentOptions {
  /**
   * Custom equality function for props comparison
   */
  propsEqual?: EqualityFn<any>;
  
  /**
   * Custom equality function for state comparison
   */
  stateEqual?: EqualityFn<any>;
  
  /**
   * Enable render tracking
   */
  trackRenders?: boolean;
  
  /**
   * Enable deep equality checking (slower but more accurate)
   */
  deepEqual?: boolean;
}

/**
 * Cache entry for memoized values
 */
interface MemoEntry<T> {
  deps: any[];
  value: T;
}

/**
 * Default shallow equality check
 */
function shallowEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (a[key] !== b[key]) return false;
  }
  
  return true;
}

/**
 * Deep equality check
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  
  return true;
}

/**
 * MemoizedComponent - Component with render memoization
 */
export abstract class MemoizedComponent extends OptimizedComponent {
  /**
   * Previous props for comparison
   */
  private prevProps: any = null;
  
  /**
   * Previous state paths and values for comparison
   */
  private prevStateValues: Map<string, any> = new Map();
  
  /**
   * Subscribed state paths
   */
  private subscribedPaths: Set<string> = new Set();
  
  /**
   * Equality functions
   */
  protected propsEqual: EqualityFn<any>;
  protected stateEqual: EqualityFn<any>;
  
  /**
   * Memoization cache
   */
  private memoCache: Map<string, MemoEntry<any>> = new Map();
  
  /**
   * Force update flag
   */
  private forceUpdateFlag: boolean = false;
  
  constructor(host: HTMLElement, options: MemoizationOptions = {}) {
    super(host, options);
    
    // Set up equality functions
    const equalFn = options.deepEqual ? deepEqual : shallowEqual;
    this.propsEqual = options.propsEqual || equalFn;
    this.stateEqual = options.stateEqual || equalFn;
    
    // Store initial props
    this.prevProps = this.cloneProps(this.props);
  }
  
  /**
   * Override attach to track initial render
   */
  public attach(): void {
    // Call parent attach first (which tracks render in OptimizedComponent)
    super.attach();
    
    // Store initial state values after attach
    for (const path of this.subscribedPaths) {
      const value = this.getState(path);
      this.prevStateValues.set(path, this.cloneValue(value));
      if (this.trackRenders) {
        console.log(`${this.constructor.name} initial state '${path}':`, value);
      }
    }
    
    // Log if tracking
    if (this.trackRenders) {
      console.log(`${this.constructor.name} initial render (count: ${this.renderCount})`);
    }
  }
  
  /**
   * Override update to add memoization
   */
  public update(): void {
    // Check if update is needed
    if (!this.shouldUpdate() && !this.forceUpdateFlag) {
      if (this.trackRenders) {
        console.log(`${this.constructor.name} skipped render (no changes)`);
      }
      return;
    }
    
    // Reset force flag
    this.forceUpdateFlag = false;
    
    // Update previous values
    this.updatePrevValues();
    
    // Call parent update (which tracks render in OptimizedComponent)
    super.update();
    
    // Log if tracking
    if (this.trackRenders) {
      console.log(`${this.constructor.name} rendering (count: ${this.renderCount})`);
    }
  }
  
  /**
   * Check if component should update
   */
  protected shouldUpdate(): boolean {
    // Check props
    if (!this.propsEqual(this.prevProps, this.props)) {
      if (this.trackRenders) {
        console.log(`${this.constructor.name} props changed`);
      }
      return true;
    }
    
    // Check subscribed state values
    for (const path of this.subscribedPaths) {
      const currentValue = this.getState(path);
      const prevValue = this.prevStateValues.get(path);
      
      if (this.trackRenders) {
        console.log(`${this.constructor.name} checking state '${path}':`, 
          'prev:', prevValue, 
          'current:', currentValue,
          'equal:', this.stateEqual(prevValue, currentValue));
      }
      
      if (!this.stateEqual(prevValue, currentValue)) {
        if (this.trackRenders) {
          console.log(`${this.constructor.name} state '${path}' changed:`, prevValue, '->', currentValue);
        }
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Update previous values after render
   */
  private updatePrevValues(): void {
    // Update props
    this.prevProps = this.cloneProps(this.props);
    
    // Update state values
    for (const path of this.subscribedPaths) {
      this.prevStateValues.set(path, this.cloneValue(this.getState(path)));
    }
  }
  
  /**
   * Clone props (shallow by default)
   */
  private cloneProps(props: any): any {
    if (!props || typeof props !== 'object') return props;
    return { ...props };
  }
  
  /**
   * Clone value (shallow by default)
   */
  private cloneValue(value: any): any {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return [...value];
    return { ...value };
  }
  
  /**
   * Override subscribeToState to track paths
   */
  protected subscribeToState(path: string): void {
    this.subscribedPaths.add(path);
    this.prevStateValues.set(path, this.cloneValue(this.getState(path)));
    super.subscribeToState(path);
  }
  
  /**
   * Force an update regardless of memoization
   */
  public forceUpdate(): void {
    this.forceUpdateFlag = true;
    this.update();
  }
  
  /**
   * Get render count
   */
  public getRenderCount(): number {
    return this.renderCount;
  }
  
  /**
   * Memoize a value based on dependencies
   */
  protected useMemo<T>(
    key: string,
    factory: () => T,
    deps: any[]
  ): T {
    const cached = this.memoCache.get(key);
    
    // Check if deps are the same
    if (cached && this.areDepsEqual(cached.deps, deps)) {
      return cached.value;
    }
    
    // Compute new value
    const value = factory();
    this.memoCache.set(key, { deps: [...deps], value });
    
    return value;
  }
  
  /**
   * Check if dependencies are equal
   */
  private areDepsEqual(a: any[], b: any[]): boolean {
    if (a.length !== b.length) return false;
    
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    
    return true;
  }
  
  /**
   * Memoize a callback
   */
  protected useCallback<T extends Function>(
    key: string,
    callback: T,
    deps: any[]
  ): T {
    return this.useMemo(key, () => callback, deps);
  }
  
  /**
   * Clear memoization cache
   */
  protected clearMemoCache(): void {
    this.memoCache.clear();
  }
  
  /**
   * Destroy with cleanup
   */
  public destroy(): void {
    this.clearMemoCache();
    this.prevStateValues.clear();
    this.subscribedPaths.clear();
    super.destroy();
  }
}

/**
 * Higher-order component for memoization
 */
export function memo<T extends typeof OptimizedComponent>(
  ComponentClass: T,
  options?: Partial<MemoizationOptions>
): T {
  return class extends (ComponentClass as any) {
    constructor(host: HTMLElement, componentOptions?: any) {
      super(host, {
        ...componentOptions,
        ...options
      });
      
      // Apply memoization logic
      const instance = this as any;
      const originalUpdate = instance.update.bind(instance);
      
      // Track previous props
      let prevProps = { ...instance.props };
      const equalFn = options?.deepEqual ? deepEqual : shallowEqual;
      const propsEqual = options?.propsEqual || equalFn;
      
      // Override update
      instance.update = function() {
        if (!propsEqual(prevProps, instance.props)) {
          prevProps = { ...instance.props };
          originalUpdate();
        }
      };
    }
  } as T;
}

/**
 * Pure component that only updates when props change
 */
export abstract class PureComponent extends MemoizedComponent {
  constructor(host: HTMLElement, options?: MemoizationOptions) {
    super(host, {
      ...options,
      deepEqual: false // Use shallow comparison for performance
    });
  }
}

/**
 * Static component that never updates after initial render
 */
export abstract class StaticComponent extends MemoizedComponent {
  protected shouldUpdate(): boolean {
    // Never update after initial render
    return false;
  }
  
  /**
   * Override forceUpdate to also respect static nature
   */
  public forceUpdate(): void {
    // Static components don't update, even when forced
    return;
  }
}
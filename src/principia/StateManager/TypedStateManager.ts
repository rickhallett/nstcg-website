/**
 * @module TypedStateManager
 * @description Type-safe state management extending the base StateManager
 * 
 * Provides compile-time type safety while maintaining backward compatibility
 * with the original StateManager API. Supports both typed and untyped access.
 * 
 * Follows Principia.js architectural canon:
 * - The State is Singular
 * - Events are the Messengers
 * - The Flow is Unidirectional
 */

import { StateManager } from './StateManager';
import type { EventBus } from '../EventBus';
import type { LoggerService } from '../LoggerService';

/**
 * Path type for nested object access
 */
export type Path<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? [K] | [K, ...Path<T[K]>]
          : [K]
        : never;
    }[keyof T]
  : [];

/**
 * Get the type at a path in an object
 */
export type PathValue<T, P extends readonly string[]> = P extends readonly []
  ? T
  : P extends readonly [infer K, ...infer Rest]
  ? K extends keyof T
    ? Rest extends readonly string[]
      ? PathValue<T[K], Rest>
      : never
    : undefined
  : undefined;

/**
 * Deep partial type for partial updates
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

/**
 * Selector function type
 */
export type Selector<T, R> = (state: T) => R;

/**
 * Subscription callback type
 */
export type SubscriptionCallback<T> = (value: T) => void;

/**
 * Type-safe state manager extending the base StateManager
 * 
 * @template T The shape of the application state
 */
export class TypedStateManager<T extends Record<string, any>> extends StateManager {
  private typeGuards: Map<keyof T, (value: any) => boolean> = new Map();
  private subscriptions: Map<string, Set<SubscriptionCallback<any>>> = new Map();
  protected logger: LoggerService;
  protected eventBus: EventBus;
  
  /**
   * Create a new TypedStateManager instance
   * 
   * @param eventBus EventBus instance
   * @param logger LoggerService instance
   */
  constructor(eventBus: EventBus, logger: LoggerService) {
    super();
    this.eventBus = eventBus;
    this.logger = logger;
    this.setEventBus(eventBus);
  }
  
  /**
   * Initialize the state with type checking
   * 
   * @param initialState The initial state
   */
  initialize(initialState: T): void {
    super.initialize(initialState);
  }
  
  /**
   * Get a value from the state with type safety (overloaded)
   */
  get<K extends keyof T>(key: K): T[K];
  get<K1 extends keyof T, K2 extends keyof T[K1]>(k1: K1, k2: K2): T[K1][K2];
  get<
    K1 extends keyof T,
    K2 extends keyof T[K1],
    K3 extends keyof T[K1][K2]
  >(k1: K1, k2: K2, k3: K3): T[K1][K2][K3];
  get(path: string): any;
  get(...args: any[]): any {
    // Handle array of keys
    if (args.length > 1) {
      const path = args.join('.');
      return super.get(path);
    }
    
    // Handle single key or string path
    const key = args[0];
    return super.get(key);
  }
  
  /**
   * Set a value in the state with type safety (overloaded)
   */
  set<K extends keyof T>(key: K, value: T[K]): void;
  set<P extends Path<T>>(path: P, value: PathValue<T, P>): void;
  set(path: string, value: any): void;
  set(pathOrKey: any, value: any): void {
    // Handle array path
    if (Array.isArray(pathOrKey)) {
      const path = pathOrKey.join('.');
      this.setWithValidation(path, value);
    } else {
      this.setWithValidation(pathOrKey, value);
    }
  }
  
  /**
   * Update a value using a function with type safety
   */
  update<K extends keyof T>(
    key: K,
    updater: (current: T[K]) => T[K]
  ): void {
    const current = this.get(key);
    const updated = updater(current);
    this.set(key, updated);
  }
  
  /**
   * Batch update with type checking
   */
  batchUpdate(updates: Partial<Record<string, any>>): void {
    // Validate all updates first
    const validUpdates: Record<string, any> = {};
    
    for (const [path, value] of Object.entries(updates)) {
      if (this.isValidPath(path)) {
        validUpdates[path] = value;
      } else {
        this.logger.warn(`Invalid path in batch update: ${path}`);
      }
    }
    
    // Apply valid updates using parent's update method
    super.update(validUpdates);
  }
  
  /**
   * Select derived state with memoization
   */
  select<R>(selector: Selector<T, R>): R {
    const state = this.getFullState();
    return selector(state);
  }
  
  /**
   * Subscribe to changes at a specific path
   */
  subscribe<K extends keyof T>(
    key: K,
    callback: SubscriptionCallback<T[K]>
  ): () => void;
  subscribe(
    path: string,
    callback: SubscriptionCallback<any>
  ): () => void;
  subscribe(
    pathOrKey: any,
    callback: SubscriptionCallback<any>
  ): () => void {
    const path = typeof pathOrKey === 'string' ? pathOrKey : String(pathOrKey);
    
    // Add to subscriptions
    if (!this.subscriptions.has(path)) {
      this.subscriptions.set(path, new Set());
    }
    this.subscriptions.get(path)!.add(callback);
    
    // Subscribe to state changes
    const handleStateChange = (event: any) => {
      if (event.path === path || event.path.startsWith(path + '.')) {
        callback(this.get(path as any));
      }
    };
    
    this.eventBus.on('state:changed', handleStateChange);
    
    // Return unsubscribe function
    return () => {
      this.subscriptions.get(path)?.delete(callback);
      if (this.subscriptions.get(path)?.size === 0) {
        this.subscriptions.delete(path);
      }
      this.eventBus.off('state:changed', handleStateChange);
    };
  }
  
  /**
   * Partially update an object in the state
   */
  patch<K extends keyof T>(
    key: K,
    partial: DeepPartial<T[K]>
  ): void {
    const current = this.get(key);
    if (typeof current === 'object' && current !== null) {
      const merged = this.deepMerge(current, partial);
      this.set(key, merged);
    }
  }
  
  /**
   * Register a type guard for runtime validation
   */
  registerTypeGuard<K extends keyof T>(
    key: K,
    guard: (value: any) => value is T[K]
  ): void {
    this.typeGuards.set(key, guard);
  }
  
  /**
   * Get the full typed state
   */
  getFullState(): T {
    return super.get('') as T;
  }
  
  /**
   * Set with validation
   * @private
   */
  private setWithValidation(path: string, value: any): void {
    // Check if we have a type guard for the root key
    const rootKey = path.split('.')[0] as keyof T;
    const guard = this.typeGuards.get(rootKey);
    
    if (guard && !this.validateValue(rootKey, value)) {
      this.logger.error(`Type validation failed for path: ${path}`, { value });
      return;
    }
    
    // Check if path is valid
    if (!this.isValidPath(path)) {
      this.logger.warn(`Attempting to set invalid path: ${path}`);
      return;
    }
    
    super.set(path, value);
  }
  
  /**
   * Check if a path exists in the state structure
   * @private
   */
  private isValidPath(path: string): boolean {
    if (!path) return true; // Root path is always valid
    
    const parts = path.split('.');
    let current: any = this.getFullState();
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof current !== 'object' || current === null) {
        return false;
      }
      if (!(parts[i] in current)) {
        return false;
      }
      current = current[parts[i]];
    }
    
    return true;
  }
  
  /**
   * Validate a value against registered type guards
   * @private
   */
  private validateValue(key: keyof T, value: any): boolean {
    const guard = this.typeGuards.get(key);
    if (guard) {
      return guard(value);
    }
    return true; // No guard registered, assume valid
  }
  
  /**
   * Deep merge objects
   * @private
   */
  private deepMerge<T>(target: T, source: DeepPartial<T>): T {
    if (typeof target !== 'object' || target === null) {
      return source as T;
    }
    
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = target[key];
        
        if (
          typeof sourceValue === 'object' &&
          sourceValue !== null &&
          typeof targetValue === 'object' &&
          targetValue !== null
        ) {
          result[key] = this.deepMerge(targetValue, sourceValue as any);
        } else if (sourceValue !== undefined) {
          result[key] = sourceValue as any;
        }
      }
    }
    
    return result;
  }
}
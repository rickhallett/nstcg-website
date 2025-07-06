/**
 * @module StateInspector
 * @description State debugging and inspection tools
 * 
 * Provides runtime state inspection, change tracking,
 * and debugging utilities for development.
 */

import { StateManager } from '../StateManager/StateManager';
import { EventBus } from '../EventBus/EventBus';

/**
 * State change record
 */
export interface StateChange {
  id: string;
  timestamp: number;
  path: string;
  oldValue: any;
  newValue: any;
  source?: string;
  stackTrace?: string;
}

/**
 * State snapshot
 */
export interface StateSnapshot {
  id: string;
  timestamp: number;
  state: any;
  label?: string;
  metadata?: Record<string, any>;
}

/**
 * Inspector configuration
 */
export interface InspectorConfig {
  /**
   * Enable in production
   */
  enableInProduction?: boolean;
  
  /**
   * Maximum history to keep
   */
  maxHistory?: number;
  
  /**
   * Maximum snapshots to keep
   */
  maxSnapshots?: number;
  
  /**
   * Paths to ignore
   */
  ignorePaths?: string[];
  
  /**
   * Enable stack traces
   */
  enableStackTraces?: boolean;
  
  /**
   * Auto-snapshot interval (ms)
   */
  autoSnapshotInterval?: number;
}

/**
 * State validation rule
 */
export interface ValidationRule {
  path: string;
  validator: (value: any, fullState: any) => boolean | string;
  message?: string;
}

/**
 * StateInspector class
 */
export class StateInspector {
  private static instance: StateInspector | null = null;
  
  private enabled: boolean;
  private stateManager: StateManager;
  private maxHistory: number;
  private maxSnapshots: number;
  private ignorePaths: Set<string>;
  private enableStackTraces: boolean;
  private autoSnapshotInterval?: number;
  
  private history: StateChange[] = [];
  private snapshots: StateSnapshot[] = [];
  private validationRules: ValidationRule[] = [];
  private autoSnapshotTimer?: NodeJS.Timeout;
  private lastState: any = {};
  private changeCounter: number = 0;
  
  private constructor(
    stateManager: StateManager,
    config: InspectorConfig = {}
  ) {
    this.stateManager = stateManager;
    this.enabled = config.enableInProduction ?? process.env.NODE_ENV !== 'production';
    this.maxHistory = config.maxHistory ?? 1000;
    this.maxSnapshots = config.maxSnapshots ?? 100;
    this.ignorePaths = new Set(config.ignorePaths ?? []);
    this.enableStackTraces = config.enableStackTraces ?? true;
    this.autoSnapshotInterval = config.autoSnapshotInterval;
    
    if (this.enabled) {
      this.initialize();
    }
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(
    stateManager?: StateManager,
    config?: InspectorConfig
  ): StateInspector {
    if (!StateInspector.instance && stateManager) {
      StateInspector.instance = new StateInspector(stateManager, config);
    }
    return StateInspector.instance!;
  }
  
  /**
   * Reset instance (for testing)
   */
  public static resetInstance(): void {
    if (StateInspector.instance) {
      StateInspector.instance.destroy();
      StateInspector.instance = null;
    }
  }
  
  /**
   * Take a snapshot of current state
   */
  public snapshot(label?: string, metadata?: Record<string, any>): string {
    if (!this.enabled) return '';
    
    const snapshot: StateSnapshot = {
      id: this.generateId(),
      timestamp: Date.now(),
      state: this.stateManager.get(),
      label,
      metadata
    };
    
    this.snapshots.push(snapshot);
    
    // Maintain max snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
    
    console.log(`📸 State snapshot taken: ${label || snapshot.id}`);
    
    return snapshot.id;
  }
  
  /**
   * Restore state from snapshot
   */
  public restore(snapshotId: string): boolean {
    if (!this.enabled) return false;
    
    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) {
      console.warn(`Snapshot ${snapshotId} not found`);
      return false;
    }
    
    this.stateManager.initialize(snapshot.state);
    console.log(`🔄 State restored from snapshot: ${snapshot.label || snapshotId}`);
    
    return true;
  }
  
  /**
   * Get state change history
   */
  public getHistory(filter?: {
    path?: string;
    since?: number;
    limit?: number;
  }): StateChange[] {
    let filtered = this.history;
    
    if (filter?.path) {
      filtered = filtered.filter(change => 
        change.path.startsWith(filter.path!)
      );
    }
    
    if (filter?.since) {
      filtered = filtered.filter(change => 
        change.timestamp >= filter.since!
      );
    }
    
    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }
    
    return filtered;
  }
  
  /**
   * Get all snapshots
   */
  public getSnapshots(): StateSnapshot[] {
    return [...this.snapshots];
  }
  
  /**
   * Get snapshot by ID
   */
  public getSnapshot(id: string): StateSnapshot | undefined {
    return this.snapshots.find(s => s.id === id);
  }
  
  /**
   * Compare two snapshots
   */
  public compareSnapshots(id1: string, id2: string): any {
    const snap1 = this.getSnapshot(id1);
    const snap2 = this.getSnapshot(id2);
    
    if (!snap1 || !snap2) {
      throw new Error('One or both snapshots not found');
    }
    
    return this.deepDiff(snap1.state, snap2.state);
  }
  
  /**
   * Validate current state
   */
  public validate(): { valid: boolean; errors: string[] } {
    if (!this.enabled) return { valid: true, errors: [] };
    
    const state = this.stateManager.get();
    const errors: string[] = [];
    
    for (const rule of this.validationRules) {
      const value = this.getValueAtPath(state, rule.path);
      const result = rule.validator(value, state);
      
      if (result !== true) {
        const message = typeof result === 'string' ? 
          result : 
          rule.message || `Validation failed for ${rule.path}`;
        errors.push(message);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Add validation rule
   */
  public addValidationRule(rule: ValidationRule): void {
    this.validationRules.push(rule);
  }
  
  /**
   * Remove validation rule
   */
  public removeValidationRule(path: string): void {
    this.validationRules = this.validationRules.filter(r => r.path !== path);
  }
  
  /**
   * Watch specific path for changes
   */
  public watch(
    path: string,
    callback: (change: StateChange) => void
  ): () => void {
    const handler = (change: StateChange) => {
      if (change.path === path || change.path.startsWith(path + '.')) {
        callback(change);
      }
    };
    
    EventBus.getInstance().on('inspector:change', handler);
    
    return () => {
      EventBus.getInstance().off('inspector:change', handler);
    };
  }
  
  /**
   * Get state tree structure
   */
  public getStateStructure(): any {
    const state = this.stateManager.get();
    return this.analyzeStructure(state);
  }
  
  /**
   * Find state values by criteria
   */
  public findValues(criteria: {
    type?: string;
    contains?: any;
    path?: RegExp;
  }): Array<{ path: string; value: any }> {
    const state = this.stateManager.get();
    const results: Array<{ path: string; value: any }> = [];
    
    this.traverseState(state, '', (path, value) => {
      let matches = true;
      
      if (criteria.type && typeof value !== criteria.type) {
        matches = false;
      }
      
      if (criteria.contains && !this.valueContains(value, criteria.contains)) {
        matches = false;
      }
      
      if (criteria.path && !criteria.path.test(path)) {
        matches = false;
      }
      
      if (matches) {
        results.push({ path, value });
      }
    });
    
    return results;
  }
  
  /**
   * Get performance metrics
   */
  public getMetrics(): {
    historySize: number;
    snapshotSize: number;
    changeRate: number;
    memoryUsage: number;
  } {
    const now = Date.now();
    const recentChanges = this.history.filter(c => 
      now - c.timestamp < 60000 // Last minute
    );
    
    return {
      historySize: this.history.length,
      snapshotSize: this.snapshots.length,
      changeRate: recentChanges.length,
      memoryUsage: this.estimateMemoryUsage()
    };
  }
  
  /**
   * Clear history and snapshots
   */
  public clear(): void {
    this.history = [];
    this.snapshots = [];
    this.changeCounter = 0;
    console.log('🧹 Inspector data cleared');
  }
  
  /**
   * Enable/disable inspector
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    if (!enabled) {
      this.destroy();
    } else {
      this.initialize();
    }
  }
  
  /**
   * Initialize inspector
   */
  private initialize(): void {
    // Subscribe to state changes
    EventBus.getInstance().on('state:changed', this.handleStateChange.bind(this));
    EventBus.getInstance().on('state:batch-changed', this.handleBatchChange.bind(this));
    
    // Take initial snapshot
    this.snapshot('Initial State');
    this.lastState = this.stateManager.get();
    
    // Setup auto snapshots
    if (this.autoSnapshotInterval) {
      this.autoSnapshotTimer = setInterval(() => {
        this.snapshot(`Auto-${Date.now()}`);
      }, this.autoSnapshotInterval);
    }
    
    // Add to global scope for debugging
    if (typeof window !== 'undefined') {
      (window as any).__PRINCIPIA_INSPECTOR__ = this;
    }
  }
  
  /**
   * Handle state change
   */
  private handleStateChange(data: any): void {
    if (!this.enabled) return;
    
    const { path, value } = data;
    
    if (this.ignorePaths.has(path)) return;
    
    const oldValue = this.getValueAtPath(this.lastState, path);
    
    const change: StateChange = {
      id: this.generateId(),
      timestamp: Date.now(),
      path,
      oldValue,
      newValue: value,
      source: this.getCallSource()
    };
    
    if (this.enableStackTraces) {
      change.stackTrace = new Error().stack;
    }
    
    this.history.push(change);
    
    // Maintain max history
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    
    // Update last state
    this.setValueAtPath(this.lastState, path, value);
    
    // Emit change event
    EventBus.getInstance().emit('inspector:change', change);
    
    // Validate after change
    const validation = this.validate();
    if (!validation.valid) {
      console.warn('⚠️ State validation failed:', validation.errors);
    }
    
    this.changeCounter++;
  }
  
  /**
   * Handle batch change
   */
  private handleBatchChange(updates: Record<string, any>): void {
    if (!this.enabled) return;
    
    const batchId = this.generateId();
    
    for (const [path, value] of Object.entries(updates)) {
      if (this.ignorePaths.has(path)) continue;
      
      const oldValue = this.getValueAtPath(this.lastState, path);
      
      const change: StateChange = {
        id: `${batchId}-${path}`,
        timestamp: Date.now(),
        path,
        oldValue,
        newValue: value,
        source: `batch:${this.getCallSource()}`
      };
      
      this.history.push(change);
      this.setValueAtPath(this.lastState, path, value);
      
      EventBus.getInstance().emit('inspector:change', change);
    }
    
    // Maintain max history
    while (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    
    this.changeCounter++;
  }
  
  /**
   * Get call source from stack trace
   */
  private getCallSource(): string {
    if (!this.enableStackTraces) return 'unknown';
    
    const stack = new Error().stack;
    if (!stack) return 'unknown';
    
    const lines = stack.split('\n');
    // Skip inspector internals and find first external call
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes('StateInspector') && !line.includes('StateManager')) {
        return line.trim();
      }
    }
    
    return 'unknown';
  }
  
  /**
   * Deep diff between two objects
   */
  private deepDiff(obj1: any, obj2: any, path: string = ''): any {
    const diff: any = {};
    
    // Check all keys in obj1
    for (const key in obj1) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (!(key in obj2)) {
        diff[key] = { type: 'removed', oldValue: obj1[key] };
      } else if (obj1[key] !== obj2[key]) {
        if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
          const nested = this.deepDiff(obj1[key], obj2[key], currentPath);
          if (Object.keys(nested).length > 0) {
            diff[key] = nested;
          }
        } else {
          diff[key] = {
            type: 'changed',
            oldValue: obj1[key],
            newValue: obj2[key]
          };
        }
      }
    }
    
    // Check for new keys in obj2
    for (const key in obj2) {
      if (!(key in obj1)) {
        diff[key] = { type: 'added', newValue: obj2[key] };
      }
    }
    
    return diff;
  }
  
  /**
   * Analyze state structure
   */
  private analyzeStructure(obj: any, depth: number = 0): any {
    if (depth > 10) return '[Max Depth Reached]';
    
    if (obj === null) return 'null';
    if (typeof obj !== 'object') return typeof obj;
    
    if (Array.isArray(obj)) {
      return {
        type: 'array',
        length: obj.length,
        itemTypes: [...new Set(obj.map(item => typeof item))]
      };
    }
    
    const structure: any = { type: 'object', properties: {} };
    
    for (const key in obj) {
      structure.properties[key] = this.analyzeStructure(obj[key], depth + 1);
    }
    
    return structure;
  }
  
  /**
   * Traverse state recursively
   */
  private traverseState(
    obj: any,
    path: string,
    callback: (path: string, value: any) => void
  ): void {
    callback(path, obj);
    
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        const newPath = path ? `${path}.${key}` : key;
        this.traverseState(obj[key], newPath, callback);
      }
    }
  }
  
  /**
   * Check if value contains criteria
   */
  private valueContains(value: any, criteria: any): boolean {
    if (value === criteria) return true;
    
    if (typeof value === 'string' && typeof criteria === 'string') {
      return value.includes(criteria);
    }
    
    if (Array.isArray(value)) {
      return value.includes(criteria);
    }
    
    if (value && typeof value === 'object') {
      return Object.values(value).some(v => this.valueContains(v, criteria));
    }
    
    return false;
  }
  
  /**
   * Get value at path
   */
  private getValueAtPath(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }
      current = current[key];
    }
    
    return current;
  }
  
  /**
   * Set value at path
   */
  private setValueAtPath(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }
  
  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    const historySize = JSON.stringify(this.history).length;
    const snapshotsSize = JSON.stringify(this.snapshots).length;
    return historySize + snapshotsSize;
  }
  
  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Destroy inspector
   */
  private destroy(): void {
    if (this.autoSnapshotTimer) {
      clearInterval(this.autoSnapshotTimer);
      this.autoSnapshotTimer = undefined;
    }
    
    // Remove from global scope
    if (typeof window !== 'undefined') {
      delete (window as any).__PRINCIPIA_INSPECTOR__;
    }
    
    this.clear();
  }
}

/**
 * Global inspector functions for console debugging
 */
export function inspectState(): any {
  const inspector = StateInspector.getInstance();
  return inspector ? inspector.getStateStructure() : null;
}

export function snapshotState(label?: string): string {
  const inspector = StateInspector.getInstance();
  return inspector ? inspector.snapshot(label) : '';
}

export function restoreState(snapshotId: string): boolean {
  const inspector = StateInspector.getInstance();
  return inspector ? inspector.restore(snapshotId) : false;
}

export function validateState(): { valid: boolean; errors: string[] } {
  const inspector = StateInspector.getInstance();
  return inspector ? inspector.validate() : { valid: true, errors: [] };
}
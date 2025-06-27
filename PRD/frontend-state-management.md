# Frontend State Management - Product Requirements Document

## Document Information
- **Author**: Development Team
- **Date**: January 2025
- **Version**: 1.0
- **Status**: Draft
- **Priority**: Medium

## Issue Assessment
- **Priority**: MEDIUM
- **Complexity**: 13 (Fibonacci)
- **Risk Level**: Medium
- **Time Estimate**: 3-4 weeks

### Priority Justification
- State loss frustrates users but isn't critical
- Memory leaks degrade performance over time
- Missing validation allows corrupt states
- Poor event handling causes UI lag

### Complexity Breakdown
- State persistence and synchronization (5)
- Cross-tab communication system (3)
- Memory management optimization (3)
- State validation framework (2)

## Executive Summary
This PRD addresses issues with frontend state management in the NSTCG platform, including lack of state persistence, missing validation, memory management problems, and inefficient event handling. Implementing proper state management will improve application reliability, user experience, and developer productivity.

## Problem Statement

### Current State Management Issues

1. **No State Persistence**
   - State lost on page reload
   - No cross-tab synchronization
   - Form data lost on navigation
   - User preferences not saved

2. **Missing State Validation**
   - Invalid state values accepted
   - No schema validation
   - State corruption possible
   - Inconsistent state shapes

3. **Memory Management Problems**
   - Circular references in state
   - Growing state size over time
   - No garbage collection strategy
   - Memory leaks in subscriptions

4. **Inefficient Event Handling**
   - Multiple subscriptions to same events
   - No event debouncing/throttling
   - Synchronous state updates blocking UI
   - No event prioritization

## Goals & Objectives

### Primary Goals
1. Implement persistent state with cross-tab sync
2. Add comprehensive state validation
3. Optimize memory usage and prevent leaks
4. Create efficient event handling system

### Success Metrics
- Zero state loss on refresh
- < 50MB state memory usage
- < 16ms state update time
- 100% state validation coverage

## User Stories

### As a User
- I want my form progress saved automatically
- I want settings to persist across sessions
- I want changes to sync across browser tabs
- I want the app to remember my preferences

### As a Developer
- I want predictable state updates
- I want easy debugging tools
- I want type-safe state access
- I want clear state architecture

### As a System Administrator
- I want to monitor state size
- I want to clear corrupted state
- I want state migration tools
- I want performance metrics

## Technical Requirements

### 1. State Architecture

#### Enhanced State Manager
```typescript
interface StateConfig {
  persist?: boolean;
  persistKey?: string;
  validator?: (state: any) => boolean;
  migrations?: Migration[];
  syncAcrossTabs?: boolean;
  maxSize?: number;
}

class EnhancedStateManager<T extends object> {
  private state: T;
  private subscribers: Map<string, Set<Subscriber>>;
  private config: StateConfig;
  private history: StateSnapshot<T>[];
  private persistenceAdapter: PersistenceAdapter;
  private tabSync: TabSyncManager;
  
  constructor(initialState: T, config: StateConfig = {}) {
    this.state = this.deepClone(initialState);
    this.subscribers = new Map();
    this.config = config;
    this.history = [];
    
    if (config.persist) {
      this.persistenceAdapter = new PersistenceAdapter(config.persistKey);
      this.loadPersistedState();
    }
    
    if (config.syncAcrossTabs) {
      this.tabSync = new TabSyncManager(this);
      this.tabSync.init();
    }
    
    // Set up automatic persistence
    if (config.persist) {
      this.subscribe('*', () => this.persistState());
    }
  }
  
  get<K extends keyof T>(key: K): T[K] {
    return this.deepClone(this.state[key]);
  }
  
  set<K extends keyof T>(key: K, value: T[K]): void {
    // Validate new value
    if (this.config.validator) {
      const newState = { ...this.state, [key]: value };
      if (!this.config.validator(newState)) {
        throw new Error(`Invalid state update for key: ${String(key)}`);
      }
    }
    
    // Check size limits
    if (this.config.maxSize) {
      const size = this.calculateSize({ ...this.state, [key]: value });
      if (size > this.config.maxSize) {
        throw new Error(`State size exceeds maximum: ${size} > ${this.config.maxSize}`);
      }
    }
    
    // Create snapshot for history
    this.createSnapshot();
    
    // Update state
    const oldValue = this.state[key];
    this.state[key] = this.deepClone(value);
    
    // Notify subscribers
    this.notifySubscribers(String(key), value, oldValue);
    
    // Sync across tabs if enabled
    if (this.config.syncAcrossTabs) {
      this.tabSync.broadcast({
        type: 'state-update',
        key,
        value
      });
    }
  }
  
  update(updates: Partial<T>): void {
    // Batch updates
    const changes: Array<{ key: string; oldValue: any; newValue: any }> = [];
    
    // Validate all updates first
    const newState = { ...this.state, ...updates };
    if (this.config.validator && !this.config.validator(newState)) {
      throw new Error('Invalid state update');
    }
    
    // Apply updates
    this.createSnapshot();
    
    Object.entries(updates).forEach(([key, value]) => {
      const oldValue = this.state[key as keyof T];
      this.state[key as keyof T] = this.deepClone(value);
      changes.push({ key, oldValue, newValue: value });
    });
    
    // Batch notifications
    changes.forEach(({ key, newValue, oldValue }) => {
      this.notifySubscribers(key, newValue, oldValue);
    });
    
    // Sync across tabs
    if (this.config.syncAcrossTabs) {
      this.tabSync.broadcast({
        type: 'state-batch-update',
        updates
      });
    }
  }
  
  subscribe(
    path: string,
    callback: Subscriber,
    options: SubscribeOptions = {}
  ): () => void {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, new Set());
    }
    
    // Wrap callback with options
    const wrappedCallback = this.wrapCallback(callback, options);
    
    this.subscribers.get(path)!.add(wrappedCallback);
    
    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(path);
      if (subs) {
        subs.delete(wrappedCallback);
        if (subs.size === 0) {
          this.subscribers.delete(path);
        }
      }
    };
  }
  
  private wrapCallback(
    callback: Subscriber,
    options: SubscribeOptions
  ): Subscriber {
    let timeoutId: NodeJS.Timeout;
    
    if (options.debounce) {
      return (value, oldValue, path) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          callback(value, oldValue, path);
        }, options.debounce);
      };
    }
    
    if (options.throttle) {
      let lastCall = 0;
      return (value, oldValue, path) => {
        const now = Date.now();
        if (now - lastCall >= options.throttle!) {
          lastCall = now;
          callback(value, oldValue, path);
        }
      };
    }
    
    return callback;
  }
  
  private createSnapshot(): void {
    this.history.push({
      state: this.deepClone(this.state),
      timestamp: Date.now()
    });
    
    // Limit history size
    if (this.history.length > 50) {
      this.history.shift();
    }
  }
  
  undo(): void {
    if (this.history.length > 0) {
      const snapshot = this.history.pop()!;
      this.state = snapshot.state;
      this.notifySubscribers('*', this.state, null);
    }
  }
  
  private calculateSize(obj: any): number {
    const jsonString = JSON.stringify(obj);
    return new Blob([jsonString]).size;
  }
}
```

### 2. State Persistence

#### Persistence Adapter
```typescript
class PersistenceAdapter {
  private storageKey: string;
  private storage: Storage;
  
  constructor(key: string, storage: Storage = localStorage) {
    this.storageKey = key;
    this.storage = storage;
  }
  
  async save(state: any): Promise<void> {
    try {
      const serialized = this.serialize(state);
      this.storage.setItem(this.storageKey, serialized);
      
      // Also save to IndexedDB for larger states
      if (serialized.length > 1024 * 1024) { // 1MB
        await this.saveToIndexedDB(state);
      }
    } catch (error) {
      console.error('Failed to persist state:', error);
      
      // Try to clear old data if quota exceeded
      if (error.name === 'QuotaExceededError') {
        this.clearOldData();
        // Retry
        this.storage.setItem(this.storageKey, this.serialize(state));
      }
    }
  }
  
  async load(): Promise<any> {
    try {
      // Try localStorage first
      const serialized = this.storage.getItem(this.storageKey);
      if (serialized) {
        return this.deserialize(serialized);
      }
      
      // Fall back to IndexedDB
      return await this.loadFromIndexedDB();
    } catch (error) {
      console.error('Failed to load persisted state:', error);
      return null;
    }
  }
  
  private serialize(state: any): string {
    return JSON.stringify(state, (key, value) => {
      // Handle special types
      if (value instanceof Date) {
        return { __type: 'Date', value: value.toISOString() };
      }
      if (value instanceof Set) {
        return { __type: 'Set', value: Array.from(value) };
      }
      if (value instanceof Map) {
        return { __type: 'Map', value: Array.from(value.entries()) };
      }
      return value;
    });
  }
  
  private deserialize(serialized: string): any {
    return JSON.parse(serialized, (key, value) => {
      if (value && value.__type) {
        switch (value.__type) {
          case 'Date':
            return new Date(value.value);
          case 'Set':
            return new Set(value.value);
          case 'Map':
            return new Map(value.value);
        }
      }
      return value;
    });
  }
  
  private async saveToIndexedDB(state: any): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction(['state'], 'readwrite');
    const store = tx.objectStore('state');
    
    await store.put({
      key: this.storageKey,
      value: state,
      timestamp: Date.now()
    });
  }
  
  private async loadFromIndexedDB(): Promise<any> {
    const db = await this.openDB();
    const tx = db.transaction(['state'], 'readonly');
    const store = tx.objectStore('state');
    
    const result = await store.get(this.storageKey);
    return result?.value || null;
  }
  
  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('StateDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('state')) {
          db.createObjectStore('state', { keyPath: 'key' });
        }
      };
    });
  }
}
```

### 3. Cross-Tab Synchronization

#### Tab Sync Manager
```typescript
class TabSyncManager {
  private channel: BroadcastChannel;
  private stateManager: EnhancedStateManager<any>;
  private tabId: string;
  
  constructor(stateManager: EnhancedStateManager<any>) {
    this.stateManager = stateManager;
    this.tabId = this.generateTabId();
    this.channel = new BroadcastChannel('state-sync');
  }
  
  init(): void {
    // Listen for messages from other tabs
    this.channel.addEventListener('message', (event) => {
      this.handleMessage(event.data);
    });
    
    // Announce this tab
    this.broadcast({
      type: 'tab-connected',
      tabId: this.tabId,
      timestamp: Date.now()
    });
    
    // Handle tab close
    window.addEventListener('beforeunload', () => {
      this.broadcast({
        type: 'tab-disconnected',
        tabId: this.tabId
      });
    });
  }
  
  broadcast(message: any): void {
    this.channel.postMessage({
      ...message,
      sourceTabId: this.tabId,
      timestamp: Date.now()
    });
  }
  
  private handleMessage(message: any): void {
    // Ignore messages from self
    if (message.sourceTabId === this.tabId) return;
    
    switch (message.type) {
      case 'state-update':
        // Apply update from another tab
        this.stateManager.set(message.key, message.value, {
          skipBroadcast: true
        });
        break;
        
      case 'state-batch-update':
        // Apply batch update
        this.stateManager.update(message.updates, {
          skipBroadcast: true
        });
        break;
        
      case 'state-request':
        // Another tab is requesting current state
        this.broadcast({
          type: 'state-response',
          state: this.stateManager.getState(),
          requestId: message.requestId
        });
        break;
        
      case 'tab-connected':
        // New tab connected, share current state
        this.broadcast({
          type: 'state-sync',
          state: this.stateManager.getState()
        });
        break;
    }
  }
  
  private generateTabId(): string {
    return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 4. State Validation

#### Schema Validation
```typescript
interface StateSchema {
  [key: string]: SchemaField;
}

interface SchemaField {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  validator?: (value: any) => boolean;
  default?: any;
  properties?: StateSchema; // For nested objects
  items?: SchemaField; // For arrays
}

class StateValidator {
  constructor(private schema: StateSchema) {}
  
  validate(state: any): ValidationResult {
    const errors: ValidationError[] = [];
    
    // Check all schema fields
    Object.entries(this.schema).forEach(([key, field]) => {
      const value = state[key];
      
      // Check required fields
      if (field.required && value === undefined) {
        errors.push({
          path: key,
          message: `Required field '${key}' is missing`
        });
        return;
      }
      
      // Skip optional undefined fields
      if (value === undefined) return;
      
      // Type validation
      if (!this.validateType(value, field.type)) {
        errors.push({
          path: key,
          message: `Field '${key}' must be of type ${field.type}`
        });
        return;
      }
      
      // Custom validation
      if (field.validator && !field.validator(value)) {
        errors.push({
          path: key,
          message: `Field '${key}' failed custom validation`
        });
      }
      
      // Nested object validation
      if (field.type === 'object' && field.properties) {
        const nestedValidator = new StateValidator(field.properties);
        const nestedResult = nestedValidator.validate(value);
        errors.push(...nestedResult.errors.map(e => ({
          ...e,
          path: `${key}.${e.path}`
        })));
      }
      
      // Array validation
      if (field.type === 'array' && field.items && Array.isArray(value)) {
        value.forEach((item, index) => {
          if (!this.validateType(item, field.items!.type)) {
            errors.push({
              path: `${key}[${index}]`,
              message: `Array item must be of type ${field.items!.type}`
            });
          }
        });
      }
    });
    
    // Check for unknown fields
    Object.keys(state).forEach(key => {
      if (!this.schema[key]) {
        errors.push({
          path: key,
          message: `Unknown field '${key}'`
        });
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return value !== null && typeof value === 'object' && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return false;
    }
  }
}
```

### 5. Memory Management

#### Memory-Efficient State
```typescript
class MemoryManager {
  private weakRefs: WeakMap<object, WeakRef<object>>;
  private cleanupInterval: NodeJS.Timer;
  
  constructor() {
    this.weakRefs = new WeakMap();
    
    // Periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute
  }
  
  trackObject(obj: object): void {
    this.weakRefs.set(obj, new WeakRef(obj));
  }
  
  cleanup(): void {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Log memory usage
    if (performance.memory) {
      console.log('Memory usage:', {
        usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
        totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
        jsHeapSizeLimit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB'
      });
    }
  }
  
  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}
```

## Implementation Plan

### Phase 1: Core State Enhancement (Week 1)
1. Implement enhanced state manager
2. Add validation system
3. Set up memory tracking
4. Create debugging tools

### Phase 2: Persistence Layer (Week 2)
1. Implement persistence adapter
2. Add IndexedDB support
3. Create migration system
4. Test quota handling

### Phase 3: Cross-Tab Sync (Week 3)
1. Implement BroadcastChannel sync
2. Handle conflict resolution
3. Add leader election
4. Test multi-tab scenarios

### Phase 4: Developer Tools (Week 4)
1. Create DevTools extension
2. Add time-travel debugging
3. Implement state visualization
4. Create documentation

## Monitoring & Analytics

### State Metrics
```typescript
const stateMetrics = {
  // Size metrics
  stateSize: new Gauge('state_size_bytes'),
  subscriberCount: new Gauge('state_subscribers_total'),
  
  // Performance metrics
  updateDuration: new Histogram('state_update_duration_ms'),
  persistDuration: new Histogram('state_persist_duration_ms'),
  
  // Error metrics
  validationErrors: new Counter('state_validation_errors_total'),
  persistenceErrors: new Counter('state_persistence_errors_total')
};
```

## Success Criteria

### Performance Targets
- State update < 16ms (60fps)
- Persistence < 50ms
- Memory usage < 50MB
- Zero memory leaks

### Reliability Targets
- 100% state recovery after crash
- Zero data loss on update
- Instant cross-tab sync
- 100% validation coverage

## Appendix

### State Schema Example
```typescript
const appStateSchema: StateSchema = {
  user: {
    type: 'object',
    required: true,
    properties: {
      id: { type: 'string', required: true },
      email: { type: 'string', required: true },
      preferences: {
        type: 'object',
        properties: {
          theme: { type: 'string', default: 'light' },
          notifications: { type: 'boolean', default: true }
        }
      }
    }
  },
  
  participants: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true },
        points: { type: 'number', default: 0 }
      }
    }
  },
  
  ui: {
    type: 'object',
    properties: {
      modal: { type: 'string' },
      loading: { type: 'boolean', default: false }
    }
  }
};
```

### References
- Redux Design Principles
- MobX State Tree Documentation
- Zustand Architecture
- State Machine Patterns
/**
 * @module StatePersistence
 * @description State persistence with versioning and migration support
 * 
 * Provides automatic state saving/loading with migration capabilities
 * for handling schema changes between versions.
 */

import { StateManager } from '../StateManager/StateManager';
import { EventBus } from '../EventBus/EventBus';

/**
 * Persistence configuration
 */
export interface PersistenceConfig {
  /**
   * Storage key prefix
   */
  key?: string;
  
  /**
   * Current schema version
   */
  version?: number;
  
  /**
   * Storage backend (localStorage, sessionStorage, etc)
   */
  storage?: Storage;
  
  /**
   * Debounce delay for saves (ms)
   */
  debounceDelay?: number;
  
  /**
   * State paths to persist (whitelist)
   */
  include?: string[];
  
  /**
   * State paths to exclude (blacklist)
   */
  exclude?: string[];
  
  /**
   * Migration functions by version
   */
  migrations?: Record<number, MigrationFunction>;
  
  /**
   * Enable compression
   */
  compress?: boolean;
  
  /**
   * Custom serializer
   */
  serializer?: Serializer;
  
  /**
   * Error handler
   */
  onError?: (error: Error) => void;
}

/**
 * Migration function type
 */
export type MigrationFunction = (oldState: any) => any;

/**
 * Serializer interface
 */
export interface Serializer {
  serialize(data: any): string;
  deserialize(data: string): any;
}

/**
 * Persisted state metadata
 */
interface PersistedState {
  version: number;
  timestamp: number;
  data: any;
  checksum?: string;
}

/**
 * Default JSON serializer
 */
const DEFAULT_SERIALIZER: Serializer = {
  serialize: (data) => JSON.stringify(data),
  deserialize: (data) => JSON.parse(data)
};

/**
 * StatePersistence class
 */
export class StatePersistence {
  private readonly key: string;
  private readonly version: number;
  private readonly storage: Storage;
  private readonly debounceDelay: number;
  private readonly include?: string[];
  private readonly exclude?: string[];
  private readonly migrations: Record<number, MigrationFunction>;
  private readonly compress: boolean;
  private readonly serializer: Serializer;
  private readonly onError?: (error: Error) => void;
  
  private saveTimer: NodeJS.Timeout | null = null;
  private isEnabled: boolean = true;
  
  constructor(
    private readonly stateManager: StateManager,
    config: PersistenceConfig = {}
  ) {
    this.key = config.key ?? 'app-state';
    this.version = config.version ?? 1;
    this.storage = config.storage ?? (typeof window !== 'undefined' ? window.localStorage : {} as Storage);
    this.debounceDelay = config.debounceDelay ?? 1000;
    this.include = config.include;
    this.exclude = config.exclude;
    this.migrations = config.migrations ?? {};
    this.compress = config.compress ?? false;
    this.serializer = config.serializer ?? DEFAULT_SERIALIZER;
    this.onError = config.onError;
    
    // Setup auto-save
    this.setupAutoSave();
  }
  
  /**
   * Initialize persistence (load saved state)
   */
  public async initialize(): Promise<void> {
    try {
      const loaded = await this.load();
      if (loaded) {
        EventBus.getInstance().emit('persistence:loaded', { state: loaded });
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }
  
  /**
   * Save current state
   */
  public async save(): Promise<void> {
    if (!this.isEnabled) return;
    
    try {
      // Get current state
      const state = this.stateManager.get();
      
      // Filter state based on include/exclude
      const filtered = this.filterState(state);
      
      // Create persisted state object
      const persisted: PersistedState = {
        version: this.version,
        timestamp: Date.now(),
        data: filtered
      };
      
      // Add checksum if compression enabled
      if (this.compress) {
        persisted.checksum = this.calculateChecksum(filtered);
      }
      
      // Serialize
      let serialized = this.serializer.serialize(persisted);
      
      // Compress if enabled
      if (this.compress) {
        serialized = await this.compressData(serialized);
      }
      
      // Save to storage
      this.storage.setItem(this.key, serialized);
      
      // Emit event
      EventBus.getInstance().emit('persistence:saved', {
        size: serialized.length,
        compressed: this.compress
      });
      
    } catch (error) {
      this.handleError(error as Error);
    }
  }
  
  /**
   * Load saved state
   */
  public async load(): Promise<any | null> {
    try {
      // Get from storage
      const stored = this.storage.getItem(this.key);
      if (!stored) return null;
      
      // Decompress if needed
      let decompressed = stored;
      if (this.compress) {
        decompressed = await this.decompressData(stored);
      }
      
      // Deserialize
      const persisted: PersistedState = this.serializer.deserialize(decompressed);
      
      // Verify checksum if present
      if (persisted.checksum) {
        const calculated = this.calculateChecksum(persisted.data);
        if (calculated !== persisted.checksum) {
          throw new Error('State checksum mismatch');
        }
      }
      
      // Apply migrations if needed
      let data = persisted.data;
      if (persisted.version < this.version) {
        data = await this.migrate(data, persisted.version);
      }
      
      // Update state manager
      this.stateManager.initialize(data);
      
      // Emit loaded event
      EventBus.getInstance().emit('persistence:loaded', { state: data });
      
      return data;
      
    } catch (error) {
      this.handleError(error as Error);
      return null;
    }
  }
  
  /**
   * Clear persisted state
   */
  public clear(): void {
    this.storage.removeItem(this.key);
    EventBus.getInstance().emit('persistence:cleared');
  }
  
  /**
   * Enable/disable persistence
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled && this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }
  
  /**
   * Get persistence info
   */
  public getInfo(): PersistenceInfo {
    const stored = this.storage.getItem(this.key);
    if (!stored) {
      return {
        exists: false,
        size: 0,
        version: 0,
        timestamp: 0
      };
    }
    
    try {
      const decompressed = this.compress ? 
        this.decompressDataSync(stored) : stored;
      const persisted: PersistedState = this.serializer.deserialize(decompressed);
      
      return {
        exists: true,
        size: stored.length,
        version: persisted.version,
        timestamp: persisted.timestamp,
        compressed: this.compress
      };
    } catch {
      return {
        exists: true,
        size: stored.length,
        version: 0,
        timestamp: 0,
        error: true
      };
    }
  }
  
  /**
   * Setup auto-save on state changes
   */
  private setupAutoSave(): void {
    EventBus.getInstance().on('state:changed', () => {
      if (!this.isEnabled) return;
      
      // Clear existing timer
      if (this.saveTimer) {
        clearTimeout(this.saveTimer);
      }
      
      // Debounce save
      this.saveTimer = setTimeout(() => {
        this.save();
      }, this.debounceDelay);
    });
  }
  
  /**
   * Filter state based on include/exclude rules
   */
  private filterState(state: any): any {
    if (!this.include && !this.exclude) {
      return state;
    }
    
    const filtered: any = {};
    
    // If include is specified, only include those paths
    if (this.include) {
      for (const path of this.include) {
        const value = this.getValueAtPath(state, path);
        if (value !== undefined) {
          this.setValueAtPath(filtered, path, value);
        }
      }
      return filtered;
    }
    
    // Otherwise, include everything except excluded paths
    const result = JSON.parse(JSON.stringify(state));
    if (this.exclude) {
      for (const path of this.exclude) {
        this.deleteValueAtPath(result, path);
      }
    }
    
    return result;
  }
  
  /**
   * Get value at dot-notation path
   */
  private getValueAtPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }
      current = current[part];
    }
    
    return current;
  }
  
  /**
   * Set value at dot-notation path
   */
  private setValueAtPath(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    const last = parts.pop()!;
    let current = obj;
    
    for (const part of parts) {
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[last] = value;
  }
  
  /**
   * Delete value at dot-notation path
   */
  private deleteValueAtPath(obj: any, path: string): void {
    const parts = path.split('.');
    const last = parts.pop()!;
    let current = obj;
    
    for (const part of parts) {
      if (current == null || typeof current !== 'object') {
        return;
      }
      current = current[part];
    }
    
    if (current && typeof current === 'object') {
      delete current[last];
    }
  }
  
  /**
   * Apply migrations
   */
  private async migrate(data: any, fromVersion: number): Promise<any> {
    let migrated = data;
    
    // Apply migrations in sequence
    for (let v = fromVersion + 1; v <= this.version; v++) {
      const migration = this.migrations[v];
      if (migration) {
        migrated = await migration(migrated);
        EventBus.getInstance().emit('persistence:migrated', {
          from: v - 1,
          to: v
        });
      }
    }
    
    return migrated;
  }
  
  /**
   * Calculate checksum
   */
  private calculateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return hash.toString(36);
  }
  
  /**
   * Compress data (simple LZ-string style compression)
   */
  private async compressData(data: string): Promise<string> {
    // Simple compression using base64 encoding
    // In production, use a proper compression library
    return btoa(data);
  }
  
  /**
   * Decompress data
   */
  private async decompressData(data: string): Promise<string> {
    return atob(data);
  }
  
  /**
   * Sync decompression for getInfo
   */
  private decompressDataSync(data: string): string {
    return atob(data);
  }
  
  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    if (this.onError) {
      this.onError(error);
    } else {
      console.error('[StatePersistence]', error);
    }
    
    EventBus.getInstance().emit('persistence:error', { error });
  }
}

/**
 * Persistence info
 */
export interface PersistenceInfo {
  exists: boolean;
  size: number;
  version: number;
  timestamp: number;
  compressed?: boolean;
  error?: boolean;
}

/**
 * Create persistence decorator
 */
export function persistable(config?: PersistenceConfig) {
  return function(target: any) {
    const original = target;
    
    // Create new constructor
    function construct(constructor: any, args: any[]) {
      const instance = new constructor(...args);
      
      // Add persistence if it's a StateManager
      if (instance instanceof StateManager) {
        const persistence = new StatePersistence(instance, config);
        persistence.initialize();
        
        // Add persistence methods to instance
        (instance as any).persistence = persistence;
      }
      
      return instance;
    }
    
    // Copy prototype
    construct.prototype = original.prototype;
    
    // Return new constructor
    return new Proxy(original, {
      construct: (target, args) => construct(target, args)
    });
  };
}
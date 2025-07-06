/**
 * @module IndexedDBAdapter
 * @description IndexedDB storage adapter for state persistence
 * 
 * Provides a Storage-compatible interface for IndexedDB,
 * enabling larger data storage with better performance.
 */

/**
 * IndexedDB configuration
 */
export interface IndexedDBConfig {
  /**
   * Database name
   */
  dbName?: string;
  
  /**
   * Store name
   */
  storeName?: string;
  
  /**
   * Database version
   */
  version?: number;
  
  /**
   * Maximum entries to keep
   */
  maxEntries?: number;
  
  /**
   * Enable versioning of entries
   */
  versioning?: boolean;
}

/**
 * Storage entry
 */
interface StorageEntry {
  key: string;
  value: string;
  timestamp: number;
  version?: number;
}

/**
 * IndexedDBAdapter class - implements Storage interface
 */
export class IndexedDBAdapter implements Storage {
  private db: IDBDatabase | null = null;
  private readonly dbName: string;
  private readonly storeName: string;
  private readonly version: number;
  private readonly maxEntries: number;
  private readonly versioning: boolean;
  private cache: Map<string, string> = new Map();
  
  constructor(config: IndexedDBConfig = {}) {
    this.dbName = config.dbName ?? 'AppStateDB';
    this.storeName = config.storeName ?? 'state';
    this.version = config.version ?? 1;
    this.maxEntries = config.maxEntries ?? 100;
    this.versioning = config.versioning ?? false;
  }
  
  /**
   * Initialize the database
   */
  public async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        this.loadCache().then(resolve).catch(reject);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          
          if (this.versioning) {
            store.createIndex('version', 'version', { unique: false });
          }
        }
      };
    });
  }
  
  /**
   * Get the number of items
   */
  get length(): number {
    return this.cache.size;
  }
  
  /**
   * Get item by key
   */
  getItem(key: string): string | null {
    return this.cache.get(key) ?? null;
  }
  
  /**
   * Set item
   */
  async setItem(key: string, value: string): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }
    
    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    const entry: StorageEntry = {
      key,
      value,
      timestamp: Date.now()
    };
    
    if (this.versioning) {
      // Get current version
      const current = await this.getEntry(key);
      entry.version = (current?.version ?? 0) + 1;
    }
    
    return new Promise((resolve, reject) => {
      const request = store.put(entry);
      
      request.onsuccess = () => {
        this.cache.set(key, value);
        this.enforceMaxEntries();
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to set item: ${request.error}`));
      };
    });
  }
  
  /**
   * Remove item
   */
  async removeItem(key: string): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }
    
    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      
      request.onsuccess = () => {
        this.cache.delete(key);
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to remove item: ${request.error}`));
      };
    });
  }
  
  /**
   * Clear all items
   */
  async clear(): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }
    
    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      
      request.onsuccess = () => {
        this.cache.clear();
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to clear store: ${request.error}`));
      };
    });
  }
  
  /**
   * Get key at index
   */
  key(index: number): string | null {
    const keys = Array.from(this.cache.keys());
    return keys[index] ?? null;
  }
  
  /**
   * Get all keys
   */
  async keys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }
  
  /**
   * Get all values
   */
  async values(): Promise<string[]> {
    return Array.from(this.cache.values());
  }
  
  /**
   * Get all entries
   */
  async entries(): Promise<[string, string][]> {
    return Array.from(this.cache.entries());
  }
  
  /**
   * Get entry with metadata
   */
  private async getEntry(key: string): Promise<StorageEntry | null> {
    if (!this.db) return null;
    
    const transaction = this.db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to get entry: ${request.error}`));
      };
    });
  }
  
  /**
   * Load cache from database
   */
  private async loadCache(): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          const entry = cursor.value as StorageEntry;
          this.cache.set(entry.key, entry.value);
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to load cache: ${request.error}`));
      };
    });
  }
  
  /**
   * Enforce maximum entries limit
   */
  private async enforceMaxEntries(): Promise<void> {
    if (!this.db || this.cache.size <= this.maxEntries) return;
    
    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    const index = store.index('timestamp');
    
    // Get oldest entries
    const entriesToDelete = this.cache.size - this.maxEntries;
    let deleted = 0;
    
    return new Promise((resolve, reject) => {
      const request = index.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor && deleted < entriesToDelete) {
          const entry = cursor.value as StorageEntry;
          store.delete(entry.key);
          this.cache.delete(entry.key);
          deleted++;
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to enforce max entries: ${request.error}`));
      };
    });
  }
  
  /**
   * Get version history for a key
   */
  public async getVersionHistory(key: string): Promise<StorageEntry[]> {
    if (!this.db || !this.versioning) return [];
    
    const transaction = this.db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    const index = store.index('version');
    
    const versions: StorageEntry[] = [];
    
    return new Promise((resolve, reject) => {
      const request = index.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          const entry = cursor.value as StorageEntry;
          if (entry.key === key) {
            versions.push(entry);
          }
          cursor.continue();
        } else {
          // Sort by version descending
          versions.sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
          resolve(versions);
        }
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to get version history: ${request.error}`));
      };
    });
  }
  
  /**
   * Get storage statistics
   */
  public async getStats(): Promise<StorageStats> {
    const usage = await this.estimateUsage();
    
    return {
      entries: this.cache.size,
      maxEntries: this.maxEntries,
      estimatedSize: usage,
      versioning: this.versioning
    };
  }
  
  /**
   * Estimate storage usage
   */
  private async estimateUsage(): Promise<number> {
    let total = 0;
    
    for (const value of this.cache.values()) {
      // Rough estimate: 2 bytes per character
      total += value.length * 2;
    }
    
    return total;
  }
  
  /**
   * Close database connection
   */
  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

/**
 * Storage statistics
 */
export interface StorageStats {
  entries: number;
  maxEntries: number;
  estimatedSize: number;
  versioning: boolean;
}

/**
 * Create IndexedDB storage
 */
export async function createIndexedDBStorage(
  config?: IndexedDBConfig
): Promise<IndexedDBAdapter> {
  const adapter = new IndexedDBAdapter(config);
  await adapter.initialize();
  return adapter;
}
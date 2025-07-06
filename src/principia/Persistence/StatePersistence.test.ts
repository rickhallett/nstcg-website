import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { StatePersistence } from './StatePersistence';
import { StateManager } from '../StateManager/StateManager';
import { EventBus } from '../EventBus/EventBus';

// Mock storage
class MockStorage implements Storage {
  private data: Record<string, string> = {};
  
  get length() {
    return Object.keys(this.data).length;
  }
  
  clear(): void {
    this.data = {};
  }
  
  getItem(key: string): string | null {
    return this.data[key] ?? null;
  }
  
  setItem(key: string, value: string): void {
    this.data[key] = value;
  }
  
  removeItem(key: string): void {
    delete this.data[key];
  }
  
  key(index: number): string | null {
    return Object.keys(this.data)[index] ?? null;
  }
}

describe('StatePersistence', () => {
  let stateManager: StateManager;
  let storage: MockStorage;
  let eventBus: EventBus;
  
  beforeEach(() => {
    // Reset singletons
    StateManager._resetInstance();
    stateManager = StateManager.getInstance();
    
    eventBus = EventBus.getInstance();
    
    // Set EventBus on StateManager
    stateManager.setEventBus(eventBus);
    
    stateManager.initialize({
      user: { name: 'John', age: 30 },
      settings: { theme: 'dark', notifications: true },
      data: { items: [1, 2, 3] }
    });
    
    storage = new MockStorage();
  });
  
  describe('basic persistence', () => {
    it('should save state to storage', async () => {
      const persistence = new StatePersistence(stateManager, {
        storage,
        debounceDelay: 0
      });
      
      await persistence.save();
      
      const saved = storage.getItem('app-state');
      expect(saved).toBeTruthy();
      
      const parsed = JSON.parse(saved!);
      expect(parsed.version).toBe(1);
      expect(parsed.data.user.name).toBe('John');
    });
    
    it('should load state from storage', async () => {
      const persistence = new StatePersistence(stateManager, {
        storage,
        debounceDelay: 0
      });
      
      // Save first
      await persistence.save();
      
      // Modify state
      stateManager.set('user.name', 'Jane');
      
      // Load saved state
      await persistence.load();
      
      // Should be restored
      expect(stateManager.get('user.name')).toBe('John');
    });
    
    it('should auto-save on state changes', async () => {
      const persistence = new StatePersistence(stateManager, {
        storage,
        debounceDelay: 10
      });
      
      // Initialize to set up event listeners
      await persistence.initialize();
      
      // Change state
      stateManager.set('user.name', 'Jane');
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 20));
      
      const saved = storage.getItem('app-state');
      expect(saved).toBeTruthy();
      
      const parsed = JSON.parse(saved!);
      expect(parsed.data.user.name).toBe('Jane');
    });
  });
  
  describe('filtering', () => {
    it('should include only specified paths', async () => {
      const persistence = new StatePersistence(stateManager, {
        storage,
        include: ['user.name', 'settings.theme']
      });
      
      await persistence.save();
      
      const saved = storage.getItem('app-state');
      const parsed = JSON.parse(saved!);
      
      expect(parsed.data.user.name).toBe('John');
      expect(parsed.data.settings.theme).toBe('dark');
      expect(parsed.data.user.age).toBeUndefined();
      expect(parsed.data.settings.notifications).toBeUndefined();
      expect(parsed.data.data).toBeUndefined();
    });
    
    it('should exclude specified paths', async () => {
      const persistence = new StatePersistence(stateManager, {
        storage,
        exclude: ['user.age', 'data']
      });
      
      await persistence.save();
      
      const saved = storage.getItem('app-state');
      const parsed = JSON.parse(saved!);
      
      expect(parsed.data.user.name).toBe('John');
      expect(parsed.data.user.age).toBeUndefined();
      expect(parsed.data.settings).toBeDefined();
      expect(parsed.data.data).toBeUndefined();
    });
  });
  
  describe('versioning and migrations', () => {
    it('should apply migrations on load', async () => {
      // Save v1 state
      const v1Persistence = new StatePersistence(stateManager, {
        storage,
        version: 1
      });
      
      await v1Persistence.save();
      
      // Create v2 persistence with migration
      const v2Persistence = new StatePersistence(stateManager, {
        storage,
        version: 2,
        migrations: {
          2: (oldState) => ({
            ...oldState,
            user: {
              ...oldState.user,
              fullName: oldState.user.name,
              name: undefined
            }
          })
        }
      });
      
      await v2Persistence.load();
      
      expect(stateManager.get('user.fullName')).toBe('John');
      expect(stateManager.get('user.name')).toBeUndefined();
    });
    
    it('should apply multiple migrations in sequence', async () => {
      // Save v1 state
      const v1Persistence = new StatePersistence(stateManager, {
        storage,
        version: 1
      });
      
      await v1Persistence.save();
      
      // Create v3 persistence with multiple migrations
      const v3Persistence = new StatePersistence(stateManager, {
        storage,
        version: 3,
        migrations: {
          2: (state) => ({
            ...state,
            version: 2
          }),
          3: (state) => ({
            ...state,
            version: 3,
            migrated: true
          })
        }
      });
      
      await v3Persistence.load();
      
      expect(stateManager.get('version')).toBe(3);
      expect(stateManager.get('migrated')).toBe(true);
    });
  });
  
  describe('compression', () => {
    it('should compress and decompress data', async () => {
      const persistence = new StatePersistence(stateManager, {
        storage,
        compress: true
      });
      
      await persistence.save();
      
      const saved = storage.getItem('app-state');
      expect(saved).toBeTruthy();
      
      // Should be base64 encoded
      expect(() => JSON.parse(saved!)).toThrow();
      
      // Should load correctly
      await persistence.load();
      expect(stateManager.get('user.name')).toBe('John');
    });
    
    it('should verify checksum when compressed', async () => {
      const persistence = new StatePersistence(stateManager, {
        storage,
        compress: true
      });
      
      await persistence.save();
      
      // Corrupt the data
      const saved = storage.getItem('app-state')!;
      const corrupted = saved.slice(0, -1) + 'X';
      storage.setItem('app-state', corrupted);
      
      // Should handle corruption gracefully
      const result = await persistence.load();
      expect(result).toBeNull();
    });
  });
  
  describe('error handling', () => {
    it('should call error handler on errors', async () => {
      const onError = mock();
      
      const persistence = new StatePersistence(stateManager, {
        storage,
        onError,
        serializer: {
          serialize: () => { throw new Error('Serialize error'); },
          deserialize: (data) => JSON.parse(data)
        }
      });
      
      await persistence.save();
      
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Serialize error' })
      );
    });
    
    it('should emit error events', async () => {
      const errorHandler = mock();
      eventBus.on('persistence:error', errorHandler);
      
      const persistence = new StatePersistence(stateManager, {
        storage,
        serializer: {
          serialize: () => { throw new Error('Test error'); },
          deserialize: (data) => JSON.parse(data)
        }
      });
      
      await persistence.save();
      
      expect(errorHandler).toHaveBeenCalled();
    });
  });
  
  describe('persistence info', () => {
    it('should provide persistence info', async () => {
      const persistence = new StatePersistence(stateManager, {
        storage,
        version: 2
      });
      
      // Before save
      let info = persistence.getInfo();
      expect(info.exists).toBe(false);
      expect(info.size).toBe(0);
      
      // After save
      await persistence.save();
      info = persistence.getInfo();
      
      expect(info.exists).toBe(true);
      expect(info.size).toBeGreaterThan(0);
      expect(info.version).toBe(2);
      expect(info.timestamp).toBeGreaterThan(0);
    });
  });
  
  describe('clear and disable', () => {
    it('should clear persisted state', async () => {
      const persistence = new StatePersistence(stateManager, { storage });
      
      await persistence.save();
      expect(storage.getItem('app-state')).toBeTruthy();
      
      persistence.clear();
      expect(storage.getItem('app-state')).toBeNull();
    });
    
    it('should disable persistence', async () => {
      const persistence = new StatePersistence(stateManager, {
        storage,
        debounceDelay: 10
      });
      
      persistence.setEnabled(false);
      
      // Change state
      stateManager.set('user.name', 'Jane');
      
      // Wait for potential save
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Should not have saved
      expect(storage.getItem('app-state')).toBeNull();
    });
  });
  
  describe('custom serializer', () => {
    it('should use custom serializer', async () => {
      const customSerializer = {
        serialize: (data: any) => 'CUSTOM:' + JSON.stringify(data),
        deserialize: (data: string) => JSON.parse(data.replace('CUSTOM:', ''))
      };
      
      const persistence = new StatePersistence(stateManager, {
        storage,
        serializer: customSerializer
      });
      
      await persistence.save();
      
      const saved = storage.getItem('app-state');
      expect(saved?.startsWith('CUSTOM:')).toBe(true);
      
      await persistence.load();
      expect(stateManager.get('user.name')).toBe('John');
    });
  });
  
  describe('events', () => {
    it('should emit lifecycle events', async () => {
      const events: string[] = [];
      
      eventBus.on('persistence:loaded', () => events.push('loaded'));
      eventBus.on('persistence:saved', () => events.push('saved'));
      eventBus.on('persistence:cleared', () => events.push('cleared'));
      eventBus.on('persistence:migrated', () => events.push('migrated'));
      
      const persistence = new StatePersistence(stateManager, { storage });
      
      await persistence.save();
      expect(events).toContain('saved');
      
      await persistence.load();
      expect(events).toContain('loaded');
      
      persistence.clear();
      expect(events).toContain('cleared');
    });
  });
});
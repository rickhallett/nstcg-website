import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { TypedStateManager } from './TypedStateManager';
import { EventBus } from '../EventBus';
import { LoggerService } from '../LoggerService';

// Define test state interface
interface TestState {
  user: {
    id: string;
    name: string;
    email: string;
    settings: {
      theme: 'light' | 'dark';
      notifications: boolean;
    };
  } | null;
  posts: Array<{
    id: string;
    title: string;
    content: string;
    author: string;
  }>;
  stats: {
    total: number;
    active: number;
  };
}

describe('TypedStateManager', () => {
  let stateManager: TypedStateManager<TestState>;
  let eventBus: EventBus;
  let logger: LoggerService;
  
  const initialState: TestState = {
    user: null,
    posts: [],
    stats: {
      total: 0,
      active: 0
    }
  };
  
  beforeEach(() => {
    // Reset singletons
    EventBus._resetInstance();
    LoggerService._resetInstance();
    
    // Get instances
    eventBus = EventBus.getInstance();
    logger = LoggerService.getInstance();
    
    // Create typed state manager
    stateManager = new TypedStateManager<TestState>(eventBus, logger);
    stateManager.initialize(initialState);
  });
  
  describe('type safety', () => {
    it('should provide typed get access to top-level properties', () => {
      const user = stateManager.get('user');
      // TypeScript should know user is TestState['user']
      expect(user).toBeNull();
      
      const posts = stateManager.get('posts');
      // TypeScript should know posts is an array
      expect(posts).toBeArray();
      expect(posts.length).toBe(0);
      
      const stats = stateManager.get('stats');
      // TypeScript should know stats has total and active
      expect(stats.total).toBe(0);
      expect(stats.active).toBe(0);
    });
    
    it('should provide typed get access to nested properties', () => {
      // Set up user data
      const userData = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        settings: {
          theme: 'dark' as const,
          notifications: true
        }
      };
      
      stateManager.set('user', userData);
      
      // Test nested access
      const userName = stateManager.get('user', 'name');
      expect(userName).toBe('John Doe');
      
      const theme = stateManager.get('user', 'settings', 'theme');
      expect(theme).toBe('dark');
      
      const notifications = stateManager.get('user', 'settings', 'notifications');
      expect(notifications).toBe(true);
    });
    
    it('should provide typed set access', () => {
      // Should accept valid types
      stateManager.set('user', {
        id: '456',
        name: 'Jane Smith',
        email: 'jane@example.com',
        settings: {
          theme: 'light',
          notifications: false
        }
      });
      
      const user = stateManager.get('user');
      expect(user?.name).toBe('Jane Smith');
      
      // Set nested property
      stateManager.set(['user', 'settings', 'theme'], 'dark');
      const theme = stateManager.get('user', 'settings', 'theme');
      expect(theme).toBe('dark');
    });
    
    it('should provide typed update access', () => {
      stateManager.set('stats', { total: 5, active: 3 });
      
      stateManager.update('stats', current => ({
        ...current,
        total: current.total + 1
      }));
      
      const stats = stateManager.get('stats');
      expect(stats.total).toBe(6);
      expect(stats.active).toBe(3);
    });
    
    it('should support array operations with type safety', () => {
      const newPost = {
        id: 'p1',
        title: 'First Post',
        content: 'Hello world',
        author: 'user123'
      };
      
      // Add to array
      stateManager.update('posts', posts => [...posts, newPost]);
      
      const posts = stateManager.get('posts');
      expect(posts.length).toBe(1);
      expect(posts[0].title).toBe('First Post');
      
      // Update specific array item
      stateManager.update('posts', posts => 
        posts.map(p => p.id === 'p1' ? { ...p, title: 'Updated Title' } : p)
      );
      
      const updatedPosts = stateManager.get('posts');
      expect(updatedPosts[0].title).toBe('Updated Title');
    });
    
    it('should handle optional/nullable values correctly', () => {
      // Initially null
      const user = stateManager.get('user');
      expect(user).toBeNull();
      
      // Set to a value
      stateManager.set('user', {
        id: '789',
        name: 'Test User',
        email: 'test@example.com',
        settings: {
          theme: 'light',
          notifications: true
        }
      });
      
      const updatedUser = stateManager.get('user');
      expect(updatedUser).not.toBeNull();
      expect(updatedUser?.name).toBe('Test User');
      
      // Set back to null
      stateManager.set('user', null);
      expect(stateManager.get('user')).toBeNull();
    });
  });
  
  describe('backward compatibility', () => {
    it('should support untyped string paths like original StateManager', () => {
      stateManager.set('stats.total', 10);
      expect(stateManager.get('stats.total')).toBe(10);
      
      // First set up the user object
      stateManager.set('user', {
        id: '123',
        name: 'Test User',
        email: 'test@example.com',
        settings: {
          theme: 'light',
          notifications: true
        }
      });
      
      // Now we can set nested path
      stateManager.set('user.settings.theme', 'dark');
      const theme = stateManager.get('user.settings.theme');
      expect(theme).toBe('dark');
    });
    
    it('should support batch updates', () => {
      const updates = {
        'stats.total': 15,
        'stats.active': 8,
        'user': { 
          id: '999', 
          name: 'Batch User',
          email: 'batch@example.com',
          settings: { theme: 'light' as const, notifications: false }
        }
      };
      
      stateManager.batchUpdate(updates);
      
      expect(stateManager.get('stats', 'total')).toBe(15);
      expect(stateManager.get('stats', 'active')).toBe(8);
      expect(stateManager.get('user', 'name')).toBe('Batch User');
    });
    
    it('should emit events like original StateManager', () => {
      const listener = mock();
      eventBus.on('state:changed', listener);
      
      stateManager.set('stats', { total: 20, active: 10 });
      
      expect(listener).toHaveBeenCalled();
      // Just verify the event was emitted, the exact format depends on StateManager implementation
      expect(listener.mock.calls.length).toBeGreaterThan(0);
    });
  });
  
  describe('type guards and validation', () => {
    it('should validate paths at runtime', () => {
      // Invalid path should return undefined
      const invalid = stateManager.get('nonexistent' as any);
      expect(invalid).toBeUndefined();
      
      // Setting invalid path should log warning
      const warnSpy = mock();
      logger.warn = warnSpy;
      stateManager.set('invalid.path' as any, 'value');
      expect(warnSpy).toHaveBeenCalled();
    });
    
    it('should handle type mismatches gracefully', () => {
      // This would be a TypeScript error, but at runtime should handle gracefully
      const errorSpy = mock();
      logger.error = errorSpy;
      
      // Register a type guard for stats
      stateManager.registerTypeGuard('stats', (value): value is TestState['stats'] => {
        return typeof value === 'object' && 
               typeof value.total === 'number' && 
               typeof value.active === 'number';
      });
      
      // Attempt to set wrong type
      (stateManager as any).set('stats', { total: 'not a number', active: 5 });
      
      // Should log error
      expect(errorSpy).toHaveBeenCalled();
      // Value should remain unchanged
      expect(stateManager.get('stats', 'total')).toBe(0);
    });
  });
  
  describe('advanced type features', () => {
    it('should support computed selectors', () => {
      stateManager.set('user', {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        settings: { theme: 'dark', notifications: true }
      });
      
      stateManager.set('posts', [
        { id: 'p1', title: 'Post 1', content: 'Content 1', author: '123' },
        { id: 'p2', title: 'Post 2', content: 'Content 2', author: '456' }
      ]);
      
      // Create a selector for user's posts
      const userPosts = stateManager.select(
        state => state.posts.filter(p => p.author === state.user?.id)
      );
      
      expect(userPosts.length).toBe(1);
      expect(userPosts[0].title).toBe('Post 1');
    });
    
    it('should support subscriptions with type safety', () => {
      const listener = mock<(stats: TestState['stats']) => void>();
      
      // Subscribe to specific path with typed callback
      const unsubscribe = stateManager.subscribe('stats', listener);
      
      stateManager.set('stats', { total: 30, active: 15 });
      
      expect(listener).toHaveBeenCalledWith({ total: 30, active: 15 });
      
      // Cleanup
      unsubscribe();
    });
    
    it('should support partial state updates', () => {
      stateManager.set('user', {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        settings: { theme: 'light', notifications: true }
      });
      
      // Partial update
      stateManager.patch('user', {
        name: 'John Smith',
        settings: { theme: 'dark' }
      });
      
      const user = stateManager.get('user');
      expect(user?.name).toBe('John Smith');
      expect(user?.email).toBe('john@example.com'); // Unchanged
      expect(user?.settings.theme).toBe('dark');
      expect(user?.settings.notifications).toBe(true); // Unchanged
    });
  });
});
# TypedStateManager

An extension of the base StateManager that provides compile-time type safety while maintaining backward compatibility.

## Features

- **Type Safety**: Full TypeScript support with generic state shapes
- **Backward Compatible**: Works with existing string-based paths
- **Runtime Validation**: Optional type guards for runtime safety
- **Advanced Features**: Selectors, subscriptions, and partial updates

## Usage

### Basic Setup

```typescript
interface AppState {
  user: {
    id: string;
    name: string;
    settings: {
      theme: 'light' | 'dark';
      notifications: boolean;
    };
  } | null;
  posts: Post[];
  stats: {
    total: number;
    active: number;
  };
}

const stateManager = new TypedStateManager<AppState>(eventBus, logger);
stateManager.initialize({
  user: null,
  posts: [],
  stats: { total: 0, active: 0 }
});
```

### Typed Access

```typescript
// Type-safe get
const user = stateManager.get('user'); // Type: AppState['user']
const theme = stateManager.get('user', 'settings', 'theme'); // Type: 'light' | 'dark' | undefined

// Type-safe set
stateManager.set('user', { 
  id: '123', 
  name: 'John',
  settings: { theme: 'dark', notifications: true }
});

// Type-safe update
stateManager.update('stats', current => ({
  ...current,
  total: current.total + 1
}));
```

### Advanced Features

```typescript
// Selectors
const userPosts = stateManager.select(
  state => state.posts.filter(p => p.authorId === state.user?.id)
);

// Subscriptions
const unsubscribe = stateManager.subscribe('user', (user) => {
  console.log('User changed:', user);
});

// Partial updates
stateManager.patch('user', {
  name: 'Jane',
  settings: { theme: 'light' }
});

// Type guards for runtime validation
stateManager.registerTypeGuard('user', (value): value is User => {
  return value === null || (
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.name === 'string'
  );
});
```

### Backward Compatibility

The TypedStateManager still supports string-based paths:

```typescript
stateManager.set('user.settings.theme', 'dark');
const theme = stateManager.get('user.settings.theme');

stateManager.batchUpdate({
  'stats.total': 10,
  'stats.active': 5
});
```

## Migration Guide

To migrate from StateManager to TypedStateManager:

1. Define your state interface
2. Replace `StateManager` with `TypedStateManager<YourState>`
3. Pass EventBus and Logger to constructor
4. Existing string-based code continues to work
5. Gradually adopt typed methods for better safety

```typescript
// Before
const stateManager = StateManager.getInstance();
stateManager.set('user.name', 'John');

// After
const stateManager = new TypedStateManager<AppState>(eventBus, logger);
stateManager.set('user', { ...user, name: 'John' }); // Type-safe
stateManager.set('user.name', 'John'); // Still works
```
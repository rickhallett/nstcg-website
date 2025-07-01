# StateManager Implementation Instructions (Blueprint 002)

## Your Mission
You are responsible for implementing the StateManager module - the single source of truth for all application state in the Principia.js architecture. This module manages centralized state, provides change notifications, and ensures immutability.

## Setup Instructions

1. Create a new git worktree:
```bash
git worktree add ../principia-002 -b feature/blueprint-002
cd ../principia-002
```

2. Your implementation files:
- Main implementation: `src/StateManager.ts`
- Test file: `test/StateManager.test.ts`
- Integration: Update `src/index.ts` to export your module

## Blueprint Specification

### Core Requirements
1. **Singleton Pattern**: Only one StateManager instance can exist
2. **State Initialization**: Accept initial state object and deep clone it
3. **Immutable Updates**: All state changes must preserve immutability
4. **Change Notifications**: Emit events via EventBus when state changes
5. **Nested Property Access**: Support dot notation for deep properties
6. **Batch Updates**: Support multiple updates in a single operation

### Required Methods

```typescript
interface StateManager {
  getInstance(): StateManager;
  _resetInstance(): void; // For testing only
  
  initialize(initialState: object): void;
  get(path?: string): any;
  set(path: string, value: any): void;
  update(updates: object): void;
  subscribe(path: string, handler: Function): Function;
}
```

## Test-Driven Development Process

Follow this EXACT order - write one test at a time, make it pass, then commit:

### Test 1: Singleton Pattern
```typescript
it('should be a singleton, always returning the same instance')
// Verify getInstance() returns same instance multiple times
```

### Test 2: State Initialization
```typescript
it('should initialize with a deep clone of the initial state')
// Verify state is cloned, not referenced
```

### Test 3: Get Entire State
```typescript
it('should return entire state when get() called without path')
// Test parameterless get()
```

### Test 4: Get Nested Properties
```typescript
it('should get nested properties using dot notation')
// Test get('user.profile.name')
```

### Test 5: Get Returns Clones
```typescript
it('should return deep clones to prevent external mutations')
// Verify returned objects can't mutate internal state
```

### Test 6: Set Nested Properties
```typescript
it('should set nested properties and emit state:changed event')
// Test set() with EventBus integration
```

### Test 7: Update Multiple Properties
```typescript
it('should update multiple properties atomically')
// Test update() for batch operations
```

### Test 8: Subscribe to Changes
```typescript
it('should notify subscribers of specific path changes')
// Test subscription mechanism
```

## Implementation Guidelines

### Dependencies
- Import EventBus from '../EventBus'
- Use the EventBus singleton for all event emission

### State Storage
```typescript
private state: any = {};
private subscribers: Map<string, Set<Function>> = new Map();
```

### Deep Clone Implementation
```typescript
private deepClone(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(item => this.deepClone(item));
  
  const clonedObj: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clonedObj[key] = this.deepClone(obj[key]);
    }
  }
  return clonedObj;
}
```

### Path Resolution
```typescript
private resolvePath(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

private setPath(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
}
```

## Integration with EventBus

When state changes occur:
1. Emit `state:changed` event with payload: `{ path, oldValue, newValue }`
2. For batch updates, emit `state:batch-updated` with all changes

Example:
```typescript
set(path: string, value: any): void {
  const oldValue = this.get(path);
  this.setPath(this.state, path, value);
  const newValue = value;
  
  EventBus.getInstance().emit('state:changed', { path, oldValue, newValue });
  this.notifySubscribers(path, newValue);
}
```

## Commit Process

After EACH test passes:
```bash
git add -A
git commit -m "feat(StateManager): <specific feature implemented>"
```

Example commits:
- `feat(StateManager): implement singleton pattern`
- `feat(StateManager): add state initialization with deep cloning`
- `feat(StateManager): implement get method with path resolution`

## Final Steps

1. After all tests pass, update `src/index.ts`:
```typescript
export { StateManager } from './StateManager';
```

2. Run all tests to ensure no regressions:
```bash
bun test
```

3. Create PR:
```bash
gh pr create --title "feat(StateManager): Implement Blueprint 002 - State Management" \
  --body "Implements StateManager with singleton pattern, immutable updates, and EventBus integration"
```

## Architecture Notes

- StateManager is the ONLY place where application state lives
- All state mutations MUST go through StateManager methods
- Components will subscribe to state changes, not access state directly
- Models will use StateManager to persist business logic results
- Never expose the raw state object - always return clones

## Success Criteria

✅ All 8 tests passing
✅ 100% test coverage
✅ Clean TypeScript with no any types where avoidable
✅ Proper EventBus integration
✅ Immutability guaranteed
✅ Comprehensive error handling
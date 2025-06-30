[<- Back to Index](./000_master_blueprint.md)

# Blueprint: StateManager.js

**Objective:** To create a singleton state manager that holds the entire application state.

**Test Specification:** `tests/core/StateManager.test.js`

```javascript
import { StateManager } from '../../js/core/StateManager.js';
import { EventBus } from '../../js/core/EventBus.js';
import { expect } from '../../js/testing/expect.js';
import { describe, it, beforeEach, mockFn } from '../../js/testing/veritas.js';

jest.mock('../../js/core/EventBus.js');

describe('StateManager', () => {
  let stateManager;
  let mockEventBus;

  beforeEach(() => {
    StateManager._resetInstance();
    EventBus._resetInstance();
    stateManager = StateManager.getInstance();
    mockEventBus = EventBus.getInstance();
  });

  it('should be a singleton', () => {
    const instance2 = StateManager.getInstance();
    expect(stateManager).toBe(instance2);
  });

  it('should initialize with a deep clone of the initial state', () => {
    const initialState = { a: { b: 1 } };
    stateManager.initialize(initialState);
    initialState.a.b = 2;
    expect(stateManager.get('a.b')).toBe(1);
  });

  it('should get a value using a dot notation path', () => {
    stateManager.initialize({ user: { name: 'John' } });
    expect(stateManager.get('user.name')).toBe('John');
  });

  it('should return a clone of an object value, not a reference', () => {
    stateManager.initialize({ user: { details: { age: 30 } } });
    const userDetails = stateManager.get('user.details');
    userDetails.age = 31;
    expect(stateManager.get('user.details.age')).toBe(30);
  });

  it('should set a value using dot notation and emit a state change event', () => {
    stateManager.initialize({ user: { name: 'John' } });
    stateManager.set('user.name', 'Jane');
    expect(stateManager.get('user.name')).toBe('Jane');
    expect(mockEventBus.emit).toHaveBeenCalledWith('state:changed', {
      path: 'user.name',
      value: 'Jane'
    });
  });

  it('should update multiple values and emit a single batch event', () => {
    stateManager.initialize({ user: { name: 'John' }, theme: 'light' });
    stateManager.update({
      'user.name': 'Jane',
      'theme': 'dark'
    });
    expect(stateManager.get('user.name')).toBe('Jane');
    expect(stateManager.get('theme')).toBe('dark');
    expect(mockEventBus.emit).toHaveBeenCalledWith('state:batch-changed', {
      'user.name': 'Jane',
      'theme': 'dark'
    });
  });

  it('should subscribe a listener to a specific state path', () => {
    const listener = mockFn();
    stateManager.subscribe('user.name', listener);
    stateManager.set('user.name', 'Jane');
    expect(listener).toHaveBeenCalledWith('Jane');
  });

  it('should not call a listener if a different part of the state changes', () => {
    const listener = mockFn();
    stateManager.subscribe('user.name', listener);
    stateManager.set('user.age', 30);
    expect(listener).not.toHaveBeenCalled();
  });
});
```

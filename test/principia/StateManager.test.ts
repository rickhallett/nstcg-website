import { describe, it, beforeEach, expect, spyOn } from 'bun:test';
import { StateManager } from '../../src/principia/StateManager';
import { EventBus } from '../../src/principia/EventBus';

describe('StateManager', () => {
  beforeEach(() => {
    StateManager._resetInstance();
  });

  it('should be a singleton, always returning the same instance', () => {
    const instance1 = StateManager.getInstance();
    const instance2 = StateManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should initialize with a deep clone of the initial state', () => {
    const stateManager = StateManager.getInstance();
    const initialState = { a: { b: 1 } };
    stateManager.initialize(initialState);
    initialState.a.b = 2;
    expect(stateManager.get('a.b')).toBe(1);
  });

  it('should get a value using a dot notation path', () => {
    const stateManager = StateManager.getInstance();
    stateManager.initialize({ user: { name: 'John' } });
    expect(stateManager.get('user.name')).toBe('John');
  });

  it('should return a clone of an object value, not a reference', () => {
    const stateManager = StateManager.getInstance();
    stateManager.initialize({ user: { details: { age: 30 } } });
    const userDetails = stateManager.get('user.details');
    userDetails.age = 31;
    expect(stateManager.get('user.details.age')).toBe(30);
  });

  it('should set a value using dot notation', () => {
    const stateManager = StateManager.getInstance();
    stateManager.initialize({ user: { name: 'John' } });
    stateManager.set('user.name', 'Jane');
    expect(stateManager.get('user.name')).toBe('Jane');
  });

  it('should set a value using dot notation and emit a state change event', () => {
    const stateManager = StateManager.getInstance();
    const eventBus = EventBus.getInstance();
    const emitSpy = spyOn(eventBus, 'emit');
    
    stateManager.initialize({ user: { name: 'John' } });
    stateManager.set('user.name', 'Jane');
    
    expect(stateManager.get('user.name')).toBe('Jane');
    expect(emitSpy).toHaveBeenCalledWith('state:changed', {
      path: 'user.name',
      value: 'Jane'
    });
  });

  it('should update multiple values and emit a single batch event', () => {
    const stateManager = StateManager.getInstance();
    const eventBus = EventBus.getInstance();
    const emitSpy = spyOn(eventBus, 'emit');
    
    stateManager.initialize({ user: { name: 'John' }, theme: 'light' });
    stateManager.update({
      'user.name': 'Jane',
      'theme': 'dark'
    });
    
    expect(stateManager.get('user.name')).toBe('Jane');
    expect(stateManager.get('theme')).toBe('dark');
    expect(emitSpy).toHaveBeenCalledWith('state:batch-changed', {
      'user.name': 'Jane',
      'theme': 'dark'
    });
  });
});
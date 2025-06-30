import { StateManager } from '../src/StateManager';
import { EventBus } from '../src/EventBus';

jest.mock('../EventBus');

describe('StateManager', () => {
  let stateManager: StateManager;
  let mockEventBus: jest.Mocked<EventBus>;

  beforeEach(() => {
    StateManager._resetInstance();
    mockEventBus = new (EventBus as any)() as jest.Mocked<EventBus>;
    stateManager = StateManager.getInstance(mockEventBus);
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
    const listener = jest.fn();
    stateManager.subscribe('user.name', listener);
    
    // Manually trigger the event that the StateManager is listening to
    const eventCallback = (mockEventBus.on as jest.Mock).mock.calls.find(call => call[0] === 'state:changed')[1];
    eventCallback({ path: 'user.name', value: 'Jane' });

    expect(listener).toHaveBeenCalledWith('Jane');
  });

  it('should not call a listener if a different part of the state changes', () => {
    const listener = jest.fn();
    stateManager.subscribe('user.name', listener);

    const eventCallback = (mockEventBus.on as jest.Mock).mock.calls.find(call => call[0] === 'state:changed')[1];
    eventCallback({ path: 'user.age', value: 30 });
    
    expect(listener).not.toHaveBeenCalled();
  });

  it('should call a listener when a batch update includes its subscribed path', () => {
    const listener = jest.fn();
    stateManager.subscribe('user.name', listener);

    const eventCallback = (mockEventBus.on as jest.Mock).mock.calls.find(call => call[0] === 'state:batch-changed')[1];
    eventCallback({ 'user.name': 'Jane', 'theme': 'dark' });

    expect(listener).toHaveBeenCalledWith('Jane');
  });
});

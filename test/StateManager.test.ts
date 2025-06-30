// test/StateManager.test.ts
import { describe, it, expect, afterEach } from '../src/PrincipiaTest';
import { StateManager } from '../src/StateManager';

describe('StateManager', () => {
    afterEach(() => {
        StateManager.getInstance().reset();
    });

    it('should be a singleton', () => {
        const instance1 = StateManager.getInstance();
        const instance2 = StateManager.getInstance();
        expect(instance1).toBe(instance2);
    });

    it('should initialize with a deep clone of the initial state', () => {
        const initialState = { a: { b: 1 } };
        const stateManager = StateManager.getInstance();
        stateManager.initialize(initialState);
        initialState.a.b = 2;
        expect(stateManager.get('a.b')).toBe(1);
    });

    it('should get a value from the state', () => {
        const stateManager = StateManager.getInstance();
        stateManager.initialize({ a: { b: 1 } });
        expect(stateManager.get('a.b')).toBe(1);
    });

    it('should set a value in the state', () => {
        const stateManager = StateManager.getInstance();
        stateManager.initialize({ a: { b: 1 } });
        stateManager.set('a.b', 2);
        expect(stateManager.get('a.b')).toBe(2);
    });

    it('should update the state', () => {
        const stateManager = StateManager.getInstance();
        stateManager.initialize({ a: 1, b: 2 });
        stateManager.update({ b: 3, c: 4 });
        expect(stateManager.get('a')).toBe(1);
        expect(stateManager.get('b')).toBe(3);
        expect(stateManager.get('c')).toBe(4);
    });

    it('should record history of state changes', () => {
        const stateManager = StateManager.getInstance();
        stateManager.initialize({ a: 1 });
        stateManager.set('b', 2);
        stateManager.update({ c: 3 });
        const history = stateManager.getHistory();
        expect(history.length).toBe(3);
        expect(history[0]).toEqual({ a: 1 });
        expect(history[1]).toEqual({ a: 1, b: 2 });
        expect(history[2]).toEqual({ a: 1, b: 2, c: 3 });
    });
});

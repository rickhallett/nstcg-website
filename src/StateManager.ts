import { EventBus } from "./EventBus";

type State = { [key: string]: any };

class StateManager {
  private static instance: StateManager | null;
  private state: State = {};
  private eventBus: EventBus;

  private constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  public static getInstance(eventBus?: EventBus): StateManager {
    if (!StateManager.instance) {
      if (!eventBus) {
        throw new Error('EventBus instance must be provided on first call to getInstance');
      }
      StateManager.instance = new StateManager(eventBus);
    }
    return StateManager.instance;
  }

  public static _resetInstance(): void {
    StateManager.instance = null;
  }

  public initialize(initialState: State): void {
    this.state = this.deepClone(initialState);
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  public get(path: string): any {
    const value = this.getValueByPath(path);
    return this.deepClone(value);
  }

  private getValueByPath(path: string): any {
    const keys = path.split('.');
    let value = this.state;
    for (const key of keys) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[key];
    }
    return value;
  }

  public set(path: string, value: any): void {
    this.setValueByPath(path, value);
    this.eventBus.emit('state:changed', { path, value });
  }

  private setValueByPath(path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop();
    if (lastKey === undefined) {
      return;
    }
    let current = this.state;
    for (const key of keys) {
      if (current[key] === undefined || current[key] === null) {
        current[key] = {};
      }
      current = current[key];
    }
    current[lastKey] = this.deepClone(value);
  }

  public update(updates: { [path: string]: any }): void {
    for (const path in updates) {
      this.setValueByPath(path, updates[path]);
    }
    this.eventBus.emit('state:batch-changed', updates);
  }

  public subscribe(path: string, listener: (value: any) => void): () => void {
    const stateChangedUnsubscribe = this.eventBus.on(
      `state:changed`,
      (data: { path: string, value: any }) => {
        if (data.path === path) {
          listener(data.value);
        }
      }
    );

    const batchChangedUnsubscribe = this.eventBus.on(
      `state:batch-changed`,
      (updates: { [path: string]: any }) => {
        if (updates[path]) {
          listener(updates[path]);
        }
      }
    );

    return () => {
      stateChangedUnsubscribe();
      batchChangedUnsubscribe();
    };
  }
}

export { StateManager };

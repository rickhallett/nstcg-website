// StateManager - implemented following Blueprint 002
import { EventBus } from './EventBus';

export class StateManager {
  private static instance: StateManager;
  private state: any = {};
  
  static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }
  
  static _resetInstance(): void {
    StateManager.instance = null as any;
  }
  
  initialize(initialState: any): void {
    this.state = this.deepClone(initialState);
  }
  
  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (Array.isArray(obj)) return obj.map(item => this.deepClone(item));
    
    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }

  get(path: string): any {
    const keys = path.split('.');
    let current = this.state;
    for (const key of keys) {
      if (current == null) return undefined;
      current = current[key];
    }
    return this.deepClone(current);
  }
  
  set(path: string, value: any): void {
    const keys = path.split('.');
    let current = this.state;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    const lastKey = keys[keys.length - 1];
    current[lastKey] = this.deepClone(value);
    
    // Emit state change event
    EventBus.getInstance().emit('state:changed', {
      path: path,
      value: value
    });
  }
}
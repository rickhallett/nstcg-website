// src/StateManager.ts
import { EventBus } from './EventBus';

export class StateManager {
    private static instance: StateManager;
    private state: any = {};
    private history: any[] = [];

    private constructor() { }

    public static getInstance(): StateManager {
        if (!StateManager.instance) {
            StateManager.instance = new StateManager();
        }
        return StateManager.instance;
    }

    public initialize(initialState: any) {
        this.state = JSON.parse(JSON.stringify(initialState));
        this.history.push(JSON.parse(JSON.stringify(this.state)));
        EventBus.getInstance().emit('state:changed', this.state);
    }

    public get(path: string) {
        return path.split('.').reduce((acc, key) => acc && acc[key], this.state);
    }

    public set(path: string, value: any) {
        const keys = path.split('.');
        keys.reduce((acc, key, index) => {
            if (index === keys.length - 1) {
                acc[key] = value;
            } else {
                if (!acc[key]) {
                    acc[key] = {};
                }
                return acc[key];
            }
        }, this.state);
        this.history.push(JSON.parse(JSON.stringify(this.state)));
        EventBus.getInstance().emit('state:changed', this.state);
    }

    public update(newState: any) {
        this.state = { ...this.state, ...newState };
        this.history.push(JSON.parse(JSON.stringify(this.state)));
        EventBus.getInstance().emit('state:batch-changed', this.state);
    }

    public getHistory() {
        return this.history;
    }

    public reset() {
        this.state = {};
        this.history = [];
    }
}

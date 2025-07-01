// StarLinkOptimiser/test/DataStore.test.ts
import { describe, it, expect, afterEach } from '../../src/PrincipiaTest';
import { DataStore, SpeedTestResult } from '../src/DataStore';
import { rmSync, existsSync } from 'fs';

describe('DataStore', () => {
    const testDbPath = 'test.db.json';

    afterEach(() => {
        if (existsSync(testDbPath)) {
            rmSync(testDbPath);
        }
    });

    it('should add and get speed test results', () => {
        const dataStore = new DataStore(testDbPath);
        const result: SpeedTestResult = {
            timestamp: new Date().toISOString(),
            download: 100,
            upload: 50,
            ping: 20
        };
        dataStore.add(result);
        const results = dataStore.getAll();
        expect(results.length).toBe(1);
        expect(results[0]).toEqual(result);
    });

    it('should persist data to a file', () => {
        const dataStore1 = new DataStore(testDbPath);
        const result: SpeedTestResult = {
            timestamp: new Date().toISOString(),
            download: 100,
            upload: 50,
            ping: 20
        };
        dataStore1.add(result);

        const dataStore2 = new DataStore(testDbPath);
        const results = dataStore2.getAll();
        expect(results.length).toBe(1);
        expect(results[0]).toEqual(result);
    });

    it('should return the current state', () => {
        const dataStore = new DataStore(testDbPath);
        const result: SpeedTestResult = {
            timestamp: new Date().toISOString(),
            download: 100,
            upload: 50,
            ping: 20
        };
        dataStore.add(result);
        const state = dataStore.getState();
        expect(state.results.length).toBe(1);
        expect(state.results[0]).toEqual(result);
    });
});

// StarLinkOptimiser/test/DataStore.test.ts
import { describe, it, expect } from '../../src/PrincipiaTest';
import { DataStore, SpeedTestResult } from '../src/DataStore';

describe('DataStore', () => {
    it('should add and get speed test results', () => {
        const dataStore = new DataStore();
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
});

// StarLinkOptimiser/test/GraphGenerator.test.ts
import { describe, it, expect } from '../../src/PrincipiaTest';
import { GraphGenerator } from '../src/GraphGenerator';
import { SpeedTestResult } from '../src/DataStore';

describe('GraphGenerator', () => {
    it('should generate a graph', () => {
        const results: SpeedTestResult[] = [
            {
                timestamp: new Date().toISOString(),
                download: 100,
                upload: 50,
                ping: 20
            },
            {
                timestamp: new Date().toISOString(),
                download: 120,
                upload: 60,
                ping: 18
            }
        ];
        const html = GraphGenerator.generate(results);
        expect(html.includes('new Chart')).toBe(true);
    });
});

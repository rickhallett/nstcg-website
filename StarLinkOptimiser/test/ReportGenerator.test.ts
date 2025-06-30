// StarLinkOptimiser/test/ReportGenerator.test.ts
import { describe, it, expect, afterEach } from '../../src/PrincipiaTest';
import { ReportGenerator } from '../src/ReportGenerator';
import { SpeedTestResult } from '../src/DataStore';
import { rmSync, existsSync, readdirSync } from 'fs';

describe('ReportGenerator', () => {
    afterEach(() => {
        const reportDir = 'observer/reports';
        if (existsSync(reportDir)) {
            const files = readdirSync(reportDir);
            files.forEach(file => {
                rmSync(`${reportDir}/${file}`);
            });
        }
    });

    it('should generate a report', () => {
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
        ReportGenerator.generate('development', results);
        const reportDir = 'observer/reports';
        const files = readdirSync(reportDir);
        expect(files.length).toBe(1);
        expect(files[0].startsWith('development-')).toBe(true);
    });
});
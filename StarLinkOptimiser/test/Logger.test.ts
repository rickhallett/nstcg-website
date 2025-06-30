// StarLinkOptimiser/test/Logger.test.ts
import { describe, it, expect } from '../../src/PrincipiaTest';
import { Logger } from '../src/Logger';
import { Config } from '../src/ConfigParser';
import { rmSync } from 'fs';

describe('Logger', () => {
    it('should write to a log file', async () => {
        const config: Config = {
            testName: 'development',
            frequency: 60000,
            output: 'csv',
            logging: true,
            logFile: 'test.log',
            port: 3000
        };
        await Logger.log(config, 'test message');
        const content = await Bun.file('test.log').text();
        expect(content.includes('test message')).toBe(true);
        rmSync('test.log');
    });
});

// StarLinkOptimiser/test/Logger.test.ts
import { describe, it, expect, afterEach } from '../../src/PrincipiaTest';
import { Logger } from '../src/Logger';
import { Config } from '../src/ConfigParser';
import { rmSync, existsSync } from 'fs';

describe('Logger', () => {
    const logFile = 'test.log';

    afterEach(() => {
        if (existsSync(logFile)) {
            rmSync(logFile);
        }
    });

    it('should write to a log file', async () => {
        const config: Config = {
            testName: 'development',
            frequency: 60000,
            output: 'csv',
            logging: true,
            logFile: logFile,
            port: 3000
        };
        await Logger.log(config, 'test message 1');
        await Logger.log(config, 'test message 2');
        const content = await Bun.file(logFile).text();
        expect(content.includes('test message 1')).toBe(true);
        expect(content.includes('test message 2')).toBe(true);
    });
});
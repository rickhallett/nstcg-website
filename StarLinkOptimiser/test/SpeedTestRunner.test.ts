// StarLinkOptimiser/test/SpeedTestRunner.test.ts
import { describe, it, expect } from '../../src/PrincipiaTest';
import { SpeedTestRunner } from '../src/SpeedTestRunner';
import { Config } from '../src/ConfigParser';

describe('SpeedTestRunner', () => {
    it('should run speedtest-cli and return csv output', async () => {
        const commandExists = await Bun.spawn(['which', 'speedtest-cli']).exited === 0;
        if (!commandExists) {
            console.log('speedtest-cli not found, skipping test');
            return;
        }

        const config: Config = {
            testName: 'development',
            frequency: 60000,
            output: 'csv',
            logging: false,
            logFile: '',
            port: 3000
        };
        const output = await SpeedTestRunner.run(config);
        expect(output.includes('Server ID,Sponsor,Server Name,Timestamp,Distance,Ping,Download,Upload,Share,IP Address')).toBe(true);
    });

    it('should throw an error if speedtest-cli is not found', async () => {
        const config: Config = {
            testName: 'development',
            frequency: 60000,
            output: 'csv',
            logging: false,
            logFile: '',
            port: 3000
        };

        let error;
        try {
            // @ts-ignore
            await SpeedTestRunner.run(config, 'non-existent-command');
        } catch (e) {
            error = e;
        }

        expect(error.message).toBe('speedtest-cli not found');
    });
});

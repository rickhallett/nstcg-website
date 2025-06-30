// StarLinkOptimiser/test/SpeedTestRunner.test.ts
import { describe, it, expect, createMock } from '../../src/PrincipiaTest';
import { SpeedTestRunner } from '../src/SpeedTestRunner';
import { Config } from '../src/ConfigParser';

describe('SpeedTestRunner', () => {
    it('should run speedtest-cli and return csv output', async () => {
        const mockRunner = createMock(['run']);
        const csv = `Server ID,Sponsor,Server Name,Timestamp,Distance,Ping,Download,Upload,Share,IP Address
11547,"KamaTera, Inc.","London","2025-06-30T10:23:34.290577Z",2131.952554256924,33.043,164663739.40317908,26290481.884721164,"",209.198.129.225`;
        mockRunner.run.mockReturnValue(Promise.resolve(csv));
        (SpeedTestRunner as any).run = mockRunner.run;

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
        const mockRunner = createMock(['run']);
        mockRunner.run.mockImplementation(() => {
            throw new Error('speedtest-cli not found');
        });
        (SpeedTestRunner as any).run = mockRunner.run;

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
            await SpeedTestRunner.run(config);
        } catch (e) {
            error = e;
        }

        expect(error.message).toBe('speedtest-cli not found');
    });

    it('should run speedtest-cli and return json output', async () => {
        const mockRunner = createMock(['run']);
        const json = '{"download": 100, "upload": 50, "ping": 20}';
        mockRunner.run.mockReturnValue(Promise.resolve(json));
        (SpeedTestRunner as any).run = mockRunner.run;

        const config: Config = {
            testName: 'development',
            frequency: 60000,
            output: 'json',
            logging: false,
            logFile: '',
            port: 3000
        };
        const output = await SpeedTestRunner.run(config);
        const data = JSON.parse(output);
        expect(data).toHaveProperty('download');
        expect(data).toHaveProperty('upload');
        expect(data).toHaveProperty('ping');
    });
});

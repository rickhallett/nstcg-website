// StarLinkOptimiser/test/StarLinkOptimiser.test.ts
import { describe, it, expect, beforeEach, afterEach, createMock } from '../../src/PrincipiaTest';
import { StarLinkOptimiser, ServiceState } from '../src/StarLinkOptimiser';
import { rmSync, existsSync } from 'fs';
import { SpeedTestRunner } from '../src/SpeedTestRunner';

describe('StarLinkOptimiser', () => {
    let optimiser: StarLinkOptimiser;
    const mockSpeedTestRunner = createMock(['run']);
    const testConfigPath = 'test.yaml';

    beforeEach(async () => {
        const config = `
testName: development
frequency: 100
output: csv
logging: true
logFile: test.log
port: 3000
`;
        await Bun.write(testConfigPath, config);
        optimiser = await StarLinkOptimiser.create(testConfigPath);
        (optimiser as any).speedTestRunner = mockSpeedTestRunner;
    });

    afterEach(() => {
        rmSync(testConfigPath);
        if (existsSync('test.log')) {
            rmSync('test.log');
        }
        if (existsSync('development.db.json')) {
            rmSync('development.db.json');
        }
        if (existsSync('development.pid')) {
            rmSync('development.pid');
        }
    });

    it('should have a registered state initially', () => {
        expect(optimiser.getState()).toBe(ServiceState.REGISTERED);
    });

    it('should transition through states correctly on start and stop', async () => {
        expect(optimiser.getState()).toBe(ServiceState.REGISTERED);
        await optimiser.start();
        expect(optimiser.getState()).toBe(ServiceState.RUNNING);
        optimiser.stop();
        expect(optimiser.getState()).toBe(ServiceState.STOPPED);
    });

    it('should transition to failed state on error', async () => {
        mockSpeedTestRunner.run.mockImplementation(() => {
            throw new Error('test error');
        });
        await optimiser.start();
        await new Promise(resolve => setTimeout(resolve, 500));
        expect(optimiser.getState()).toBe(ServiceState.FAILED);
        optimiser.stop();
    });

    it('should parse csv and add to datastore', async () => {
        const csv = `Server ID,Sponsor,Server Name,Timestamp,Distance,Ping,Download,Upload,Share,IP Address
11547,"KamaTera, Inc.","London","2025-06-30T10:23:34.290577Z",2131.952554256924,33.043,164663739.40317908,26290481.884721164,"",209.198.129.225`;
        mockSpeedTestRunner.run.mockImplementation(() => Promise.resolve(csv));
        await optimiser.start();
        await new Promise(resolve => setTimeout(resolve, 500));
        const results = optimiser.dataStore.getAll();
        expect(results.length >= 2).toBe(true);
        expect(results[0].download).toBe(164663739.40317908);
        expect(results[0].upload).toBe(26290481.884721164);
        expect(results[0].ping).toBe(33.043);
        optimiser.stop();
    });

    it('should change frequency', async () => {
        const csv = `Server ID,Sponsor,Server Name,Timestamp,Distance,Ping,Download,Upload,Share,IP Address
11547,"KamaTera, Inc.","London","2025-06-30T10:23:34.290577Z",2131.952554256924,33.043,164663739.40317908,26290481.884721164,"",209.198.129.225`;
        mockSpeedTestRunner.run.mockImplementation(() => Promise.resolve(csv));
        await optimiser.start();
        await new Promise(resolve => setTimeout(resolve, 150));
        optimiser.setFrequency(50);
        await new Promise(resolve => setTimeout(resolve, 150));
        const results = optimiser.dataStore.getAll();
        expect(results.length >= 3).toBe(true);
        optimiser.stop();
    });

    it('should shutdown gracefully', async () => {
        const proc = Bun.spawn(['bun', 'src/index.ts', testConfigPath], {
            cwd: './',
            stdio: ['inherit', 'inherit', 'inherit'],
        });
        await new Promise(resolve => setTimeout(resolve, 200));
        proc.kill('SIGINT');
        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);
    });

    it('should run in background and stop', async () => {
        optimiser.runInBackground(testConfigPath);
        await new Promise(resolve => setTimeout(resolve, 200));
        expect(existsSync('development.pid')).toBe(true);
        optimiser.stopBackground();
        await new Promise(resolve => setTimeout(resolve, 200));
        expect(existsSync('development.pid')).toBe(false);
    });
});

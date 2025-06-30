// StarLinkOptimiser/test/StarLinkOptimiser.test.ts
import { describe, it, expect, beforeEach, afterEach, createMock } from '../../src/PrincipiaTest';
import { StarLinkOptimiser } from '../src/StarLinkOptimiser';
import { rmSync } from 'fs';
import { SpeedTestRunner } from '../src/SpeedTestRunner';

describe('StarLinkOptimiser', () => {
    let optimiser: StarLinkOptimiser;
    const mockSpeedTestRunner = createMock(['run']);

    beforeEach(async () => {
        const config = `
testName: development
frequency: 100
output: csv
logging: true
logFile: test.log
port: 3000
`;
        await Bun.write('test.yaml', config);
        optimiser = await StarLinkOptimiser.create('test.yaml');
        (optimiser as any).speedTestRunner = mockSpeedTestRunner;
    });

    afterEach(() => {
        optimiser.stop();
        rmSync('test.yaml');
        if (Bun.file('test.log').size > 0) {
            rmSync('test.log');
        }
    });

    it('should start and stop the service', async () => {
        await optimiser.start();
        expect(optimiser.isRunning).toBe(true);
        optimiser.stop();
        expect(optimiser.isRunning).toBe(false);
    });

    it('should parse csv and add to datastore', async () => {
        const csv = `Server ID,Sponsor,Server Name,Timestamp,Distance,Ping,Download,Upload,Share,IP Address
11547,"KamaTera, Inc.","London","2025-06-30T10:23:34.290577Z",2131.952554256924,33.043,164663739.40317908,26290481.884721164,"",209.198.129.225`;
        mockSpeedTestRunner.run.mockReturnValue(Promise.resolve(csv));
        await optimiser.start();
        await new Promise(resolve => setTimeout(resolve, 300));
        optimiser.stop();
        const results = optimiser.dataStore.getAll();
        expect(results.length >= 2).toBe(true);
        expect(results[0].download).toBe(164663739.40317908);
        expect(results[0].upload).toBe(26290481.884721164);
        expect(results[0].ping).toBe(33.043);
    });

    it('should stop on SIGINT', async () => {
        const proc = Bun.spawn(['bun', 'src/index.ts'], {
            cwd: './',
            stdio: ['inherit', 'inherit', 'inherit'],
        });
        await new Promise(resolve => setTimeout(resolve, 200));
        proc.kill('SIGINT');
        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);
    });

    it('should stop on SIGTERM', async () => {
        const proc = Bun.spawn(['bun', 'src/index.ts'], {
            cwd: './',
            stdio: ['inherit', 'inherit', 'inherit'],
        });
        await new Promise(resolve => setTimeout(resolve, 200));
        proc.kill('SIGTERM');
        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);
    });

    it('should run in background', async () => {
        optimiser.runInBackground();
        // How to assert that the process is running in the background?
        // For now, just check that the method doesn't throw.
    });
});


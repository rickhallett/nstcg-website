// StarLinkOptimiser/test/StarLinkOptimiser.test.ts
import { describe, it, expect, beforeEach, afterEach } from '../../src/PrincipiaTest';
import { StarLinkOptimiser } from '../src/StarLinkOptimiser';
import { rmSync } from 'fs';

describe('StarLinkOptimiser', () => {
    let optimiser: StarLinkOptimiser;

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
});

// StarLinkOptimiser/test/ConfigParser.test.ts
import { describe, it, expect, beforeEach, afterEach } from '../../src/PrincipiaTest';
import { ConfigParser } from '../src/ConfigParser';
import { rmSync } from 'fs';

describe('ConfigParser', () => {
    const testYaml = `
testName: development
frequency: 60000
output: csv
logging: true
logFile: starlink-optimiser.log
port: 3000
`;
    const testYamlPath = 'test.yaml';

    beforeEach(() => {
        Bun.write(testYamlPath, testYaml);
    });

    afterEach(() => {
        rmSync(testYamlPath);
    });

    it('should parse a valid YAML file', async () => {
        const config = await ConfigParser.parseFile(testYamlPath);
        expect(config.testName).toBe('development');
        expect(config.frequency).toBe(60000);
        expect(config.output).toBe('csv');
        expect(config.logging).toBe(true);
        expect(config.logFile).toBe('starlink-optimiser.log');
        expect(config.port).toBe(3000);
    });
});
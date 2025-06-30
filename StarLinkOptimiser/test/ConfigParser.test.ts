// StarLinkOptimiser/test/ConfigParser.test.ts
import { describe, it, expect } from '../../src/PrincipiaTest';
import { ConfigParser } from '../src/ConfigParser';

describe('ConfigParser', () => {
    it('should parse a valid YAML string', () => {
        const yaml = `
testName: development
frequency: 60000
output: csv
logging: true
logFile: starlink-optimiser.log
port: 3000
`;
        const config = ConfigParser.parse(yaml);
        expect(config.testName).toBe('development');
        expect(config.frequency).toBe(60000);
        expect(config.output).toBe('csv');
        expect(config.logging).toBe(true);
        expect(config.logFile).toBe('starlink-optimiser.log');
        expect(config.port).toBe(3000);
    });
});

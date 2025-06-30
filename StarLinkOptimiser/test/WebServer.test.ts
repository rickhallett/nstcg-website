// StarLinkOptimiser/test/WebServer.test.ts
import { describe, it, expect } from '../../src/PrincipiaTest';
import { WebServer } from '../src/WebServer';
import { Config } from '../src/ConfigParser';
import { DataStore } from '../src/DataStore';

describe('WebServer', () => {
    it('should serve the observer dashboard', async () => {
        const port = Math.floor(Math.random() * 10000) + 10000;
        const config: Config = {
            testName: 'development',
            frequency: 60000,
            output: 'csv',
            logging: false,
            logFile: '',
            port: port
        };
        const dataStore = new DataStore();
        const webServer = new WebServer(config, dataStore);
        
        try {
            webServer.start();
            await new Promise(resolve => setTimeout(resolve, 100)); // allow server to start
            const res = await fetch(`http://localhost:${port}`);
            const text = await res.text();
            expect(text.includes('StarLinkOptimiser Observer')).toBe(true);
        } finally {
            await webServer.stop();
        }
    });
});

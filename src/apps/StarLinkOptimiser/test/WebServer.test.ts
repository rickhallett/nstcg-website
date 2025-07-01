// StarLinkOptimiser/test/WebServer.test.ts
import { describe, it, expect, afterEach } from '../../src/PrincipiaTest';
import { WebServer } from '../src/WebServer';
import { Config } from '../src/ConfigParser';
import { StateManager } from '../../src/StateManager';

describe('WebServer', () => {
    let webServer: WebServer;
    const port = Math.floor(Math.random() * 10000) + 10000;
    const config: Config = {
        testName: 'development',
        frequency: 60000,
        output: 'csv',
        logging: false,
        logFile: '',
        port: port
    };

    afterEach(async () => {
        if (webServer) {
            await webServer.stop();
        }
        StateManager.getInstance().reset();
    });

    it('should serve the observer dashboard', async () => {
        const stateManager = StateManager.getInstance();
        stateManager.initialize({
            results: [{
                testName: 'development',
                timestamp: new Date().toISOString(),
                download: 100,
                upload: 50,
                ping: 20
            }]
        });
        webServer = new WebServer(config);
        
        webServer.start();
        await new Promise(resolve => setTimeout(resolve, 100)); // allow server to start
        const res = await fetch(`http://localhost:${port}`);
        const text = await res.text();
        expect(text.includes('StarLinkOptimiser Observer')).toBe(true);
    });

    it('should serve a report', async () => {
        webServer = new WebServer(config);
        webServer.start();
        await new Promise(resolve => setTimeout(resolve, 100)); // allow server to start
        const res = await fetch(`http://localhost:${port}/reports/development`);
        const text = await res.text();
        expect(text).toBe('Report for development');
    });

    it('should serve data for a specific test', async () => {
        const stateManager = StateManager.getInstance();
        stateManager.initialize({
            results: [
                {
                    testName: 'development',
                    timestamp: new Date().toISOString(),
                    download: 100,
                    upload: 50,
                    ping: 20
                },
                {
                    testName: 'production',
                    timestamp: new Date().toISOString(),
                    download: 200,
                    upload: 100,
                    ping: 10
                }
            ]
        });
        webServer = new WebServer(config);
        webServer.start();
        await new Promise(resolve => setTimeout(resolve, 100)); // allow server to start
        const res = await fetch(`http://localhost:${port}/api/data/development`);
        const json = await res.json();
        expect(json.length).toBe(1);
        expect(json[0].download).toBe(100);
    });
});

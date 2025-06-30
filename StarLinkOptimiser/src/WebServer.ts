// StarLinkOptimiser/src/WebServer.ts
import { Config } from './ConfigParser';
import { StateManager } from '../../src/StateManager';
import { IService } from '../../src/IService';
import { Server } from 'bun';

export class WebServer implements IService {
    private config: Config;
    private stateManager: StateManager;
    private server: Server | null = null;

    constructor(config: Config) {
        this.config = config;
        this.stateManager = StateManager.getInstance();
    }

    async start() {
        this.server = Bun.serve({
            port: this.config.port,
            fetch: (req) => {
                const url = new URL(req.url);
                if (url.pathname === '/') {
                    return new Response(Bun.file('observer/index.html'));
                }
                if (url.pathname.startsWith('/reports/')) {
                    const testName = url.pathname.split('/')[2];
                    // TODO: Implement report generation
                    return new Response(`Report for ${testName}`);
                }
                if (url.pathname.startsWith('/api/data/')) {
                    const testName = url.pathname.split('/')[3];
                    const results = this.stateManager.get('results').filter((r: any) => r.testName === testName);
                    return new Response(JSON.stringify(results), {
                        headers: { 'Content-Type': 'application/json' },
                    });
                }
                return new Response('Not Found', { status: 404 });
            },
        });
        console.log(`Observer dashboard running at http://localhost:${this.server.port}`);
    }

    async stop() {
        if (this.server) {
            this.server.stop(true); // true for graceful shutdown
            await new Promise(resolve => setTimeout(resolve, 100)); // allow server to close
        }
    }
}
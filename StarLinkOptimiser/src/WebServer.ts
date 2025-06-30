// StarLinkOptimiser/src/WebServer.ts
import { Config } from './ConfigParser';
import { StateManager } from '../../src/StateManager';
import { Server } from 'bun';

export class WebServer {
    private config: Config;
    private stateManager: StateManager;
    private server: Server | null = null;

    constructor(config: Config) {
        this.config = config;
        this.stateManager = StateManager.getInstance();
    }

    start() {
        this.server = Bun.serve({
            port: this.config.port,
            fetch: (req) => {
                const url = new URL(req.url);
                if (url.pathname === '/') {
                    return new Response(Bun.file('observer/index.html'));
                }
                if (url.pathname === '/data') {
                    return new Response(JSON.stringify(this.stateManager.get('results')), {
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
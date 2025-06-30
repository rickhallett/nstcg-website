// StarLinkOptimiser/src/WebServer.ts
import { Config } from './ConfigParser';
import { DataStore } from './DataStore';
import { Server } from 'bun';

export class WebServer {
    private config: Config;
    private dataStore: DataStore;
    private server: Server | null = null;

    constructor(config: Config, dataStore: DataStore) {
        this.config = config;
        this.dataStore = dataStore;
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
                    return new Response(JSON.stringify(this.dataStore.getAll()), {
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

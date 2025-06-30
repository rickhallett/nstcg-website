// StarLinkOptimiser/src/index.ts
import { StarLinkOptimiser } from './StarLinkOptimiser';
import { WebServer } from './WebServer';
import { ServiceRegistry } from '../../src/ServiceRegistry';
import { ConfigParser } from './ConfigParser';

const configPath = process.argv[2] || 'config.development.yaml';
const config = await ConfigParser.parseFile(configPath);

const optimiser = await StarLinkOptimiser.create(configPath);
const webServer = new WebServer(config);

const registry = new ServiceRegistry();
registry.register(optimiser);
registry.register(webServer);

await registry.startAll();

process.on('SIGINT', async () => {
    await registry.stopAll();
    process.exit(0);
});

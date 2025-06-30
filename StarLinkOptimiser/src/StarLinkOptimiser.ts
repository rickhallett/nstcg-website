// StarLinkOptimiser/src/StarLinkOptimiser.ts
import { Config, ConfigParser } from './ConfigParser';
import { SpeedTestRunner } from './SpeedTestRunner';
import { DataStore } from './DataStore';
import { Logger } from './Logger';

export class StarLinkOptimiser {
    private config: Config;
    private dataStore: DataStore;
    private timer: Timer | null = null;
    public isRunning: boolean = false;

    private constructor(config: Config) {
        this.config = config;
        this.dataStore = new DataStore();
    }

    static async create(configPath: string): Promise<StarLinkOptimiser> {
        const yaml = await Bun.file(configPath).text();
        const config = ConfigParser.parse(yaml);
        return new StarLinkOptimiser(config);
    }

    async start() {
        Logger.log(this.config, 'Starting StarLinkOptimiser');
        this.isRunning = true;
        this.timer = setInterval(async () => {
            const output = await SpeedTestRunner.run(this.config);
            Logger.log(this.config, `Speedtest output: ${output}`);
            // Parse output and add to dataStore
        }, this.config.frequency);
    }

    stop() {
        Logger.log(this.config, 'Stopping StarLinkOptimiser');
        this.isRunning = false;
        if (this.timer) {
            clearInterval(this.timer);
        }
    }
}

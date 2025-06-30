// StarLinkOptimiser/src/StarLinkOptimiser.ts
import { Config, ConfigParser } from './ConfigParser';
import { SpeedTestRunner } from './SpeedTestRunner';
import { DataStore, SpeedTestResult } from './DataStore';
import { Logger } from './Logger';

export class StarLinkOptimiser {
    private config: Config;
    public dataStore: DataStore;
    private timer: Timer | null = null;
    public isRunning: boolean = false;
    private speedTestRunner: typeof SpeedTestRunner;

    private constructor(config: Config, speedTestRunner: typeof SpeedTestRunner = SpeedTestRunner) {
        this.config = config;
        this.dataStore = new DataStore(`${config.testName}.db.json`);
        this.speedTestRunner = speedTestRunner;
    }

    static async create(configPath: string): Promise<StarLinkOptimiser> {
        const config = await ConfigParser.parseFile(configPath);
        return new StarLinkOptimiser(config);
    }

    async start() {
        Logger.log(this.config, 'Starting StarLinkOptimiser');
        this.isRunning = true;
        this.timer = setInterval(async () => {
            const output = await this.speedTestRunner.run(this.config);
            Logger.log(this.config, `Speedtest output: ${output}`);
            const result = this.parseCsv(output);
            if (result) {
                this.dataStore.add(result);
            }
        }, this.config.frequency);

        process.on('SIGINT', () => this.stop());
        process.on('SIGTERM', () => this.stop());
    }

    stop() {
        Logger.log(this.config, 'Stopping StarLinkOptimiser');
        this.isRunning = false;
        if (this.timer) {
            clearInterval(this.timer);
        }
    }

    runInBackground() {
        const proc = Bun.spawn(['bun', 'src/index.ts'], {
            cwd: './',
            stdio: ['ignore', 'ignore', 'ignore'],
            detached: true,
        });
        proc.unref();
    }

    private parseCsv(csv: string): SpeedTestResult | null {
        const lines = csv.split('\n');
        if (lines.length < 2) {
            return null;
        }
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const values = lines[1].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(v => v.trim().replace(/"/g, ''));
        if (!values) {
            return null;
        }
        const result: any = {};
        headers.forEach((header, i) => {
            result[header] = values[i];
        });
        return {
            timestamp: result.Timestamp,
            download: parseFloat(result.Download),
            upload: parseFloat(result.Upload),
            ping: parseFloat(result.Ping)
        };
    }
}

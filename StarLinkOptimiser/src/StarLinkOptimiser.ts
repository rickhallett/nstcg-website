// StarLinkOptimiser/src/StarLinkOptimiser.ts
import { Config, ConfigParser } from './ConfigParser';
import { SpeedTestRunner } from './SpeedTestRunner';
import { DataStore, SpeedTestResult } from './DataStore';
import { Logger } from './Logger';
import { StateManager } from '../../src/StateManager';
import { writeFileSync, readFileSync, existsSync, rmSync } from 'fs';

export enum ServiceState {
    REGISTERED,
    INITIALIZING,
    RUNNING,
    STOPPING,
    STOPPED,
    FAILED,
}

export class StarLinkOptimiser {
    private config: Config;
    public dataStore: DataStore;
    private timer: Timer | null = null;
    private stateManager: StateManager;
    private speedTestRunner: typeof SpeedTestRunner;
    private pidFilePath: string;

    private constructor(config: Config, speedTestRunner: typeof SpeedTestRunner = SpeedTestRunner) {
        this.config = config;
        this.dataStore = new DataStore(`${config.testName}.db.json`);
        this.speedTestRunner = speedTestRunner;
        this.pidFilePath = `${config.testName}.pid`;
        this.stateManager = StateManager.getInstance();
        this.stateManager.initialize({
            serviceState: ServiceState.REGISTERED,
            results: [],
        });
    }

    static async create(configPath: string): Promise<StarLinkOptimiser> {
        const config = await ConfigParser.parseFile(configPath);
        return new StarLinkOptimiser(config);
    }

    async start() {
        this.stateManager.set('serviceState', ServiceState.INITIALIZING);
        Logger.log(this.config, 'Starting StarLinkOptimiser');
        this.stateManager.set('serviceState', ServiceState.RUNNING);
        this.runTest();

        process.on('SIGINT', () => this.shutdown());
        process.on('SIGTERM', () => this.shutdown());
    }

    private runTest() {
        if (this.stateManager.get('serviceState') !== ServiceState.RUNNING) {
            return;
        }
        this.timer = setTimeout(async () => {
            try {
                const output = await this.speedTestRunner.run(this.config);
                Logger.log(this.config, `Speedtest output: ${output}`);
                const result = this.parseCsv(output);
                if (result) {
                    this.dataStore.add(result);
                    this.stateManager.set('results', this.dataStore.getAll());
                }
            } catch (error) {
                Logger.log(this.config, `Error running speedtest: ${error.message}`);
                this.stateManager.set('serviceState', ServiceState.FAILED);
                this.stop();
            } finally {
                this.runTest();
            }
        }, this.config.frequency);
    }

    stop() {
        if (this.stateManager.get('serviceState') !== ServiceState.FAILED) {
            this.stateManager.set('serviceState', ServiceState.STOPPING);
        }
        Logger.log(this.config, 'Stopping StarLinkOptimiser');
        if (this.timer) {
            clearTimeout(this.timer);
        }
        if (this.stateManager.get('serviceState') !== ServiceState.FAILED) {
            this.stateManager.set('serviceState', ServiceState.STOPPED);
        }
    }

    shutdown() {
        this.stop();
        if (existsSync(this.pidFilePath)) {
            rmSync(this.pidFilePath);
        }
        process.exit(0);
    }

    setFrequency(frequency: number) {
        this.config.frequency = frequency;
    }

    getState(): ServiceState {
        return this.stateManager.get('serviceState');
    }

    runInBackground(configPath: string) {
        const proc = Bun.spawn(['bun', 'src/index.ts', configPath], {
            cwd: './',
            stdio: ['ignore', 'ignore', 'ignore'],
            detached: true,
        });
        writeFileSync(this.pidFilePath, proc.pid.toString());
        proc.unref();
    }

    stopBackground() {
        if (existsSync(this.pidFilePath)) {
            const pid = parseInt(readFileSync(this.pidFilePath, 'utf-8'));
            process.kill(pid, 'SIGTERM');
            rmSync(this.pidFilePath);
        }
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

// StarLinkOptimiser/src/Logger.ts
import { Config } from './ConfigParser';

export class Logger {
    static async log(config: Config, message: string) {
        if (config.logging) {
            await Bun.write(config.logFile, `${new Date().toISOString()}: ${message}\n`, { createPath: true });
        }
    }
}


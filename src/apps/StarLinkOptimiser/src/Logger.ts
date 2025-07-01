// StarLinkOptimiser/src/Logger.ts
import { Config } from './ConfigParser';
import { appendFileSync } from 'fs';

export class Logger {
    static log(config: Config, message: string) {
        if (config.logging) {
            appendFileSync(config.logFile, `${new Date().toISOString()}: ${message}\n`);
        }
    }
}
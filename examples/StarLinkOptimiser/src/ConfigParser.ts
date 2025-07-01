// StarLinkOptimiser/src/ConfigParser.ts
import * as yaml from 'js-yaml';

export type Config = {
    testName: string;
    frequency: number;
    output: string;
    logging: boolean;
    logFile: string;
    port: number;
};

export class ConfigParser {
    static async parseFile(filePath: string): Promise<Config> {
        const fileContent = await Bun.file(filePath).text();
        const config = yaml.load(fileContent) as Config;
        return config;
    }
}
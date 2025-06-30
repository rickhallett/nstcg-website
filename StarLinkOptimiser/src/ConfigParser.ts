// StarLinkOptimiser/src/ConfigParser.ts
export type Config = {
    testName: string;
    frequency: number;
    output: string;
    logging: boolean;
    logFile: string;
    port: number;
};

export class ConfigParser {
    static parse(yaml: string): Config {
        const config: any = {};
        const lines = yaml.split('\n');
        lines.forEach(line => {
            const [key, value] = line.split(':').map(s => s.trim());
            if (key && value) {
                if (value === 'true' || value === 'false') {
                    config[key] = value === 'true';
                } else if (!isNaN(Number(value))) {
                    config[key] = Number(value);
                } else {
                    config[key] = value;
                }
            }
        });
        return config as Config;
    }
}


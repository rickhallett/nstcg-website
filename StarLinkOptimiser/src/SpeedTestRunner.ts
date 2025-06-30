// StarLinkOptimiser/src/SpeedTestRunner.ts
import { Config } from './ConfigParser';

export class SpeedTestRunner {
    static async run(config: Config): Promise<string> {
        const args = ['speedtest-cli'];
        if (config.output === 'csv') {
            args.push('--csv');
            args.push('--csv-header');
        } else if (config.output === 'json') {
            args.push('--json');
        }
        const proc = Bun.spawn(args);
        const text = await new Response(proc.stdout).text();
        return text;
    }
}

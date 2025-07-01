// StarLinkOptimiser/src/SpeedTestRunner.ts
import { Config } from './ConfigParser';

export class SpeedTestRunner {
    static async run(config: Config, command = 'speedtest-cli'): Promise<string> {
        try {
            const proc = Bun.spawn([command, '--version']);
            await proc.exited;
            if (proc.exitCode !== 0) {
                throw new Error('speedtest-cli not found');
            }
        } catch (e) {
            throw new Error('speedtest-cli not found');
        }


        const args = [command];
        if (config.output === 'csv') {
            args.push('--csv');
            args.push('--csv-header');
        } else if (config.output === 'json') {
            args.push('--json');
        }
        const runProc = Bun.spawn(args);
        const text = await new Response(runProc.stdout).text();
        return text;
    }
}

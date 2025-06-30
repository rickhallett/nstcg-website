// StarLinkOptimiser/src/JqWrapper.ts
export class JqWrapper {
    static async process(json: string, filter: string, command = 'jq'): Promise<any> {
        try {
            const checkProc = Bun.spawn([command, '--version']);
            await checkProc.exited;
            if (checkProc.exitCode !== 0) {
                throw new Error('jq not found');
            }
        } catch (e) {
            throw new Error('jq not found');
        }

        const proc = Bun.spawn([command, filter], {
            stdin: Buffer.from(json),
        });
        const text = await new Response(proc.stdout).text();
        return JSON.parse(text);
    }
}
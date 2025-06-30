// StarLinkOptimiser/src/JqWrapper.ts
export class JqWrapper {
    static async process(json: string, filter: string): Promise<any> {
        const proc = Bun.spawn(['jq', filter], {
            stdin: Buffer.from(json),
        });
        const text = await new Response(proc.stdout).text();
        return JSON.parse(text);
    }
}

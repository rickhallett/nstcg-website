// StarLinkOptimiser/src/DataStore.ts
export type SpeedTestResult = {
    timestamp: string;
    download: number;
    upload: number;
    ping: number;
};

export class DataStore {
    private results: SpeedTestResult[] = [];

    add(result: SpeedTestResult) {
        this.results.push(result);
    }

    getAll(): SpeedTestResult[] {
        return this.results;
    }
}

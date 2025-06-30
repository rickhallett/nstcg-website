// StarLinkOptimiser/src/DataStore.ts
import { existsSync, readFileSync, writeFileSync } from 'fs';

export type SpeedTestResult = {
    timestamp: string;
    download: number;
    upload: number;
    ping: number;
};

type Db = {
    results: SpeedTestResult[];
}

export class DataStore {
    private dbPath: string;
    private results: SpeedTestResult[] = [];

    constructor(dbPath: string) {
        this.dbPath = dbPath;
        this.load();
    }

    add(result: SpeedTestResult) {
        this.results.push(result);
        this.save();
    }

    getAll(): SpeedTestResult[] {
        return this.results;
    }

    private load() {
        if (existsSync(this.dbPath)) {
            const data = readFileSync(this.dbPath, 'utf-8');
            const db: Db = JSON.parse(data);
            this.results = db.results;
        }
    }

    private save() {
        const db: Db = { results: this.results };
        writeFileSync(this.dbPath, JSON.stringify(db, null, 2));
    }
}
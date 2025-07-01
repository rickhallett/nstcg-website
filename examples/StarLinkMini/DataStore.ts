import { readFile, writeFile, appendFile, exists } from 'fs/promises';
import { join } from 'path';

interface EnhancedSpeedTestResult {
  timestamp: string;
  download: {
    bandwidth: number;
    bytes: number;
    elapsed: number;
    mbps: number;
  };
  upload: {
    bandwidth: number;
    bytes: number;
    elapsed: number;
    mbps: number;
  };
  ping: {
    jitter: number;
    latency: number;
  };
  server: {
    id: string;
    name: string;
    location: string;
    country: string;
    host: string;
    port: number;
    ip: string;
  };
  result: {
    id: string;
    url: string;
  };
  direction?: string;
  direction_degrees?: number;
  tilt?: number;
}

export class DataStore {
  private csvFile: string;
  private jsonFile: string;

  constructor(private sessionName: string) {
    this.csvFile = `${sessionName}.csv`;
    this.jsonFile = `${sessionName}.json`;
  }

  async save(result: EnhancedSpeedTestResult): Promise<void> {
    await Promise.all([
      this.saveToCsv(result),
      this.saveToJson(result),
    ]);
  }

  private async saveToCsv(result: EnhancedSpeedTestResult): Promise<void> {
    const csvExists = await exists(this.csvFile);

    // Build CSV row
    const row = [
      result.timestamp,
      result.download.mbps.toFixed(2),
      result.upload.mbps.toFixed(2),
      result.ping.latency.toFixed(1),
      `"${result.server.name.replace(/"/g, '""')}"`,
      `"${result.server.location.replace(/"/g, '""')}"`,
      result.direction || '',
      result.tilt?.toString() || '',
    ].join(',');

    if (!csvExists) {
      // Write header first
      const header = 'timestamp,download_mbps,upload_mbps,ping_ms,server_name,server_location,direction,tilt';
      await writeFile(this.csvFile, header + '\n' + row + '\n');
    } else {
      // Append row
      await appendFile(this.csvFile, row + '\n');
    }
  }

  private async saveToJson(result: EnhancedSpeedTestResult): Promise<void> {
    let results: EnhancedSpeedTestResult[] = [];

    try {
      const jsonExists = await exists(this.jsonFile);
      if (jsonExists) {
        const content = await readFile(this.jsonFile, 'utf-8');
        results = JSON.parse(content);
        console.log(`Loaded ${results.length} existing results from ${this.jsonFile}`);
      } else {
        console.log(`Creating new JSON file: ${this.jsonFile}`);
      }
    } catch (error) {
      console.warn(`Error reading existing JSON file ${this.jsonFile}, starting fresh:`, error);
      results = [];
    }

    results.push(result);

    try {
      await writeFile(this.jsonFile, JSON.stringify(results, null, 2));
      console.log(`✓ Successfully saved result to ${this.jsonFile} (${results.length} total results)`);
    } catch (error) {
      console.error(`✗ Failed to write to ${this.jsonFile}:`, error);
      throw error;
    }
  }

  async getLatestResult(): Promise<EnhancedSpeedTestResult | null> {
    try {
      const jsonExists = await exists(this.jsonFile);
      if (!jsonExists) return null;

      const content = await readFile(this.jsonFile, 'utf-8');
      const results = JSON.parse(content);

      return results.length > 0 ? results[results.length - 1] : null;
    } catch (error) {
      return null;
    }
  }

  async getAllResults(): Promise<EnhancedSpeedTestResult[]> {
    try {
      const jsonExists = await exists(this.jsonFile);
      if (!jsonExists) return [];

      const content = await readFile(this.jsonFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return [];
    }
  }
}
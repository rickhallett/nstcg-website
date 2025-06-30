import { spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(require('child_process').exec);

export interface SpeedTestResult {
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
}

export class SpeedTestRunner {
  async checkAvailability(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('speedtest-cli --version');
      return stdout.includes('speedtest-cli');
    } catch (error) {
      return false;
    }
  }

  async run(): Promise<SpeedTestResult> {
    return new Promise((resolve, reject) => {
      const child = spawn('speedtest-cli', ['--json'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to run speedtest-cli: ${error.message}`));
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`speedtest-cli exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const rawResult = JSON.parse(stdout);
          
          // Transform speedtest-cli output to our format
          const result: SpeedTestResult = {
            timestamp: new Date().toISOString(),
            download: {
              bandwidth: rawResult.download,
              bytes: rawResult.bytes_received,
              elapsed: 0, // Not provided by speedtest-cli
              mbps: rawResult.download / 1000000, // Convert from bits/s to Mbps
            },
            upload: {
              bandwidth: rawResult.upload,
              bytes: rawResult.bytes_sent,
              elapsed: 0, // Not provided by speedtest-cli
              mbps: rawResult.upload / 1000000, // Convert from bits/s to Mbps
            },
            ping: {
              jitter: 0, // Not provided by speedtest-cli
              latency: rawResult.ping,
            },
            server: {
              id: rawResult.server.id.toString(),
              name: rawResult.server.sponsor,
              location: `${rawResult.server.name}, ${rawResult.server.cc}`,
              country: rawResult.server.country,
              host: rawResult.server.host,
              port: 8080, // Default, not provided
              ip: rawResult.server.host.split(':')[0],
            },
            result: {
              id: rawResult.server.id.toString(),
              url: rawResult.share || '',
            },
          };

          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse speedtest-cli output: ${error}`));
        }
      });
    });
  }

  async runWithCsv(): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('speedtest-cli', ['--csv', '--csv-header'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to run speedtest-cli: ${error.message}`));
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`speedtest-cli exited with code ${code}: ${stderr}`));
          return;
        }

        resolve(stdout.trim());
      });
    });
  }
}
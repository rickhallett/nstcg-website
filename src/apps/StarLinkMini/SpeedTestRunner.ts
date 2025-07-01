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

  /**
   * Test if speedtest-cli produces valid JSON output
   */
  async testJsonOutput(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('speedtest-cli --json --help');
      return true;
    } catch (error) {
      console.error('speedtest-cli does not support --json flag:', error);
      return false;
    }
  }

  /**
   * Run a quick test to verify speedtest-cli JSON format
   */
  async verifyOutput(): Promise<void> {
    console.log('Verifying speedtest-cli output format...');

    return new Promise((resolve, reject) => {
      const child = spawn('speedtest-cli', ['--json', '--simple'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 30000, // 30 second timeout for verification
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
        reject(new Error(`Failed to verify speedtest-cli: ${error.message}`));
      });

      child.on('close', (code) => {
        if (code !== 0) {
          console.warn(`speedtest-cli verification exited with code ${code}: ${stderr}`);
        }

        try {
          if (stdout.trim()) {
            const testResult = JSON.parse(stdout);
            console.log('✓ speedtest-cli JSON output verified');
            console.log('Sample fields:', Object.keys(testResult));
          }
          resolve();
        } catch (error) {
          console.warn('⚠ speedtest-cli output may not be valid JSON');
          console.warn('Raw output:', stdout);
          resolve(); // Don't fail, just warn
        }
      });
    });
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
          // Log raw output for debugging
          console.log('Raw speedtest-cli output:', stdout);

          const rawResult = JSON.parse(stdout);

          // Transform speedtest-cli output to our format
          const result: SpeedTestResult = {
            timestamp: new Date().toISOString(),
            download: {
              bandwidth: rawResult.download || 0,
              bytes: rawResult.bytes_received || 0,
              elapsed: 0, // Not provided by speedtest-cli
              mbps: (rawResult.download || 0) / 1000000, // Convert from bits/s to Mbps
            },
            upload: {
              bandwidth: rawResult.upload || 0,
              bytes: rawResult.bytes_sent || 0,
              elapsed: 0, // Not provided by speedtest-cli
              mbps: (rawResult.upload || 0) / 1000000, // Convert from bits/s to Mbps
            },
            ping: {
              jitter: 0, // Not provided by speedtest-cli
              latency: rawResult.ping || 0,
            },
            server: {
              id: rawResult.server?.id?.toString() || 'unknown',
              name: rawResult.server?.sponsor || 'unknown',
              location: `${rawResult.server?.name || 'unknown'}, ${rawResult.server?.cc || 'unknown'}`,
              country: rawResult.server?.country || 'unknown',
              host: rawResult.server?.host || 'unknown',
              port: 8080, // Default, not provided
              ip: rawResult.server?.host?.split(':')[0] || 'unknown',
            },
            result: {
              id: rawResult.server?.id?.toString() || 'unknown',
              url: rawResult.share || '',
            },
          };

          resolve(result);
        } catch (error) {
          console.error('Raw stdout that failed to parse:', stdout);
          console.error('Raw stderr:', stderr);
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
import { SpeedTestRunner } from './SpeedTestRunner';
import { DataStore } from './DataStore';
import { DirectionValidator } from './DirectionValidator';

interface SchedulerOptions {
  name: string;
  direction?: string;
  tilt?: number;
}

export class Scheduler {
  private intervalId?: NodeJS.Timeout;
  private isRunning = false;

  async setup(options: SchedulerOptions): Promise<void> {
    console.log(`Starting scheduled speed tests for session: ${options.name}`);
    console.log('Running every 10 minutes (Ctrl+C to stop)');

    if (options.direction) {
      console.log(`Direction: ${options.direction} (${DirectionValidator.toDegrees(options.direction)}°)`);
    }

    if (options.tilt !== undefined) {
      console.log(`Tilt: ${options.tilt}°`);
    }

    console.log(''); // Empty line for readability

    // Run immediately first
    await this.runSpeedTest(options);

    // Then schedule to run every 10 minutes
    const intervalMs = 10 * 60 * 1000; // 10 minutes in milliseconds
    this.intervalId = setInterval(() => {
      this.runSpeedTest(options).catch(error => {
        console.error('Error in scheduled speed test:', error);
      });
    }, intervalMs);

    this.isRunning = true;

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nStopping scheduled speed tests...');
      this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\nReceived termination signal, stopping...');
      this.stop();
      process.exit(0);
    });

    // Keep the process alive
    console.log('Scheduler started. Press Ctrl+C to stop.');
  }

  private async runSpeedTest(options: SchedulerOptions): Promise<void> {
    const runner = new SpeedTestRunner();
    const dataStore = new DataStore(options.name);

    try {
      console.log(`[${new Date().toISOString()}] Running speed test for session: ${options.name}`);

      const result = await runner.run();
      const enhancedResult = {
        ...result,
        ...(options.direction && {
          direction: options.direction,
          direction_degrees: DirectionValidator.toDegrees(options.direction),
        }),
        ...(options.tilt !== undefined && { tilt: options.tilt }),
      };

      await dataStore.save(enhancedResult);

      console.log(`[${new Date().toISOString()}] Speed test completed successfully`);
      console.log(`Download: ${result.download.mbps.toFixed(2)} Mbps`);
      console.log(`Upload: ${result.upload.mbps.toFixed(2)} Mbps`);
      console.log(`Ping: ${result.ping.latency.toFixed(1)} ms`);
      console.log(`Next test in 10 minutes...\n`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error running speed test:`, error);
      console.log('Will retry in 10 minutes...\n');
    }
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
    console.log('Scheduler stopped.');
  }

  isActive(): boolean {
    return this.isRunning;
  }

  // Legacy method for backward compatibility (now does nothing)
  async remove(sessionName: string): Promise<void> {
    console.log(`Note: Pure TypeScript scheduler doesn't use cron jobs.`);
    console.log(`To stop the scheduler, press Ctrl+C in the running terminal.`);
  }
}
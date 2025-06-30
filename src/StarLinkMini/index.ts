#!/usr/bin/env bun

import { parseArgs } from 'util';
import { SpeedTestRunner } from './SpeedTestRunner';
import { DirectionValidator } from './DirectionValidator';
import { DataStore } from './DataStore';
import { Scheduler } from './Scheduler';

interface CliOptions {
  name: string;
  direction?: string;
  tilt?: number;
  singleRun?: boolean;
  schedule?: boolean;
  help?: boolean;
}

function printHelp(): void {
  console.log(`
StarLinkMini - Starlink Performance Tracker

Usage: bun run src/StarLinkMini/index.ts --name <session-name> [options]

Required:
  --name <name>         Session name for output files

Optional:
  --direction <dir>     Dish direction (compass point or degrees)
                        Examples: N, NW, NNE, 45, 315.5
  --tilt <degrees>      Dish tilt angle in degrees (0-90)
  --single-run          Run once and exit (default: continuous)
  --schedule            Set up system scheduler for automated runs
  --help                Show this help message

Examples:
  # Basic monitoring
  bun run src/StarLinkMini/index.ts --name home

  # With direction and tilt
  bun run src/StarLinkMini/index.ts --name test --direction NW --tilt 45

  # Single test run
  bun run src/StarLinkMini/index.ts --name quick-test --single-run

  # Set up automated monitoring
  bun run src/StarLinkMini/index.ts --name continuous --direction 320 --tilt 40 --schedule
`);
}

async function parseCliArgs(): Promise<CliOptions> {
  const { values } = parseArgs({
    args: Bun.argv,
    options: {
      name: {
        type: 'string',
      },
      direction: {
        type: 'string',
      },
      tilt: {
        type: 'string',
      },
      'single-run': {
        type: 'boolean',
        default: false,
      },
      schedule: {
        type: 'boolean',
        default: false,
      },
      help: {
        type: 'boolean',
        default: false,
      },
    },
    strict: true,
    allowPositionals: true,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  if (!values.name) {
    console.error('Error: --name parameter is required');
    printHelp();
    process.exit(1);
  }

  const options: CliOptions = {
    name: values.name,
    singleRun: values['single-run'],
    schedule: values.schedule,
  };

  // Validate direction if provided
  if (values.direction) {
    const validation = DirectionValidator.validate(values.direction);
    if (!validation.valid) {
      console.error(`Error: ${validation.error}`);
      process.exit(1);
    }
    options.direction = values.direction;
  }

  // Validate tilt if provided
  if (values.tilt !== undefined) {
    const tilt = parseInt(values.tilt, 10);
    if (isNaN(tilt) || tilt < 0 || tilt > 90) {
      console.error('Error: --tilt must be an integer between 0 and 90');
      process.exit(1);
    }
    options.tilt = tilt;
  }

  return options;
}

async function runSpeedTest(options: CliOptions): Promise<void> {
  const runner = new SpeedTestRunner();
  const dataStore = new DataStore(options.name);

  try {
    console.log(`Running speed test for session: ${options.name}`);
    
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
    
    console.log('Speed test completed successfully');
    console.log(`Download: ${result.download.mbps} Mbps`);
    console.log(`Upload: ${result.upload.mbps} Mbps`);
    console.log(`Ping: ${result.ping.latency} ms`);
  } catch (error) {
    console.error('Error running speed test:', error);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const options = await parseCliArgs();

  // Check if speedtest-cli is available
  try {
    const runner = new SpeedTestRunner();
    await runner.checkAvailability();
  } catch (error) {
    console.error('Error: speedtest-cli is not installed or not in PATH');
    console.error('Please install it with: pip install speedtest-cli');
    process.exit(1);
  }

  if (options.schedule) {
    // Set up cron job
    const scheduler = new Scheduler();
    await scheduler.setup(options);
    console.log('Scheduled speed tests every 10 minutes');
    console.log('Use system cron tools to manage the schedule');
    return;
  }

  if (options.singleRun) {
    // Run once and exit
    await runSpeedTest(options);
  } else {
    // Run continuously every 10 minutes
    console.log('Starting continuous monitoring (Ctrl+C to stop)');
    await runSpeedTest(options); // Run immediately
    
    const interval = 10 * 60 * 1000; // 10 minutes in milliseconds
    setInterval(() => runSpeedTest(options), interval);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nStopping monitoring...');
      process.exit(0);
    });
  }
}

// Run the main function
if (import.meta.main) {
  main().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}
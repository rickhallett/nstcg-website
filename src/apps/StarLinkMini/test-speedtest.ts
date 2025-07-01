#!/usr/bin/env bun

import { SpeedTestRunner } from './SpeedTestRunner';
import { DataStore } from './DataStore';

async function testSpeedTestCapture() {
  console.log('Testing speedtest-cli output capture...\n');

  const runner = new SpeedTestRunner();

  // Check availability
  console.log('1. Checking speedtest-cli availability...');
  const isAvailable = await runner.checkAvailability();
  if (!isAvailable) {
    console.error('❌ speedtest-cli is not available');
    process.exit(1);
  }
  console.log('✅ speedtest-cli is available\n');

  // Verify output format
  console.log('2. Verifying JSON output format...');
  try {
    await runner.verifyOutput();
  } catch (error) {
    console.error('❌ Error verifying output:', error);
  }
  console.log('');

  // Run a test
  console.log('3. Running speed test...');
  try {
    const result = await runner.run();
    console.log('✅ Speed test completed successfully');
    console.log('Result structure:');
    console.log('- Timestamp:', result.timestamp);
    console.log('- Download:', result.download.mbps, 'Mbps');
    console.log('- Upload:', result.upload.mbps, 'Mbps');
    console.log('- Ping:', result.ping.latency, 'ms');
    console.log('- Server:', result.server.name, 'in', result.server.location);
    console.log('- Result URL:', result.result.url || 'Not available');
    console.log('');

    // Test data store
    console.log('4. Testing data storage...');
    const dataStore = new DataStore('test-capture');

    const enhancedResult = {
      ...result,
      direction: '45',
      direction_degrees: 45,
      tilt: 30,
    };

    await dataStore.save(enhancedResult);
    console.log('✅ Data saved successfully to JSON and CSV files');

  } catch (error) {
    console.error('❌ Error during speed test:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  testSpeedTestCapture().catch(console.error);
} 
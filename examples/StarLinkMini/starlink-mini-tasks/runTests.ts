#!/usr/bin/env bun

import { run } from 'bun:test';
import { join } from 'path';

console.log('🚀 Running StarLinkMini Test Suite\n');

// Run all tests in the starlink-mini directory
const testDir = __dirname;

async function runTests() {
  try {
    await run({
      cwd: testDir,
      // Run all test files in this directory
      pattern: '*.test.ts'
    });
  } catch (error) {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

runTests();
#!/usr/bin/env node

/**
 * Build script for Principia.js modules
 * 
 * Builds all modules in the correct order
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PRINCIPIA_DIR = path.join(__dirname, '..', 'src', 'principia');

// Modules in dependency order
const modules = [
  'ApplicationError',
  'IService', 
  'EventBus',
  'StateManager',
  'LoggerService',
  'ErrorHandlerService',
  'dom-diff',
  'Component',
  'ApiService',
  'NotionService',
  'UserModel',
  'ParticipantModel',
  'Router',
  'HomePage',
  'app'
];

console.log('🔨 Building Principia.js modules...\n');

// Build each module
for (const module of modules) {
  const modulePath = path.join(PRINCIPIA_DIR, module);
  
  if (!fs.existsSync(modulePath)) {
    console.log(`⚠️  Module ${module} not found, skipping...`);
    continue;
  }
  
  console.log(`📦 Building ${module}...`);
  
  try {
    // Run TypeScript compiler
    execSync('npx tsc', {
      cwd: modulePath,
      stdio: 'inherit'
    });
    
    console.log(`✅ ${module} built successfully\n`);
  } catch (error) {
    console.error(`❌ Failed to build ${module}\n`);
    process.exit(1);
  }
}

// Build main index
console.log('📦 Building main Principia index...');
try {
  execSync('npx tsc', {
    cwd: PRINCIPIA_DIR,
    stdio: 'inherit'
  });
  console.log('✅ Main index built successfully\n');
} catch (error) {
  console.error('❌ Failed to build main index\n');
  process.exit(1);
}

console.log('🎉 All Principia.js modules built successfully!');
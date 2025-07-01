#!/usr/bin/env bun

/**
 * Enhanced build script for Principia modules
 * Creates TypeScript builds and browser-ready bundles
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define build order based on dependencies
const buildOrder = [
  'ApplicationError',
  'IService', 
  'EventBus',
  'LoggerService',
  'ErrorHandlerService',
  'StateManager',
  'ServiceRegistry'
];

// Map module names to their global namespace names and exports
const moduleConfig = {
  'ApplicationError': {
    global: 'PrincipiaApplicationError',
    exports: ['ApplicationError', 'APIError', 'ValidationError']
  },
  'IService': {
    global: 'PrincipiaIService',
    exports: [] // Interface only
  },
  'EventBus': {
    global: 'PrincipiaEventBus',
    exports: ['EventBus']
  },
  'LoggerService': {
    global: 'PrincipiaLoggerService',
    exports: ['LoggerService']
  },
  'ErrorHandlerService': {
    global: 'PrincipiaErrorHandlerService',
    exports: ['ErrorHandlerService']
  },
  'StateManager': {
    global: 'PrincipiaStateManager',
    exports: ['StateManager']
  },
  'ServiceRegistry': {
    global: 'PrincipiaServiceRegistry',
    exports: ['ServiceRegistry']
  }
};

// Compile TypeScript for a module
async function compileTypeScript(modulePath) {
  try {
    execSync('bun x tsc', { 
      cwd: modulePath,
      stdio: 'inherit'
    });
    return true;
  } catch (error) {
    console.error(`TypeScript compilation failed:`, error.message);
    return false;
  }
}

// Create browser bundle for a module
async function createBrowserBundle(moduleName, modulePath) {
  const distPath = join(modulePath, 'dist');
  const indexPath = join(modulePath, 'index.ts');
  const config = moduleConfig[moduleName];
  
  if (!existsSync(distPath)) {
    mkdirSync(distPath, { recursive: true });
  }

  try {
    // Build ES module
    const esmResult = await Bun.build({
      entrypoints: [indexPath],
      outdir: distPath,
      naming: '[name].esm.js',
      format: 'esm',
      target: 'browser',
      minify: false,
      external: ['../EventBus', '../IService', '../LoggerService'] // External deps
    });

    if (!esmResult.success) {
      console.error('ESM build failed:', esmResult.logs);
      return false;
    }

    // Rename the output file
    const esmOutputPath = join(distPath, 'index.esm.js');
    const esmTargetPath = join(distPath, `${moduleName.toLowerCase()}.esm.js`);
    if (existsSync(esmOutputPath)) {
      execSync(`mv ${esmOutputPath} ${esmTargetPath}`);
    }

    // Build minified ES module
    const esmMinResult = await Bun.build({
      entrypoints: [indexPath],
      outdir: distPath,
      naming: '[name].esm.min.js',
      format: 'esm',
      target: 'browser',
      minify: true,
      external: ['../EventBus', '../IService', '../LoggerService']
    });

    if (esmMinResult.success) {
      const esmMinOutputPath = join(distPath, 'index.esm.min.js');
      const esmMinTargetPath = join(distPath, `${moduleName.toLowerCase()}.esm.min.js`);
      if (existsSync(esmMinOutputPath)) {
        execSync(`mv ${esmMinOutputPath} ${esmMinTargetPath}`);
      }
    }

    // Create UMD bundle manually
    const esmCode = readFileSync(esmTargetPath, 'utf-8');
    
    // Transform ES module to UMD
    let umdContent = esmCode;
    
    // Remove ES module imports
    umdContent = umdContent.replace(/^import\s+.+from\s+['"].+['"];?\s*$/gm, '');
    umdContent = umdContent.replace(/^export\s+\{[^}]+\}\s+from\s+['"].+['"];?\s*$/gm, '');
    
    // Replace export statements
    umdContent = umdContent.replace(/^export\s+(?:default\s+)?/gm, '');
    umdContent = umdContent.replace(/^export\s+\{([^}]+)\};?\s*$/gm, (match, exports) => {
      const exportList = exports.split(',').map(e => e.trim());
      return exportList.map(exp => {
        const [local, exported = local] = exp.split(' as ').map(e => e.trim());
        return `exports.${exported} = ${local};`;
      }).join('\n');
    });

    // Create UMD wrapper
    const umdWrapper = `(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS
    module.exports = factory();
  } else {
    // Browser globals
    root.${config.global} = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  
  var exports = {};
  
${umdContent.split('\n').map(line => '  ' + line).join('\n')}
  
  return exports;
}));`;

    const umdPath = join(distPath, `${moduleName.toLowerCase()}.umd.js`);
    writeFileSync(umdPath, umdWrapper);

    // Create minified UMD
    const umdMinPath = join(distPath, `${moduleName.toLowerCase()}.umd.min.js`);
    try {
      const minResult = await Bun.build({
        entrypoints: [umdPath],
        outdir: distPath,
        naming: 'temp.min.js',
        minify: true
      });
      
      if (minResult.success) {
        execSync(`mv ${join(distPath, 'temp.min.js')} ${umdMinPath}`);
      } else {
        execSync(`cp ${umdPath} ${umdMinPath}`);
      }
    } catch {
      execSync(`cp ${umdPath} ${umdMinPath}`);
    }

    return true;
  } catch (error) {
    console.error(`Browser bundle failed for ${moduleName}:`, error.message);
    return false;
  }
}

// Build a single module
async function buildModule(moduleName) {
  const modulePath = join(__dirname, moduleName);
  
  if (!existsSync(modulePath)) {
    console.error(`Module ${moduleName} not found at ${modulePath}`);
    return false;
  }

  console.log(`\n📦 Building ${moduleName}...`);
  
  try {
    // Clean dist directory
    if (existsSync(join(modulePath, 'dist'))) {
      rmSync(join(modulePath, 'dist'), { recursive: true, force: true });
    }
    
    // Compile TypeScript
    console.log(`  📝 Compiling TypeScript...`);
    if (!await compileTypeScript(modulePath)) {
      return false;
    }
    
    // Create browser bundles
    console.log(`  📦 Creating browser bundles...`);
    if (!await createBrowserBundle(moduleName, modulePath)) {
      return false;
    }
    
    console.log(`✅ ${moduleName} built successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to build ${moduleName}:`, error.message);
    return false;
  }
}

// Create framework bundle
async function createFrameworkBundle() {
  console.log('\n🎯 Creating Principia.js framework bundle...');
  
  const distPath = join(__dirname, 'dist');
  if (!existsSync(distPath)) {
    mkdirSync(distPath, { recursive: true });
  }

  try {
    // Create a combined UMD bundle
    let frameworkCode = `(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS
    module.exports = factory();
  } else {
    // Browser globals
    root.Principia = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  
  var Principia = {};
  
`;

    // Add each module's code
    for (const moduleName of buildOrder) {
      const config = moduleConfig[moduleName];
      if (config.exports.length === 0) continue; // Skip interface-only modules
      
      const umdPath = join(__dirname, moduleName, 'dist', `${moduleName.toLowerCase()}.umd.js`);
      if (!existsSync(umdPath)) {
        console.warn(`  ⚠️  Skipping ${moduleName} - UMD bundle not found`);
        continue;
      }
      
      let moduleCode = readFileSync(umdPath, 'utf-8');
      
      // Extract just the factory function content
      const factoryMatch = moduleCode.match(/function\s*\(\)\s*{\s*'use strict';[\s\S]+return\s+exports;\s*}/);
      if (factoryMatch) {
        let factoryContent = factoryMatch[0];
        // Remove the function wrapper and return statement
        factoryContent = factoryContent
          .replace(/^function\s*\(\)\s*{\s*'use strict';\s*/, '')
          .replace(/\s*return\s+exports;\s*}$/, '');
        
        // Replace exports with module namespace
        factoryContent = factoryContent.replace(/exports\./g, `Principia.${moduleName}.`);
        
        frameworkCode += `  // ${moduleName} module\n`;
        frameworkCode += `  Principia.${moduleName} = {};\n`;
        frameworkCode += factoryContent + '\n\n';
        
        // Add to root exports
        config.exports.forEach(exp => {
          frameworkCode += `  Principia.${exp} = Principia.${moduleName}.${exp};\n`;
        });
        frameworkCode += '\n';
      }
    }

    frameworkCode += `  return Principia;
}));`;

    // Write the UMD bundle
    const umdPath = join(distPath, 'principia.umd.js');
    writeFileSync(umdPath, frameworkCode);

    // Create other formats
    execSync(`cp ${umdPath} ${join(distPath, 'principia.js')}`);
    
    // Try to minify
    try {
      const minResult = await Bun.build({
        entrypoints: [umdPath],
        outdir: distPath,
        naming: 'principia.min.js',
        minify: true
      });
      
      if (!minResult.success) {
        execSync(`cp ${umdPath} ${join(distPath, 'principia.min.js')}`);
      }
    } catch {
      execSync(`cp ${umdPath} ${join(distPath, 'principia.min.js')}`);
    }

    console.log('✅ Framework bundle created successfully!');
    return true;
  } catch (error) {
    console.error('❌ Failed to create framework bundle:', error.message);
    return false;
  }
}

// Build all modules
async function buildAll() {
  console.log('🏗️  Building all Principia modules...\n');
  
  let failed = [];
  
  for (const module of buildOrder) {
    if (!await buildModule(module)) {
      failed.push(module);
    }
  }
  
  if (failed.length > 0) {
    console.error('\n❌ Failed to build:', failed.join(', '));
    process.exit(1);
  }
  
  // Create the framework bundle
  await createFrameworkBundle();
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ All modules and framework bundle built successfully!');
  console.log('\n📁 Build outputs:');
  console.log('  - Individual modules: src/principia/[module]/dist/');
  console.log('  - Framework bundle: src/principia/dist/principia.js');
}

// Clean all dist directories
function cleanAll() {
  console.log('🧹 Cleaning all dist directories...\n');
  
  // Clean module dist directories
  for (const module of buildOrder) {
    const distPath = join(__dirname, module, 'dist');
    if (existsSync(distPath)) {
      console.log(`Removing ${module}/dist`);
      rmSync(distPath, { recursive: true, force: true });
    }
  }
  
  // Clean framework dist directory
  const frameworkDistPath = join(__dirname, 'dist');
  if (existsSync(frameworkDistPath)) {
    console.log(`Removing framework dist`);
    rmSync(frameworkDistPath, { recursive: true, force: true });
  }
  
  console.log('\n✅ Clean complete');
}

// Main execution
(async () => {
  const command = process.argv[2];

  switch (command) {
    case 'clean':
      cleanAll();
      break;
    case 'build':
    case undefined:
      await buildAll();
      break;
    default:
      console.log('Usage: bun build-enhanced.js [build|clean]');
      console.log('Commands:');
      console.log('  build - Build all modules and create framework bundle');
      console.log('  clean - Remove all dist directories');
      process.exit(1);
  }
})();
# Principia.js Build System

This document describes the build system for Principia.js modules.

## Overview

The Principia.js build system compiles TypeScript modules and creates browser-ready bundles in multiple formats:
- **ES Modules** (`.esm.js`) - For modern JavaScript environments
- **UMD Bundles** (`.umd.js`) - For browser `<script>` tags and CommonJS
- **Minified versions** (`.min.js`) - For production use
- **TypeScript declarations** (`.d.ts`) - For TypeScript consumers

## Build Commands

Run these commands from the project root:

```bash
# Build all modules and create framework bundle
bun run build:principia

# Clean all build outputs
bun run clean:principia
```

Or run directly from the `src/principia` directory:

```bash
# Build all modules
bun build.js

# Clean all dist directories
bun build.js clean
```

## Build Output Structure

After building, each module will have a `dist/` directory with:

```
ModuleName/dist/
├── index.js                    # CommonJS entry point
├── index.d.ts                 # TypeScript declarations
├── ModuleName.js              # Compiled module code
├── ModuleName.d.ts            # Module TypeScript declarations
├── modulename.esm.js          # ES module bundle
├── modulename.esm.min.js      # Minified ES module
├── modulename.umd.js          # UMD bundle for browsers
└── modulename.umd.min.js      # Minified UMD bundle
```

The framework bundle is created in `src/principia/dist/`:

```
src/principia/dist/
├── principia.js               # Full framework UMD bundle
├── principia.min.js           # Minified framework bundle
├── principia.umd.js           # Same as principia.js
└── principia.umd.min.js       # Same as principia.min.js
```

## Using the Bundles

### In the Browser (UMD)

Individual modules:
```html
<script src="path/to/eventbus.umd.js"></script>
<script>
  const eventBus = PrincipiaEventBus.EventBus.getInstance();
</script>
```

Complete framework:
```html
<script src="path/to/principia.js"></script>
<script>
  const { EventBus, StateManager } = Principia;
  const eventBus = EventBus.getInstance();
</script>
```

### ES Modules (Modern Browsers)

```html
<script type="module">
  import { EventBus } from './path/to/eventbus.esm.js';
  const eventBus = EventBus.getInstance();
</script>
```

### Node.js / Bun

```javascript
// Import from compiled output
import { EventBus } from './EventBus/dist/index.js';

// Or during development, import TypeScript directly with Bun
import { EventBus } from './EventBus/index.ts';
```

### CDN Usage (Future)

Once published to npm:
```html
<!-- Specific version -->
<script src="https://unpkg.com/@principia/framework@1.0.0/dist/principia.min.js"></script>

<!-- Latest version -->
<script src="https://unpkg.com/@principia/framework/dist/principia.min.js"></script>
```

## Global Namespace

When loaded via UMD in the browser, modules are available under these global names:

- `PrincipiaApplicationError` - Error classes
- `PrincipiaEventBus` - Event bus
- `PrincipiaStateManager` - State management
- `PrincipiaLoggerService` - Logging service
- `PrincipiaErrorHandlerService` - Error handling
- `PrincipiaServiceRegistry` - Service lifecycle management
- `Principia` - Complete framework (when using principia.js)

## Build System Architecture

The build system (`build.js`) performs these steps for each module:

1. **Clean** - Remove existing dist directory
2. **Compile TypeScript** - Run `bun x tsc` to compile TypeScript to JavaScript
3. **Create ES Module Bundle** - Bundle for modern JavaScript environments
4. **Create UMD Bundle** - Transform ES module to UMD format for browsers
5. **Minify** - Create production-ready minified versions

For the framework bundle, it:
1. Combines all individual UMD modules
2. Creates a unified namespace (`Principia`)
3. Exports all public APIs at the root level

## Development Workflow

1. Make changes to TypeScript source files
2. Run `bun run build:principia` to compile
3. Test in browser using `examples/browser-usage.html`
4. Test in Node.js using `examples/node-usage.js`

## Troubleshooting

### TypeScript Compilation Errors
- Ensure all dependencies are properly imported
- Check that tsconfig.json extends the base configuration
- Verify TypeScript is installed: `bun x tsc --version`

### Bundle Creation Errors
- Check that all modules follow the expected structure
- Ensure index.ts properly exports all public APIs
- Verify module dependencies are in the correct build order

### Module Not Found Errors
- Run a clean build: `bun run clean:principia && bun run build:principia`
- Check import paths match the actual file structure
- Ensure you're importing from `/dist/` for compiled code

## Adding New Modules

1. Create module directory: `src/principia/NewModule/`
2. Add required files:
   - `index.ts` - Public API exports
   - `NewModule.ts` - Implementation
   - `types.ts` - TypeScript types/interfaces
   - `package.json` - Module metadata
   - `tsconfig.json` - Extends `../tsconfig.base.json`
   - `NewModule.test.ts` - Tests using Bun test runner
3. Add module to `buildOrder` array in `build.js`
4. Add module configuration to `moduleConfig` in `build.js`
5. Run build to verify: `bun run build:principia`

## Module Dependencies

Modules are built in dependency order:
1. ApplicationError (no dependencies)
2. IService (interface only)
3. EventBus (no dependencies)
4. LoggerService (no dependencies)
5. ErrorHandlerService (depends on LoggerService, EventBus)
6. StateManager (depends on EventBus)
7. ServiceRegistry (depends on IService, LoggerService)

When adding dependencies, ensure they come earlier in the build order.
# Principia.js

A principled vanilla JavaScript framework for building modern web applications.

## Overview

Principia.js is a lightweight, test-driven framework that demonstrates fundamental web development patterns without the complexity of modern frameworks. It implements:

- **Event-driven architecture** with a central EventBus
- **Unidirectional data flow** with a single StateManager
- **Component lifecycle** with efficient DOM diffing
- **Service layer** for external integrations
- **Model layer** for business logic
- **SPA routing** with the History API

## Core Principles

### The Six Immutable Laws

1. **The State is Singular** - All application state lives only in the StateManager
2. **Events are the Messengers** - All module communication happens only through the EventBus
3. **The Flow is Unidirectional** - Action → Event → Logic → State Change → Re-render
4. **The Services are Sentinels** - All external dependencies are isolated in Service modules
5. **Components are Dumb Artisans** - Components only render state and emit events
6. **Views are the Conductors** - Page-specific orchestration is the only job of a View Controller

## Installation

```bash
npm install @principia/core
```

## Quick Start

```javascript
import { initializeApp } from '@principia/core';

// Configure and initialize the application
const app = await initializeApp({
  apiUrl: 'https://api.example.com',
  notionToken: 'your-notion-token',
  notionDatabaseId: 'your-database-id',
  routes: {
    '/': { view: 'HomePage' },
    '/about': { view: 'AboutPage' }
  },
  initialState: {
    user: null,
    participants: [],
    stats: { total: 0 }
  }
});

// Clean up when done
await app.destroy();
```

## Module Overview

### Core Services

- **EventBus** - Central pub/sub system for decoupled communication
- **StateManager** - Single source of truth for application state
- **LoggerService** - Structured logging with levels
- **ErrorHandlerService** - Global error handling and reporting

### Component Framework

- **Component** - Base class for UI components with lifecycle
- **dom-diff** - Efficient virtual DOM diffing algorithm

### Services

- **ApiService** - Generic HTTP client with interceptors
- **NotionService** - Notion API integration

### Models

- **UserModel** - User registration and authentication logic
- **ParticipantModel** - Participant management

### Routing

- **Router** - SPA router with guards and dynamic routes

### View Controllers

- **HomePage** - Example view controller

## Building from Source

```bash
# Install dependencies
npm install

# Build all modules
npm run build

# Run tests
npm test

# Clean build artifacts
npm run clean
```

## Development

Each module follows Test-Driven Development (TDD) principles:

1. Write failing tests first
2. Implement minimum code to pass
3. Refactor while keeping tests green

## License

MIT
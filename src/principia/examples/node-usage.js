#!/usr/bin/env node

/**
 * Example of using Principia.js modules in Node.js
 * This demonstrates both individual module usage and the complete framework
 */

// Import individual modules from their compiled output
import { EventBus } from '../EventBus/dist/index.js';
import { StateManager } from '../StateManager/dist/index.js';
import { ApplicationError, APIError, ValidationError } from '../ApplicationError/dist/index.js';
import { ServiceRegistry } from '../ServiceRegistry/dist/index.js';
import { LoggerService } from '../LoggerService/dist/index.js';
import { ErrorHandlerService } from '../ErrorHandlerService/dist/index.js';

console.log('🚀 Principia.js Node.js Usage Examples\n');

// Example 1: EventBus Usage
console.log('=== EventBus Example ===');
const eventBus = EventBus.getInstance();

// Subscribe to events
const unsubscribe = eventBus.on('user:login', (data) => {
  console.log('User logged in:', data);
});

eventBus.on('user:logout', (data) => {
  console.log('User logged out:', data);
});

// Emit events
eventBus.emit('user:login', { userId: 123, username: 'john_doe' });
eventBus.emit('user:logout', { userId: 123 });

// Unsubscribe from an event
unsubscribe();
console.log('Unsubscribed from user:login');
eventBus.emit('user:login', { userId: 456, username: 'jane_doe' }); // Won't be logged

console.log('\n=== StateManager Example ===');
// Create StateManager with EventBus
const stateManager = new StateManager(eventBus);

// Initialize state
stateManager.initialize({
  app: {
    name: 'My Node App',
    version: '1.0.0'
  },
  users: [],
  settings: {
    theme: 'dark',
    notifications: true
  }
});

// Subscribe to state changes
stateManager.subscribe('settings.theme', (newTheme) => {
  console.log('Theme changed to:', newTheme);
});

// Get current state
console.log('Initial state:', stateManager.get());

// Update state
stateManager.set('settings.theme', 'light');
stateManager.update({
  users: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]
});

console.log('Updated state:', stateManager.get());

console.log('\n=== Error Handling Example ===');
// Create custom errors
try {
  throw new ApplicationError(
    'Database connection failed',
    'Unable to connect to the server. Please try again.',
    { database: 'production', attempt: 3 }
  );
} catch (error) {
  console.log('ApplicationError caught:');
  console.log('  Message:', error.message);
  console.log('  User Message:', error.userMessage);
  console.log('  Context:', error.context);
}

// API Error example
const apiError = new APIError(
  'Failed to fetch user data',
  'Could not load user profile',
  { statusCode: 404, endpoint: '/api/users/123' }
);
console.log('\nAPIError:', {
  name: apiError.name,
  statusCode: apiError.statusCode,
  context: apiError.context
});

// Validation Error example
const validationError = new ValidationError(
  'Form validation failed',
  'Please correct the errors below',
  [
    { field: 'email', message: 'Invalid email format' },
    { field: 'password', message: 'Password too short' }
  ]
);
console.log('\nValidationError:', {
  name: validationError.name,
  errors: validationError.validationErrors
});

console.log('\n=== Logger Service Example ===');
// LoggerService is a singleton
const logger = LoggerService.getInstance();

// Set log level
logger.setLevel('DEBUG');

// Log messages at different levels
logger.debug('Debug information', { module: 'main' });
logger.info('Application started successfully');
logger.warn('This is a warning', { code: 'W001' });
logger.error('This is an error', new Error('Sample error'));

// Change log level
console.log('\nChanging log level to ERROR...');
logger.setLevel('ERROR');
logger.debug('This debug message will not be shown');
logger.info('This info message will not be shown');
logger.warn('This warning will not be shown');
logger.error('Only error messages are shown now');

console.log('\n=== Service Registry Example ===');
// Note: ServiceRegistry is designed for services that implement IService interface
// Since LoggerService and ErrorHandlerService are utilities without lifecycle methods,
// we'll demonstrate the pattern conceptually

// In a real application, you would have services like:
// - DatabaseService (implements IService with start/stop for connections)
// - CacheService (implements IService with start/stop for cache initialization)
// - WebSocketService (implements IService with start/stop for socket connections)

console.log('ServiceRegistry is designed for managing service lifecycles.');
console.log('It ensures services start/stop in the correct dependency order.');

console.log('\n✅ All examples completed successfully!');
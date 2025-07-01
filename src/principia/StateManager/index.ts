/**
 * StateManager Module
 * 
 * Provides the single source of truth for application state in the Principia.js architecture.
 * Implements deep cloning to prevent accidental mutations and supports path-based subscriptions.
 */

export { StateManager } from './StateManager';
export type { StateUpdateBatch, StateChangedEvent } from './types';
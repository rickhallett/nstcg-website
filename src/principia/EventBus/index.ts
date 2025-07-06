/**
 * EventBus module exports
 * 
 * This module provides the singleton EventBus for decoupled communication
 * between all modules in the Principia.js architecture.
 */

export { EventBus } from './EventBus';
export { ManagedEventBus } from './ManagedEventBus';
export type { EventHandler, EventName, EventBusInterface } from './EventBus';
export type { EventOwner } from './ManagedEventBus';
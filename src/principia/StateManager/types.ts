/**
 * Type definitions for StateManager module
 */

export interface StateUpdateBatch {
  [path: string]: any;
}

export interface StateChangedEvent {
  path: string;
  value: any;
}
/**
 * Type definitions for LoggerService module
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogMetadata {
  [key: string]: any;
  timestamp?: string;
  context?: string;
  user?: string;
  sessionId?: string;
}
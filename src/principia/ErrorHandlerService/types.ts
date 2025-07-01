/**
 * Type definitions for ErrorHandlerService module
 */

export interface ErrorContext {
  source?: string;
  lineno?: number;
  colno?: number;
  userId?: string;
  sessionId?: string;
  timestamp?: string;
  [key: string]: any;
}
/**
 * ErrorHandlerService Module
 * 
 * Provides centralized error handling for the Principia.js architecture.
 * Captures both synchronous errors and unhandled promise rejections,
 * logs them, and communicates user-friendly messages via the EventBus.
 */

export { ErrorHandlerService } from './ErrorHandlerService';
export type { ErrorContext } from './types';
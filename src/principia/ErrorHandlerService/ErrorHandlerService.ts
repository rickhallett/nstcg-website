import type { EventBus } from '../EventBus';
import type { LoggerService } from '../LoggerService';
import type { ApplicationError } from '../ApplicationError';

/**
 * ErrorHandlerService - Centralized error handling for the application
 * Follows Principia.js architectural canon: Events are the Messengers
 */
export class ErrorHandlerService {
  private static instance: ErrorHandlerService | null = null;
  private eventBus: EventBus;
  private logger: LoggerService;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor(eventBus: EventBus, logger: LoggerService) {
    if (ErrorHandlerService.instance) {
      throw new Error('Use getInstance() instead');
    }
    this.eventBus = eventBus;
    this.logger = logger;
  }

  /**
   * Get the singleton instance of ErrorHandlerService
   * @param eventBus EventBus instance (required on first call)
   * @param logger LoggerService instance (required on first call)
   * @returns The singleton instance
   */
  public static getInstance(eventBus?: EventBus, logger?: LoggerService): ErrorHandlerService {
    if (!ErrorHandlerService.instance) {
      if (!eventBus || !logger) {
        throw new Error('EventBus and LoggerService instances must be provided on first call to getInstance');
      }
      ErrorHandlerService.instance = new ErrorHandlerService(eventBus, logger);
    }
    return ErrorHandlerService.instance;
  }

  /**
   * Reset the singleton instance (for testing purposes only)
   * @private
   */
  public static _resetInstance(): void {
    ErrorHandlerService.instance = null;
  }

  /**
   * Initialize global error handlers
   */
  public init(): void {
    // Handle synchronous JavaScript errors
    window.addEventListener('error', (event: ErrorEvent) => {
      this.handleError(event.error || new Error(event.message), {
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Handle asynchronous Promise rejections
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      this.handleError(event.reason, { source: 'Promise rejection' });
    });
  }

  /**
   * Handle an error, logging it and optionally showing it to the user
   * @param error The error to handle
   * @param context Additional context about the error
   */
  public handleError(error: any, context: any = {}): void {
    const errorToLog = error instanceof Error ? error : new Error(String(error));

    // Log the error with full details
    this.logger.error(errorToLog.message, {
      ...context,
      stack: errorToLog.stack,
      name: errorToLog.name,
    });

    // Check if this is a "silent" error that shouldn't be shown to users
    if ((error as any).silent) {
      return;
    }

    // Determine the user-facing message
    const userMessage = (error as ApplicationError).userMessage || 
                       'An unexpected error occurred. Please try again later.';

    // Emit an event to show the error in the UI
    this.eventBus.emit('ui:show:error', { message: userMessage });
  }
}
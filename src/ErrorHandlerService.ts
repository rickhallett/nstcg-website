import { EventBus } from "./EventBus";
import { LoggerService } from "./LoggerService";

class ErrorHandlerService {
  private static instance: ErrorHandlerService | null;
  private eventBus: EventBus;
  private logger: LoggerService;

  private constructor(eventBus: EventBus, logger: LoggerService) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  public static getInstance(eventBus?: EventBus, logger?: LoggerService): ErrorHandlerService {
    if (!ErrorHandlerService.instance) {
      if (!eventBus || !logger) {
        throw new Error('EventBus and LoggerService instances must be provided on first call to getInstance');
      }
      ErrorHandlerService.instance = new ErrorHandlerService(eventBus, logger);
    }
    return ErrorHandlerService.instance;
  }

  public static _resetInstance(): void {
    ErrorHandlerService.instance = null;
  }

  public init(): void {
    window.addEventListener('error', (event: ErrorEvent) => {
      this.handleError(event.error || new Error(event.message), {
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      this.handleError(event.reason, { source: 'Promise rejection' });
    });
  }

  public handleError(error: any, context: any = {}): void {
    const errorToLog = error instanceof Error ? error : new Error(String(error));

    this.logger.error(errorToLog.message, {
      ...context,
      stack: errorToLog.stack,
    });

    if (error.silent) {
      return;
    }

    const userMessage = error.userMessage || 'An unexpected error occurred. Please try again later.';

    this.eventBus.emit('ui:show:error', { message: userMessage });
  }
}

export { ErrorHandlerService };
import { ErrorHandlerService } from './ErrorHandlerService';
import { EventBus } from './EventBus';
import { LoggerService } from './LoggerService';

function initializeServices() {
  const eventBus = EventBus.getInstance();
  const logger = LoggerService.getInstance();
  const errorHandler = ErrorHandlerService.getInstance(eventBus, logger);
  errorHandler.init();
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    initializeServices();
  } catch (error) {
    ErrorHandlerService.getInstance().handleError(error, { source: 'application-bootstrap' });
  }
});

import { jest } from '@jest/globals';
import { ErrorHandlerService } from '../src/ErrorHandlerService';
import { LoggerService } from '../src/LoggerService';
import { EventBus } from '../src/EventBus';
import { ApplicationError, APIError, ValidationError } from '../src/ApplicationError';

jest.mock('../ErrorHandlerService');
jest.mock('../EventBus');
jest.mock('../LoggerService');

describe('Application Bootstrap', () => {
  it('should initialize the ErrorHandlerService', () => {
    const mockErrorHandler = {
      init: jest.fn(),
      handleError: jest.fn(),
    };
    const getInstanceMock = jest.spyOn(ErrorHandlerService, 'getInstance').mockReturnValue(mockErrorHandler as any);

    // Manually trigger the DOMContentLoaded event
    require('../index');
    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);

    expect(getInstanceMock).toHaveBeenCalled();
    expect(mockErrorHandler.init).toHaveBeenCalled();
  });
});

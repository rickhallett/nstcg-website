import { ErrorHandlerService } from '../ErrorHandlerService';
import { EventBus } from '../EventBus';
import { LoggerService } from '../LoggerService';

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

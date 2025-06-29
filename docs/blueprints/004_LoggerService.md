[<- Back to Index](./000_master_blueprint.md)

# Blueprint: LoggerService.js

**Objective:** To create a service for logging application events and errors.

**Test Specification:** `tests/core/LoggerService.test.js`

```javascript
// This file needs to be created based on the description in the build order.
// There is no explicit blueprint for LoggerService.test.js in the provided files.
// I will create a basic one based on the ErrorHandlerService dependency.

import { LoggerService } from '../../js/core/LoggerService.js';
import { EventBus } from '../../js/core/EventBus.js';
import { expect } from '../../js/testing/expect.js';
import { describe, it, beforeEach, mockFn } from '../../js/testing/veritas.js';

jest.mock('../../js/core/EventBus.js');

describe('LoggerService', () => {
    let loggerService;
    let mockEventBus;

    beforeEach(() => {
        LoggerService._resetInstance();
        EventBus._resetInstance();
        loggerService = LoggerService.getInstance();
        mockEventBus = EventBus.getInstance();
    });

    it('should be a singleton', () => {
        const instance2 = LoggerService.getInstance();
        expect(loggerService).toBe(instance2);
    });

    it('should have info, warn, and error methods', () => {
        expect(typeof loggerService.info).toBe('function');
        expect(typeof loggerService.warn).toBe('function');
        expect(typeof loggerService.error).toBe('function');
    });

    it('should log an error message to the console', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        loggerService.error('Test Error');
        expect(consoleSpy).toHaveBeenCalledWith('Test Error');
        consoleSpy.mockRestore();
    });
});
```

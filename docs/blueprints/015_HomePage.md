[<- Back to Index](./000_master_blueprint.md)

# Blueprint: HomePage.js

**Objective:** To orchestrate all components and logic for the main landing page.

**Test Specification:** `tests/views/HomePage.test.js`

```javascript
import { HomePage } from '../../js/views/HomePage.js';
import { EventBus } from '../../js/core/EventBus.js';
import { UserModel } from '../../js/models/UserModel.js';
import { ParticipantModel } from '../../js/models/ParticipantModel.js';
import { FormComponent } from '../../js/components/Form/FormComponent.js';
import { CounterComponent } from '../../js/components/Counter/CounterComponent.js';
import { expect } from '../../js/testing/expect.js';
import { describe, it, beforeEach, mockFn } from '../../js/testing/veritas.js';

// Mock all dependencies to test the orchestrator in isolation.
jest.mock('../../js/core/EventBus.js');
jest.mock('../../js/models/UserModel.js');
jest.mock('../../js/models/ParticipantModel.js');
jest.mock('../../js/components/Form/FormComponent.js');
jest.mock('../../js/components/Counter/CounterComponent.js');

describe('HomePage View Controller', () => {
  let homePage;
  let mockEventBus;
  let mockUserModel;
  let mockParticipantModel;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="signup-form-container"></div>
      <div id="participant-counter-container"></div>
    `;
    EventBus._resetInstance();
    UserModel.mockClear();
    ParticipantModel.mockClear();
    FormComponent.mockClear();
    CounterComponent.mockClear();
    
    homePage = new HomePage();
    mockEventBus = EventBus.getInstance();
    mockUserModel = UserModel.mock.instances[0];
    mockParticipantModel = ParticipantModel.mock.instances[0];
  });

  // == Initialization Logic ==
  describe('init()', () => {
    it('should fetch the initial participant count using the ParticipantModel', async () => {
      await homePage.init();
      expect(mockParticipantModel.fetchParticipantCount).toHaveBeenCalled();
    });

    it('should initialize and attach the FormComponent', async () => {
      await homePage.init();
      expect(FormComponent).toHaveBeenCalled();
      const formInstance = FormComponent.mock.instances[0];
      expect(formInstance.attach).toHaveBeenCalled();
    });

    it('should initialize and attach the CounterComponent', async () => {
      await homePage.init();
      expect(CounterComponent).toHaveBeenCalled();
      const counterInstance = CounterComponent.mock.instances[0];
      expect(counterInstance.attach).toHaveBeenCalled();
    });

    it('should subscribe to the "form:submit" event', async () => {
      await homePage.init();
      expect(mockEventBus.on).toHaveBeenCalledWith('form:submit', expect.any(Function));
    });
  });

  // == Event Handling Logic ==
  describe('Event Handling', () => {
    it('should call UserModel.register with form data when "form:submit" is triggered', async () => {
      const formData = { email: 'test@test.com' };
      mockUserModel.register.mockResolvedValue({ success: true });
      await homePage.init();
      
      // Simulate the event being fired
      const handler = mockEventBus.on.mock.calls.find(c => c[0] === 'form:submit')[1];
      await handler(formData);
      
      expect(mockUserModel.register).toHaveBeenCalledWith(formData);
    });

    it('should fetch the new participant count after a successful registration', async () => {
      mockUserModel.register.mockResolvedValue({ success: true });
      await homePage.init();
      const formSubmitHandler = mockEventBus.on.mock.calls.find(c => c[0] === 'form:submit')[1];
      
      // Clear initial call from init()
      mockParticipantModel.fetchParticipantCount.mockClear();

      await formSubmitHandler({});
      expect(mockParticipantModel.fetchParticipantCount).toHaveBeenCalled();
    });

    it('should emit a "ui:show:notification" event on successful registration', async () => {
      mockUserModel.register.mockResolvedValue({ success: true });
      await homePage.init();
      const formSubmitHandler = mockEventBus.on.mock.calls.find(c => c[0] === 'form:submit')[1];
      
      await formSubmitHandler({});
      expect(mockEventBus.emit).toHaveBeenCalledWith('ui:show:notification', {
        type: 'success',
        message: 'Thank you for registering!'
      });
    });
  });
});
```

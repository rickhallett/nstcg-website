Understood. With the foundational core (`StateManager`, `EventBus`, `Component`, `DOM Synchronizer`) and the external communication bridge (`ApiService`, `NotionService`) blueprinted, the next logical step in our Foundation-First approach is to define the application's brain: the **Model layer**.

The Models are where the core business logic resides. They are the orchestrators that respond to commands from the View Controllers, interact with Services to fetch or persist data, and ultimately command the `StateManager` to update the application's state. They are the crucial link between user intent and system state.

We will start with the blueprint for the most central model in our application: the **`UserModel.js`**.

---

### **Test Specification Blueprint: The Model Layer (`UserModel.js`)**

**Module Objective:** To encapsulate all business logic related to a user, including registration, activation, and state management. The `UserModel` is the single authority on user-related operations.

**Architectural Role:** The `UserModel` sits between the `View Controllers` and the `Services`. It is called by controllers in response to user actions, and it uses services (`NotionService`) to fulfill those requests. It knows nothing about the UI or the specifics of the Notion API. Its sole focus is business logic.

**File: `tests/models/UserModel.test.js`**

```javascript
import { UserModel } from '../../js/models/UserModel.js';
import { NotionService } from '../../js/services/NotionService.js';
import { StateManager } from '../../js/core/StateManager.js';
import { expect } from '../../js/testing/expect.js';
import { describe, it, beforeEach, mockFn } from '../../js/testing/veritas.js';

// Mock the dependencies. The UserModel should have no knowledge of their inner workings.
jest.mock('../../js/services/NotionService.js');
jest.mock('../../js/core/StateManager.js');

describe('UserModel', () => {
  let userModel;
  let mockNotionService;
  let mockStateManager;

  beforeEach(() => {
    // Reset mocks before each test
    NotionService.mockClear();
    StateManager._resetInstance(); // Assuming a test-only reset method

    // Instantiate the class we are testing
    userModel = new UserModel();

    // Get a reference to the mocked instances that UserModel will create internally
    mockNotionService = NotionService.mock.instances[0];
    mockStateManager = StateManager.getInstance();
  });

  // == User Registration Logic ==
  describe('register()', () => {
    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      visitorType: 'local'
    };

    it('should first check if the user already exists via NotionService', async () => {
      // mockNotionService.getParticipantByEmail.mockResolvedValue(null);
      // mockNotionService.createParticipant.mockResolvedValue({ id: 'page123', ...userData });
      // await userModel.register(userData);
      // expect(mockNotionService.getParticipantByEmail).toHaveBeenCalledWith(userData.email);
    });

    it('should return an error object if the user already exists', async () => {
      // mockNotionService.getParticipantByEmail.mockResolvedValue({ id: 'existing123', email: userData.email });
      // const result = await userModel.register(userData);
      // expect(result).toEqual({ success: false, reason: 'DUPLICATE_EMAIL' });
      // expect(mockNotionService.createParticipant).not.toHaveBeenCalled();
      // expect(mockStateManager.set).not.toHaveBeenCalled();
    });

    it('should call NotionService.createParticipant if the user does not exist', async () => {
      // mockNotionService.getParticipantByEmail.mockResolvedValue(null);
      // mockNotionService.createParticipant.mockResolvedValue({ id: 'page123', ...userData });
      // await userModel.register(userData);
      // expect(mockNotionService.createParticipant).toHaveBeenCalledWith(expect.objectContaining({ email: userData.email }));
    });
    
    it('should generate a referral code for the new user', async () => {
        // mockNotionService.getParticipantByEmail.mockResolvedValue(null);
        // mockNotionService.createParticipant.mockResolvedValue({ id: 'page123', ...userData });
        // await userModel.register(userData);
        // const creationPayload = mockNotionService.createParticipant.mock.calls[0][0];
        // expect(creationPayload.referralCode).toMatch(/^[A-Z]{3}[A-Z0-9]{8}$/);
    });

    it('should update the StateManager with the new user data upon successful creation', async () => {
      // const newUser = { id: 'page123', referralCode: 'JOH1234ABCD', ...userData };
      // mockNotionService.getParticipantByEmail.mockResolvedValue(null);
      // mockNotionService.createParticipant.mockResolvedValue(newUser);
      
      // await userModel.register(userData);

      // We expect a batch update for atomicity
      // expect(mockStateManager.update).toHaveBeenCalledWith({
      //   'user.id': newUser.id,
      //   'user.email': newUser.email,
      //   'user.firstName': newUser.firstName,
      //   'user.referralCode': newUser.referralCode,
      //   'user.isRegistered': true
      // });
    });

    it('should return a success object with the new user data', async () => {
      // const newUser = { id: 'page123', ...userData };
      // mockNotionService.getParticipantByEmail.mockResolvedValue(null);
      // mockNotionService.createParticipant.mockResolvedValue(newUser);
      // const result = await userModel.register(userData);
      // expect(result.success).toBe(true);
      // expect(result.user).toEqual(newUser);
    });

    it('should throw an application-level error if the NotionService fails during creation', async () => {
      // mockNotionService.getParticipantByEmail.mockResolvedValue(null);
      // mockNotionService.createParticipant.mockRejectedValue(new Error('Notion API is down'));
      // const registerPromise = userModel.register(userData);
      // await expect(registerPromise).toThrow('Failed to register user: Notion API is down');
    });
  });

  // == User Activation Logic ==
  describe('activate()', () => {
    const activationData = { email: 'john.doe@example.com', bonusPoints: 75 };
    const existingUser = { id: 'page123', email: 'john.doe@example.com', name: 'John Doe', referralCode: 'JOH1234ABCD', totalPoints: 10 };

    it('should find the existing user via NotionService', async () => {
      // mockNotionService.getParticipantByEmail.mockResolvedValue(existingUser);
      // mockNotionService.updateParticipant.mockResolvedValue({ ...existingUser, totalPoints: 85 });
      // await userModel.activate(activationData);
      // expect(mockNotionService.getParticipantByEmail).toHaveBeenCalledWith(activationData.email);
    });

    it('should return an error if the user to be activated does not exist', async () => {
      // mockNotionService.getParticipantByEmail.mockResolvedValue(null);
      // const result = await userModel.activate(activationData);
      // expect(result).toEqual({ success: false, reason: 'USER_NOT_FOUND' });
    });

    it('should call NotionService.updateParticipant with the correctly calculated new points total', async () => {
      // mockNotionService.getParticipantByEmail.mockResolvedValue(existingUser);
      // mockNotionService.updateParticipant.mockResolvedValue({});
      
      // await userModel.activate(activationData);
      
      // const expectedUpdatePayload = { totalPoints: existingUser.totalPoints + activationData.bonusPoints };
      // expect(mockNotionService.updateParticipant).toHaveBeenCalledWith(existingUser.id, expect.objectContaining(expectedUpdatePayload));
    });
    
    it('should NOT award bonus points if the user already has bonus points recorded', async () => {
        // const userWithBonus = { ...existingUser, bonusPoints: 75 };
        // mockNotionService.getParticipantByEmail.mockResolvedValue(userWithBonus);
        // await userModel.activate(activationData);
        // expect(mockNotionService.updateParticipant).not.toHaveBeenCalled();
    });

    it('should update the StateManager with the activated user\'s full profile', async () => {
      // const updatedUser = { ...existingUser, totalPoints: 85, bonusPoints: 75 };
      // mockNotionService.getParticipantByEmail.mockResolvedValue(existingUser);
      // mockNotionService.updateParticipant.mockResolvedValue(updatedUser);
      
      // await userModel.activate(activationData);
      
      // expect(mockStateManager.set).toHaveBeenCalledWith('user', updatedUser);
    });
  });

  // == User State Hydration ==
  describe('hydrateFromStorage()', () => {
    it('should do nothing if no user ID is found in storage', () => {
      // We need a mock StorageService for this test
      // mockStorageService.get.mockReturnValue(null);
      // userModel.hydrateFromStorage();
      // expect(mockStateManager.set).not.toHaveBeenCalled();
    });
      
    it('should fetch user data from NotionService if a user ID is found in storage', async () => {
      // const storedUser = { id: 'user456', email: 'jane@test.com' };
      // mockStorageService.get.mockReturnValue(storedUser.id);
      // mockNotionService.getParticipantById.mockResolvedValue(storedUser); // A new service method we need
      
      // await userModel.hydrateFromStorage();
      
      // expect(mockNotionService.getParticipantById).toHaveBeenCalledWith(storedUser.id);
      // expect(mockStateManager.set).toHaveBeenCalledWith('user', storedUser);
    });
  });
});
```

### Justification and Agent Guidance

By creating this blueprint, you are telling the agent:

1.  **"This is what a `UserModel` does."** It registers, it activates, it hydrates. Its responsibilities are now explicitly defined.
2.  **"This is how it interacts with the world."** It uses `NotionService` for data and `StateManager` for updates. The tests enforce this separation. The agent cannot write code where `UserModel` directly manipulates `localStorage` or `fetch`, because the tests do not mock those dependencies—they mock the *Service* that encapsulates them.
3.  **"This is the business logic."** The tests specify the rules: check for duplicates before creating, award bonus points only once, generate a referral code on creation. The agent's task is to translate these rules into code.
4.  **"This is how it handles failure."** The tests for `already exists` and `user not found` define the expected "Failure" paths (returning a `{ success: false }` object), while the test for a `NotionService` failure defines the "Exception" path (re-throwing a custom error).

This blueprint provides a complete, unambiguous contract for the `UserModel`. Once implemented, it becomes another solid, tested brick in our foundation, ready to be used by the View Controllers in the next phase of development.
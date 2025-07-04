import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { UserModel } from './UserModel';
import { StateManager } from '../StateManager';
import { EventBus } from '../EventBus';
import { NotionService } from '../NotionService';
import { LoggerService } from '../LoggerService';
import { ApiService } from '../ApiService';

// Mock NotionService methods
const mockGetParticipantByEmail = mock();
const mockCreateParticipant = mock();
const mockUpdateParticipant = mock();

// Create mock NotionService
class MockNotionService extends NotionService {
  getParticipantByEmail = mockGetParticipantByEmail;
  createParticipant = mockCreateParticipant;
  updateParticipant = mockUpdateParticipant;
}

describe('UserModel', () => {
  let userModel: UserModel;
  let stateManager: StateManager;
  let eventBus: EventBus;
  let notionService: NotionService;
  let logger: LoggerService;

  beforeEach(() => {
    // Reset singletons
    StateManager._resetInstance();
    EventBus._resetInstance();
    LoggerService._resetInstance();
    
    // Initialize services
    stateManager = StateManager.getInstance();
    eventBus = EventBus.getInstance();
    logger = LoggerService.getInstance();
    
    // Set up StateManager
    stateManager.setEventBus(eventBus);
    stateManager.initialize({
      user: null,
      auth: {
        isAuthenticated: false,
        token: null
      }
    });
    
    // Create mock NotionService
    const apiService = new ApiService({ eventBus, logger });
    notionService = new MockNotionService({
      apiService,
      databaseId: 'test-db',
      apiKey: 'test-key'
    });
    
    // Create UserModel
    userModel = new UserModel({ notionService, stateManager, eventBus });
    
    // Reset mocks
    mockGetParticipantByEmail.mockReset();
    mockCreateParticipant.mockReset();
    mockUpdateParticipant.mockReset();
  });

  describe('constructor', () => {
    it('should initialize with required dependencies', () => {
      expect(userModel).toBeDefined();
    });
  });

  describe('register', () => {
    it('should check if user already exists', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com'
      };
      
      mockGetParticipantByEmail.mockResolvedValueOnce(null);
      mockCreateParticipant.mockResolvedValueOnce({
        id: 'user-123',
        ...userData,
        referralCode: 'REF123',
        points: 0,
        hasNFT: false
      });
      
      await userModel.register(userData);
      
      expect(mockGetParticipantByEmail).toHaveBeenCalledWith('john@example.com');
    });

    it('should return error if user already exists', async () => {
      const userData = {
        name: 'John Doe',
        email: 'existing@example.com'
      };
      
      mockGetParticipantByEmail.mockResolvedValueOnce({
        id: 'existing-user',
        ...userData
      });
      
      const result = await userModel.register(userData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User with this email already exists');
      expect(mockCreateParticipant).not.toHaveBeenCalled();
    });

    it('should generate referral code for new user', async () => {
      const userData = {
        name: 'Jane Smith',
        email: 'jane@example.com'
      };
      
      mockGetParticipantByEmail.mockResolvedValueOnce(null);
      mockCreateParticipant.mockImplementationOnce(async (data) => ({
        id: 'user-456',
        ...data,
        points: 0,
        hasNFT: false
      }));
      
      await userModel.register(userData);
      
      expect(mockCreateParticipant).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Jane Smith',
          email: 'jane@example.com',
          referralCode: expect.stringMatching(/^[A-Z0-9]{6}$/)
        })
      );
    });

    it('should update state on successful registration', async () => {
      const userData = {
        name: 'New User',
        email: 'new@example.com'
      };
      
      const createdUser = {
        id: 'user-789',
        ...userData,
        referralCode: 'NEW789',
        points: 0,
        hasNFT: false
      };
      
      mockGetParticipantByEmail.mockResolvedValueOnce(null);
      mockCreateParticipant.mockResolvedValueOnce(createdUser);
      
      const result = await userModel.register(userData);
      
      expect(result.success).toBe(true);
      expect(result.user).toEqual(createdUser);
      
      // Check state was updated
      const userState = stateManager.get('user');
      expect(userState).toEqual(createdUser);
      
      const authState = stateManager.get('auth');
      expect(authState.isAuthenticated).toBe(true);
    });

    it('should emit user:registered event', async () => {
      const userData = {
        name: 'Event User',
        email: 'event@example.com'
      };
      
      mockGetParticipantByEmail.mockResolvedValueOnce(null);
      mockCreateParticipant.mockResolvedValueOnce({
        id: 'user-event',
        ...userData,
        referralCode: 'EVT123'
      });
      
      const eventHandler = mock();
      eventBus.on('user:registered', eventHandler);
      
      await userModel.register(userData);
      
      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-event',
          email: 'event@example.com'
        })
      );
    });

    it('should handle registration errors', async () => {
      const userData = {
        name: 'Error User',
        email: 'error@example.com'
      };
      
      mockGetParticipantByEmail.mockResolvedValueOnce(null);
      mockCreateParticipant.mockResolvedValueOnce(null); // Simulate error
      
      const result = await userModel.register(userData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create user');
    });
  });

  describe('login', () => {
    it('should verify user exists', async () => {
      const credentials = {
        email: 'login@example.com'
      };
      
      mockGetParticipantByEmail.mockResolvedValueOnce(null);
      
      const result = await userModel.login(credentials);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should update state on successful login', async () => {
      const credentials = {
        email: 'user@example.com'
      };
      
      const existingUser = {
        id: 'user-login',
        name: 'Login User',
        email: 'user@example.com',
        referralCode: 'USR123',
        points: 100,
        hasNFT: true
      };
      
      mockGetParticipantByEmail.mockResolvedValueOnce(existingUser);
      
      const result = await userModel.login(credentials);
      
      expect(result.success).toBe(true);
      expect(result.user).toEqual(existingUser);
      
      // Check state
      expect(stateManager.get('user')).toEqual(existingUser);
      expect(stateManager.get('auth.isAuthenticated')).toBe(true);
    });

    it('should emit user:logged-in event', async () => {
      const credentials = {
        email: 'event@example.com'
      };
      
      const user = {
        id: 'user-event-login',
        email: 'event@example.com'
      };
      
      mockGetParticipantByEmail.mockResolvedValueOnce(user);
      
      const eventHandler = mock();
      eventBus.on('user:logged-in', eventHandler);
      
      await userModel.login(credentials);
      
      expect(eventHandler).toHaveBeenCalledWith(user);
    });
  });

  describe('logout', () => {
    it('should clear user state', async () => {
      // Set up logged in state
      stateManager.set('user', { id: 'user-123', name: 'Test' });
      stateManager.set('auth.isAuthenticated', true);
      
      await userModel.logout();
      
      expect(stateManager.get('user')).toBeNull();
      expect(stateManager.get('auth.isAuthenticated')).toBe(false);
      expect(stateManager.get('auth.token')).toBeNull();
    });

    it('should emit user:logged-out event', async () => {
      const eventHandler = mock();
      eventBus.on('user:logged-out', eventHandler);
      
      await userModel.logout();
      
      expect(eventHandler).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user from state', () => {
      const user = {
        id: 'current-user',
        name: 'Current User',
        email: 'current@example.com'
      };
      
      stateManager.set('user', user);
      
      const result = userModel.getCurrentUser();
      
      expect(result).toEqual(user);
    });

    it('should return null if no user logged in', () => {
      stateManager.set('user', null);
      
      const result = userModel.getCurrentUser();
      
      expect(result).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when user is authenticated', () => {
      stateManager.set('auth.isAuthenticated', true);
      
      expect(userModel.isAuthenticated()).toBe(true);
    });

    it('should return false when user is not authenticated', () => {
      stateManager.set('auth.isAuthenticated', false);
      
      expect(userModel.isAuthenticated()).toBe(false);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile in Notion', async () => {
      const currentUser = {
        id: 'user-update',
        name: 'Old Name',
        email: 'user@example.com'
      };
      
      stateManager.set('user', currentUser);
      
      const updates = {
        name: 'New Name'
      };
      
      mockUpdateParticipant.mockResolvedValueOnce(true);
      
      const result = await userModel.updateProfile(updates);
      
      expect(result.success).toBe(true);
      expect(mockUpdateParticipant).toHaveBeenCalledWith('user-update', updates);
    });

    it('should update state on successful profile update', async () => {
      const currentUser = {
        id: 'user-state-update',
        name: 'Current Name',
        email: 'current@example.com',
        points: 50
      };
      
      stateManager.set('user', currentUser);
      
      mockUpdateParticipant.mockResolvedValueOnce(true);
      
      await userModel.updateProfile({ name: 'Updated Name' });
      
      const updatedUser = stateManager.get('user');
      expect(updatedUser.name).toBe('Updated Name');
      expect(updatedUser.email).toBe('current@example.com'); // Unchanged
      expect(updatedUser.points).toBe(50); // Unchanged
    });

    it('should emit user:profile-updated event', async () => {
      stateManager.set('user', { id: 'user-123' });
      
      mockUpdateParticipant.mockResolvedValueOnce(true);
      
      const eventHandler = mock();
      eventBus.on('user:profile-updated', eventHandler);
      
      const updates = { name: 'New Name' };
      await userModel.updateProfile(updates);
      
      expect(eventHandler).toHaveBeenCalledWith(updates);
    });

    it('should handle update errors', async () => {
      stateManager.set('user', { id: 'user-error' });
      
      mockUpdateParticipant.mockResolvedValueOnce(false);
      
      const result = await userModel.updateProfile({ name: 'Failed' });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update profile');
    });

    it('should require authenticated user', async () => {
      stateManager.set('user', null);
      
      const result = await userModel.updateProfile({ name: 'No User' });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No user logged in');
    });
  });

  describe('generateReferralCode', () => {
    it('should generate 6-character alphanumeric code', () => {
      const code = userModel['generateReferralCode']();
      
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      
      for (let i = 0; i < 100; i++) {
        codes.add(userModel['generateReferralCode']());
      }
      
      // Should generate 100 unique codes
      expect(codes.size).toBe(100);
    });
  });
});
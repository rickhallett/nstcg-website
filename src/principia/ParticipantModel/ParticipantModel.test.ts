import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ParticipantModel } from './ParticipantModel';
import { StateManager } from '../StateManager';
import { EventBus } from '../EventBus';
import { NotionService } from '../NotionService';
import { LoggerService } from '../LoggerService';
import { ApiService } from '../ApiService';

// Mock NotionService methods
const mockGetParticipantByEmail = mock();
const mockUpdateParticipant = mock();
const mockGetLeaderboard = mock();

// Create mock NotionService
class MockNotionService extends NotionService {
  getParticipantByEmail = mockGetParticipantByEmail;
  updateParticipant = mockUpdateParticipant;
  getLeaderboard = mockGetLeaderboard;
}

describe('ParticipantModel', () => {
  let participantModel: ParticipantModel;
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
      user: {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        referralCode: 'TEST123',
        points: 100,
        hasNFT: false
      },
      leaderboard: [],
      referrals: {
        count: 0,
        users: []
      }
    });
    
    // Create mock NotionService
    const apiService = new ApiService({ eventBus, logger });
    notionService = new MockNotionService({
      apiService,
      databaseId: 'test-db',
      apiKey: 'test-key'
    });
    
    // Create ParticipantModel
    participantModel = new ParticipantModel({
      notionService,
      stateManager,
      eventBus
    });
    
    // Reset mocks
    mockGetParticipantByEmail.mockReset();
    mockUpdateParticipant.mockReset();
    mockGetLeaderboard.mockReset();
  });

  describe('constructor', () => {
    it('should initialize with required dependencies', () => {
      expect(participantModel).toBeDefined();
    });
  });

  describe('addPoints', () => {
    it('should add points to current user', async () => {
      mockUpdateParticipant.mockResolvedValueOnce(true);
      
      const result = await participantModel.addPoints(50, 'Task completion');
      
      expect(result.success).toBe(true);
      expect(result.newTotal).toBe(150); // 100 + 50
      
      expect(mockUpdateParticipant).toHaveBeenCalledWith('user-123', {
        points: 150
      });
    });

    it('should update state with new points', async () => {
      mockUpdateParticipant.mockResolvedValueOnce(true);
      
      await participantModel.addPoints(25);
      
      const user = stateManager.get('user');
      expect(user.points).toBe(125);
    });

    it('should emit points:earned event', async () => {
      mockUpdateParticipant.mockResolvedValueOnce(true);
      
      const eventHandler = mock();
      eventBus.on('points:earned', eventHandler);
      
      await participantModel.addPoints(30, 'Achievement');
      
      expect(eventHandler).toHaveBeenCalledWith({
        userId: 'user-123',
        points: 30,
        reason: 'Achievement',
        newTotal: 130
      });
    });

    it('should validate points are positive', async () => {
      const result = await participantModel.addPoints(-10);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Points must be positive');
      expect(mockUpdateParticipant).not.toHaveBeenCalled();
    });

    it('should require authenticated user', async () => {
      stateManager.set('user', null);
      
      const result = await participantModel.addPoints(10);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No user logged in');
    });

    it('should handle update errors', async () => {
      mockUpdateParticipant.mockResolvedValueOnce(false);
      
      const result = await participantModel.addPoints(10);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update points');
    });
  });

  describe('getUserPoints', () => {
    it('should return current user points', () => {
      const points = participantModel.getUserPoints();
      
      expect(points).toBe(100);
    });

    it('should return 0 if no user logged in', () => {
      stateManager.set('user', null);
      
      const points = participantModel.getUserPoints();
      
      expect(points).toBe(0);
    });

    it('should return 0 if user has no points', () => {
      stateManager.set('user', { id: 'user-no-points' });
      
      const points = participantModel.getUserPoints();
      
      expect(points).toBe(0);
    });
  });

  describe('processReferral', () => {
    it('should award points for successful referral', async () => {
      const referredUser = {
        id: 'new-user',
        name: 'New User',
        email: 'new@example.com'
      };
      
      mockUpdateParticipant.mockResolvedValueOnce(true);
      
      const result = await participantModel.processReferral(
        'TEST123',
        referredUser
      );
      
      expect(result.success).toBe(true);
      expect(result.pointsAwarded).toBe(50); // Default referral points
      
      expect(mockUpdateParticipant).toHaveBeenCalledWith('user-123', {
        points: 150 // 100 + 50
      });
    });

    it('should update referrals in state', async () => {
      const referredUser = {
        id: 'new-user',
        name: 'New User',
        email: 'new@example.com'
      };
      
      mockUpdateParticipant.mockResolvedValueOnce(true);
      
      await participantModel.processReferral('TEST123', referredUser);
      
      const referrals = stateManager.get('referrals');
      expect(referrals.count).toBe(1);
      expect(referrals.users).toContainEqual({
        id: 'new-user',
        name: 'New User',
        email: 'new@example.com',
        date: expect.any(String)
      });
    });

    it('should emit referral:completed event', async () => {
      const referredUser = {
        id: 'new-user',
        name: 'New User'
      };
      
      mockUpdateParticipant.mockResolvedValueOnce(true);
      
      const eventHandler = mock();
      eventBus.on('referral:completed', eventHandler);
      
      await participantModel.processReferral('TEST123', referredUser);
      
      expect(eventHandler).toHaveBeenCalledWith({
        referrerId: 'user-123',
        referredUser,
        pointsAwarded: 50
      });
    });

    it('should handle invalid referral code', async () => {
      const result = await participantModel.processReferral(
        'INVALID',
        { id: 'new-user' }
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid referral code');
    });

    it('should handle custom points amount', async () => {
      mockUpdateParticipant.mockResolvedValueOnce(true);
      
      const result = await participantModel.processReferral(
        'TEST123',
        { id: 'new-user' },
        100
      );
      
      expect(result.pointsAwarded).toBe(100);
      expect(mockUpdateParticipant).toHaveBeenCalledWith('user-123', {
        points: 200 // 100 + 100
      });
    });
  });

  describe('getLeaderboard', () => {
    it('should fetch and cache leaderboard', async () => {
      const leaderboardData = [
        { id: '1', name: 'Top User', points: 500 },
        { id: '2', name: 'Second User', points: 300 },
        { id: 'user-123', name: 'Test User', points: 100 }
      ];
      
      mockGetLeaderboard.mockResolvedValueOnce(leaderboardData);
      
      const result = await participantModel.getLeaderboard();
      
      expect(result).toEqual(leaderboardData);
      expect(mockGetLeaderboard).toHaveBeenCalledWith(100);
    });

    it('should update leaderboard in state', async () => {
      const leaderboardData = [
        { id: '1', name: 'Leader', points: 1000 }
      ];
      
      mockGetLeaderboard.mockResolvedValueOnce(leaderboardData);
      
      await participantModel.getLeaderboard();
      
      const storedLeaderboard = stateManager.get('leaderboard');
      expect(storedLeaderboard).toEqual(leaderboardData);
    });

    it('should emit leaderboard:updated event', async () => {
      const leaderboardData = [{ id: '1', points: 100 }];
      
      mockGetLeaderboard.mockResolvedValueOnce(leaderboardData);
      
      const eventHandler = mock();
      eventBus.on('leaderboard:updated', eventHandler);
      
      await participantModel.getLeaderboard(10);
      
      expect(eventHandler).toHaveBeenCalledWith(leaderboardData);
    });

    it('should handle fetch errors', async () => {
      mockGetLeaderboard.mockResolvedValueOnce([]);
      
      const result = await participantModel.getLeaderboard();
      
      expect(result).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      mockGetLeaderboard.mockResolvedValueOnce([]);
      
      await participantModel.getLeaderboard(50);
      
      expect(mockGetLeaderboard).toHaveBeenCalledWith(50);
    });
  });

  describe('getUserRank', () => {
    it('should calculate user rank from leaderboard', async () => {
      const leaderboardData = [
        { id: '1', points: 500 },
        { id: '2', points: 300 },
        { id: 'user-123', points: 100 },
        { id: '4', points: 50 }
      ];
      
      stateManager.set('leaderboard', leaderboardData);
      
      const rank = await participantModel.getUserRank();
      
      expect(rank).toBe(3); // Third place
    });

    it('should fetch leaderboard if not cached', async () => {
      stateManager.set('leaderboard', []);
      
      const leaderboardData = [
        { id: 'user-123', points: 100 }
      ];
      
      mockGetLeaderboard.mockResolvedValueOnce(leaderboardData);
      
      const rank = await participantModel.getUserRank();
      
      expect(rank).toBe(1);
      expect(mockGetLeaderboard).toHaveBeenCalled();
    });

    it('should return -1 if user not in leaderboard', async () => {
      const leaderboardData = [
        { id: '1', points: 500 },
        { id: '2', points: 300 }
      ];
      
      stateManager.set('leaderboard', leaderboardData);
      
      const rank = await participantModel.getUserRank();
      
      expect(rank).toBe(-1);
    });

    it('should return -1 if no user logged in', async () => {
      stateManager.set('user', null);
      
      const rank = await participantModel.getUserRank();
      
      expect(rank).toBe(-1);
    });
  });

  describe('claimNFT', () => {
    it('should update user NFT status', async () => {
      mockUpdateParticipant.mockResolvedValueOnce(true);
      
      const result = await participantModel.claimNFT();
      
      expect(result.success).toBe(true);
      expect(mockUpdateParticipant).toHaveBeenCalledWith('user-123', {
        hasNFT: true
      });
    });

    it('should update state with NFT status', async () => {
      mockUpdateParticipant.mockResolvedValueOnce(true);
      
      await participantModel.claimNFT();
      
      const user = stateManager.get('user');
      expect(user.hasNFT).toBe(true);
    });

    it('should emit nft:claimed event', async () => {
      mockUpdateParticipant.mockResolvedValueOnce(true);
      
      const eventHandler = mock();
      eventBus.on('nft:claimed', eventHandler);
      
      await participantModel.claimNFT();
      
      expect(eventHandler).toHaveBeenCalledWith({
        userId: 'user-123'
      });
    });

    it('should prevent claiming NFT twice', async () => {
      stateManager.set('user.hasNFT', true);
      
      const result = await participantModel.claimNFT();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('NFT already claimed');
      expect(mockUpdateParticipant).not.toHaveBeenCalled();
    });

    it('should require authenticated user', async () => {
      stateManager.set('user', null);
      
      const result = await participantModel.claimNFT();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No user logged in');
    });
  });

  describe('getReferralCount', () => {
    it('should return referral count from state', () => {
      stateManager.set('referrals.count', 5);
      
      const count = participantModel.getReferralCount();
      
      expect(count).toBe(5);
    });

    it('should return 0 if no referrals', () => {
      stateManager.set('referrals', null);
      
      const count = participantModel.getReferralCount();
      
      expect(count).toBe(0);
    });
  });
});
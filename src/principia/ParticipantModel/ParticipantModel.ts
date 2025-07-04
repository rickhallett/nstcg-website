/**
 * @module ParticipantModel
 * @description Business logic for participant operations in Principia.js
 * 
 * The ParticipantModel handles participant-specific operations like
 * points management, referrals, leaderboard, and NFT claims.
 * 
 * Follows Principia.js architectural canon:
 * - Models contain business logic
 * - State updates go through StateManager
 * - Communication happens via EventBus
 * - External API calls go through Services
 */

import type { StateManager } from '../StateManager';
import type { EventBus } from '../EventBus';
import type { NotionService, Participant } from '../NotionService';

/**
 * Configuration for ParticipantModel
 */
export interface ParticipantModelConfig {
  notionService: NotionService;
  stateManager: StateManager;
  eventBus: EventBus;
}

/**
 * Result of participant operations
 */
export interface ParticipantOperationResult {
  success: boolean;
  error?: string;
  newTotal?: number;
  pointsAwarded?: number;
}

/**
 * Referral information
 */
export interface ReferralInfo {
  id: string;
  name?: string;
  email?: string;
  date: string;
}

/**
 * Model for participant business logic
 * 
 * @class ParticipantModel
 */
export class ParticipantModel {
  private notionService: NotionService;
  private stateManager: StateManager;
  private eventBus: EventBus;
  
  // Default points for various actions
  private static readonly REFERRAL_POINTS = 50;

  /**
   * Create a new ParticipantModel instance
   * 
   * @param config Model configuration
   */
  constructor(config: ParticipantModelConfig) {
    this.notionService = config.notionService;
    this.stateManager = config.stateManager;
    this.eventBus = config.eventBus;
  }

  /**
   * Add points to the current user
   * 
   * @param points Number of points to add
   * @param reason Optional reason for points
   * @returns Operation result with new total
   */
  async addPoints(points: number, reason?: string): Promise<ParticipantOperationResult> {
    try {
      // Validate points
      if (points <= 0) {
        return {
          success: false,
          error: 'Points must be positive'
        };
      }

      // Get current user
      const currentUser = this.stateManager.get('user');
      if (!currentUser || !currentUser.id) {
        return {
          success: false,
          error: 'No user logged in'
        };
      }

      // Calculate new total
      const currentPoints = currentUser.points || 0;
      const newTotal = currentPoints + points;

      // Update in Notion
      const updateSuccess = await this.notionService.updateParticipant(
        currentUser.id,
        { points: newTotal }
      );

      if (!updateSuccess) {
        return {
          success: false,
          error: 'Failed to update points'
        };
      }

      // Update local state
      this.stateManager.set('user.points', newTotal);

      // Emit event
      this.eventBus.emit('points:earned', {
        userId: currentUser.id,
        points,
        reason,
        newTotal
      });

      return {
        success: true,
        newTotal
      };

    } catch (error: any) {
      console.error('Error adding points:', error);
      return {
        success: false,
        error: error.message || 'Failed to add points'
      };
    }
  }

  /**
   * Get current user's points
   * 
   * @returns Current points or 0
   */
  getUserPoints(): number {
    const user = this.stateManager.get('user');
    return user?.points || 0;
  }

  /**
   * Process a referral and award points
   * 
   * @param referralCode The referral code used
   * @param referredUser The user who was referred
   * @param points Optional custom points amount
   * @returns Operation result
   */
  async processReferral(
    referralCode: string,
    referredUser: Partial<Participant>,
    points: number = ParticipantModel.REFERRAL_POINTS
  ): Promise<ParticipantOperationResult> {
    try {
      // Get current user
      const currentUser = this.stateManager.get('user');
      if (!currentUser || !currentUser.referralCode) {
        return {
          success: false,
          error: 'No user logged in'
        };
      }

      // Validate referral code
      if (referralCode !== currentUser.referralCode) {
        return {
          success: false,
          error: 'Invalid referral code'
        };
      }

      // Award points
      const pointsResult = await this.addPoints(points, 'Referral bonus');
      
      if (!pointsResult.success) {
        return pointsResult;
      }

      // Update referrals in state
      const currentReferrals = this.stateManager.get('referrals') || { count: 0, users: [] };
      const newReferral: ReferralInfo = {
        id: referredUser.id!,
        name: referredUser.name,
        email: referredUser.email,
        date: new Date().toISOString()
      };

      this.stateManager.update({
        'referrals.count': currentReferrals.count + 1,
        'referrals.users': [...currentReferrals.users, newReferral]
      });

      // Emit event
      this.eventBus.emit('referral:completed', {
        referrerId: currentUser.id,
        referredUser,
        pointsAwarded: points
      });

      return {
        success: true,
        pointsAwarded: points
      };

    } catch (error: any) {
      console.error('Error processing referral:', error);
      return {
        success: false,
        error: error.message || 'Failed to process referral'
      };
    }
  }

  /**
   * Get the leaderboard
   * 
   * @param limit Number of participants to fetch
   * @returns Array of participants sorted by points
   */
  async getLeaderboard(limit: number = 100): Promise<Participant[]> {
    try {
      // Fetch from Notion
      const leaderboard = await this.notionService.getLeaderboard(limit);

      // Cache in state
      this.stateManager.set('leaderboard', leaderboard);

      // Emit event
      this.eventBus.emit('leaderboard:updated', leaderboard);

      return leaderboard;

    } catch (error: any) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  /**
   * Get current user's rank in the leaderboard
   * 
   * @returns User's rank (1-based) or -1 if not found
   */
  async getUserRank(): Promise<number> {
    try {
      const currentUser = this.stateManager.get('user');
      if (!currentUser || !currentUser.id) {
        return -1;
      }

      // Get leaderboard from state or fetch
      let leaderboard = this.stateManager.get('leaderboard') || [];
      
      if (leaderboard.length === 0) {
        leaderboard = await this.getLeaderboard();
      }

      // Find user's position
      const userIndex = leaderboard.findIndex(p => p.id === currentUser.id);
      
      return userIndex === -1 ? -1 : userIndex + 1;

    } catch (error: any) {
      console.error('Error getting user rank:', error);
      return -1;
    }
  }

  /**
   * Claim NFT for the current user
   * 
   * @returns Operation result
   */
  async claimNFT(): Promise<ParticipantOperationResult> {
    try {
      // Get current user
      const currentUser = this.stateManager.get('user');
      if (!currentUser || !currentUser.id) {
        return {
          success: false,
          error: 'No user logged in'
        };
      }

      // Check if already claimed
      if (currentUser.hasNFT) {
        return {
          success: false,
          error: 'NFT already claimed'
        };
      }

      // Update in Notion
      const updateSuccess = await this.notionService.updateParticipant(
        currentUser.id,
        { hasNFT: true }
      );

      if (!updateSuccess) {
        return {
          success: false,
          error: 'Failed to claim NFT'
        };
      }

      // Update local state
      this.stateManager.set('user.hasNFT', true);

      // Emit event
      this.eventBus.emit('nft:claimed', {
        userId: currentUser.id
      });

      return {
        success: true
      };

    } catch (error: any) {
      console.error('Error claiming NFT:', error);
      return {
        success: false,
        error: error.message || 'Failed to claim NFT'
      };
    }
  }

  /**
   * Get the number of successful referrals
   * 
   * @returns Number of referrals
   */
  getReferralCount(): number {
    const referrals = this.stateManager.get('referrals');
    return referrals?.count || 0;
  }
}
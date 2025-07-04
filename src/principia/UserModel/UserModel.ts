/**
 * @module UserModel
 * @description Business logic for user operations in Principia.js
 * 
 * The UserModel orchestrates user-related actions, applying business rules
 * and coordinating between services and state management.
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
 * Configuration for UserModel
 */
export interface UserModelConfig {
  notionService: NotionService;
  stateManager: StateManager;
  eventBus: EventBus;
}

/**
 * User registration data
 */
export interface UserRegistrationData {
  name: string;
  email: string;
}

/**
 * User login credentials
 */
export interface UserCredentials {
  email: string;
}

/**
 * Result of user operations
 */
export interface UserOperationResult {
  success: boolean;
  user?: Participant;
  error?: string;
}

/**
 * Model for user business logic
 * 
 * @class UserModel
 */
export class UserModel {
  private notionService: NotionService;
  private stateManager: StateManager;
  private eventBus: EventBus;

  /**
   * Create a new UserModel instance
   * 
   * @param config Model configuration
   */
  constructor(config: UserModelConfig) {
    this.notionService = config.notionService;
    this.stateManager = config.stateManager;
    this.eventBus = config.eventBus;
  }

  /**
   * Register a new user
   * 
   * @param userData User registration data
   * @returns Operation result with created user or error
   */
  async register(userData: UserRegistrationData): Promise<UserOperationResult> {
    try {
      // Check if user already exists
      const existingUser = await this.notionService.getParticipantByEmail(userData.email);
      
      if (existingUser) {
        return {
          success: false,
          error: 'User with this email already exists'
        };
      }

      // Generate referral code
      const referralCode = this.generateReferralCode();

      // Create new participant
      const newUser = await this.notionService.createParticipant({
        ...userData,
        referralCode,
        points: 0,
        hasNFT: false
      });

      if (!newUser) {
        return {
          success: false,
          error: 'Failed to create user'
        };
      }

      // Update application state
      this.stateManager.update({
        'user': newUser,
        'auth.isAuthenticated': true
      });

      // Emit registration event
      this.eventBus.emit('user:registered', newUser);

      return {
        success: true,
        user: newUser
      };

    } catch (error: any) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.message || 'Registration failed'
      };
    }
  }

  /**
   * Login an existing user
   * 
   * @param credentials User credentials
   * @returns Operation result with user or error
   */
  async login(credentials: UserCredentials): Promise<UserOperationResult> {
    try {
      // Fetch user from Notion
      const user = await this.notionService.getParticipantByEmail(credentials.email);

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Update application state
      this.stateManager.update({
        'user': user,
        'auth.isAuthenticated': true
      });

      // Emit login event
      this.eventBus.emit('user:logged-in', user);

      return {
        success: true,
        user
      };

    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message || 'Login failed'
      };
    }
  }

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    // Clear user state
    this.stateManager.update({
      'user': null,
      'auth.isAuthenticated': false,
      'auth.token': null
    });

    // Emit logout event
    this.eventBus.emit('user:logged-out');
  }

  /**
   * Get the currently logged in user
   * 
   * @returns Current user or null
   */
  getCurrentUser(): Participant | null {
    return this.stateManager.get('user');
  }

  /**
   * Check if a user is currently authenticated
   * 
   * @returns True if authenticated
   */
  isAuthenticated(): boolean {
    return this.stateManager.get('auth.isAuthenticated') || false;
  }

  /**
   * Update user profile
   * 
   * @param updates Partial user data to update
   * @returns Operation result
   */
  async updateProfile(updates: Partial<Participant>): Promise<UserOperationResult> {
    try {
      const currentUser = this.getCurrentUser();

      if (!currentUser || !currentUser.id) {
        return {
          success: false,
          error: 'No user logged in'
        };
      }

      // Update in Notion
      const updateSuccess = await this.notionService.updateParticipant(
        currentUser.id,
        updates
      );

      if (!updateSuccess) {
        return {
          success: false,
          error: 'Failed to update profile'
        };
      }

      // Update local state
      const updatedUser = {
        ...currentUser,
        ...updates
      };

      this.stateManager.set('user', updatedUser);

      // Emit update event
      this.eventBus.emit('user:profile-updated', updates);

      return {
        success: true,
        user: updatedUser
      };

    } catch (error: any) {
      console.error('Profile update error:', error);
      return {
        success: false,
        error: error.message || 'Profile update failed'
      };
    }
  }

  /**
   * Generate a unique referral code
   * 
   * @private
   * @returns 6-character alphanumeric code
   */
  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return code;
  }
}
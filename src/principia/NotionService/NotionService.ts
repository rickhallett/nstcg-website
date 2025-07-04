/**
 * @module NotionService
 * @description Notion API integration service for Principia.js
 * 
 * This service handles all interactions with the Notion API,
 * transforming between the application's clean data models
 * and Notion's complex API structures.
 * 
 * Follows Principia.js architectural canon:
 * - Services are Sentinels (Anti-Corruption Layer)
 * - The Services isolate external dependencies
 */

import type { IService } from '../IService';
import type { ApiService, ApiResponse } from '../ApiService';

/**
 * Configuration for NotionService
 */
export interface NotionServiceConfig {
  apiService: ApiService;
  databaseId: string;
  apiKey: string;
  apiVersion?: string;
}

/**
 * Clean participant data model used by the application
 */
export interface Participant {
  id?: string;
  name: string;
  email: string;
  referralCode?: string;
  points?: number;
  hasNFT?: boolean;
}

/**
 * Notion-specific page structure
 */
interface NotionPage {
  id: string;
  properties: {
    [key: string]: any;
  };
}

/**
 * Notion database query response
 */
interface NotionQueryResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor?: string;
}

/**
 * Service for interacting with Notion API
 * 
 * @class NotionService
 * @implements {IService}
 */
export class NotionService implements IService {
  private apiService: ApiService;
  private databaseId: string;
  private apiKey: string;
  private apiVersion: string;
  private baseHeaders: Record<string, string>;

  /**
   * Create a new NotionService instance
   * 
   * @param config Service configuration
   */
  constructor(config: NotionServiceConfig) {
    this.apiService = config.apiService;
    this.databaseId = config.databaseId;
    this.apiKey = config.apiKey;
    this.apiVersion = config.apiVersion || '2022-06-28';
    
    // Set up base headers for all Notion API requests
    this.baseHeaders = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Notion-Version': this.apiVersion,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Start the service
   */
  async start(): Promise<void> {
    // NotionService doesn't need initialization
  }

  /**
   * Stop the service
   */
  async stop(): Promise<void> {
    // NotionService doesn't need cleanup
  }

  /**
   * Get a participant by email address
   * 
   * @param email Email address to search for
   * @returns Participant object or null if not found
   */
  async getParticipantByEmail(email: string): Promise<Participant | null> {
    try {
      const response = await this.apiService.post<NotionQueryResponse>(
        `/databases/${this.databaseId}/query`,
        {
          filter: {
            property: 'Email',
            email: {
              equals: email
            }
          }
        },
        {
          headers: this.baseHeaders
        }
      );

      if (!response.ok || !response.data || response.data.results.length === 0) {
        return null;
      }

      return this.transformNotionToParticipant(response.data.results[0]);
    } catch (error) {
      console.error('Error fetching participant by email:', error);
      return null;
    }
  }

  /**
   * Create a new participant in Notion
   * 
   * @param participant Participant data
   * @returns Created participant with ID or null on error
   */
  async createParticipant(participant: Participant): Promise<Participant | null> {
    try {
      const notionPayload = {
        parent: { database_id: this.databaseId },
        properties: {
          'Name': {
            title: [{
              text: { content: participant.name }
            }]
          },
          'Email': {
            email: participant.email
          },
          'Referral Code': {
            rich_text: [{
              text: { content: participant.referralCode || '' }
            }]
          },
          'Points': {
            number: participant.points || 0
          },
          'NFT': {
            checkbox: participant.hasNFT || false
          }
        }
      };

      const response = await this.apiService.post<NotionPage>(
        '/pages',
        notionPayload,
        {
          headers: this.baseHeaders
        }
      );

      if (!response.ok || !response.data) {
        return null;
      }

      return this.transformNotionToParticipant(response.data);
    } catch (error) {
      console.error('Error creating participant:', error);
      return null;
    }
  }

  /**
   * Update an existing participant
   * 
   * @param id Notion page ID
   * @param updates Partial participant data to update
   * @returns True if successful, false otherwise
   */
  async updateParticipant(id: string, updates: Partial<Participant>): Promise<boolean> {
    try {
      const properties: any = {};

      if (updates.name !== undefined) {
        properties['Name'] = {
          title: [{
            text: { content: updates.name }
          }]
        };
      }

      if (updates.email !== undefined) {
        properties['Email'] = {
          email: updates.email
        };
      }

      if (updates.referralCode !== undefined) {
        properties['Referral Code'] = {
          rich_text: [{
            text: { content: updates.referralCode }
          }]
        };
      }

      if (updates.points !== undefined) {
        properties['Points'] = {
          number: updates.points
        };
      }

      if (updates.hasNFT !== undefined) {
        properties['NFT'] = {
          checkbox: updates.hasNFT
        };
      }

      const response = await this.apiService.patch(
        `/pages/${id}`,
        { properties },
        {
          headers: this.baseHeaders
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error updating participant:', error);
      return false;
    }
  }

  /**
   * Get leaderboard sorted by points
   * 
   * @param limit Maximum number of participants to return
   * @returns Array of participants sorted by points (descending)
   */
  async getLeaderboard(limit: number = 100): Promise<Participant[]> {
    try {
      const response = await this.apiService.post<NotionQueryResponse>(
        `/databases/${this.databaseId}/query`,
        {
          sorts: [{
            property: 'Points',
            direction: 'descending'
          }],
          page_size: Math.min(limit, 100) // Notion API limit
        },
        {
          headers: this.baseHeaders
        }
      );

      if (!response.ok || !response.data) {
        return [];
      }

      return response.data.results.map(page => 
        this.transformNotionToParticipant(page)
      );
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  /**
   * Transform Notion page data to clean participant object
   * 
   * @private
   * @param page Notion page object
   * @returns Clean participant object
   */
  private transformNotionToParticipant(page: NotionPage): Participant {
    const props = page.properties;
    
    return {
      id: page.id,
      name: this.extractTextFromProperty(props['Name']?.title),
      email: props['Email']?.email || '',
      referralCode: this.extractTextFromProperty(props['Referral Code']?.rich_text),
      points: props['Points']?.number || 0,
      hasNFT: props['NFT']?.checkbox || false
    };
  }

  /**
   * Extract plain text from Notion text property
   * 
   * @private
   * @param textArray Array of Notion text objects
   * @returns Plain text string
   */
  private extractTextFromProperty(textArray?: any[]): string {
    if (!textArray || !Array.isArray(textArray) || textArray.length === 0) {
      return '';
    }
    
    return textArray
      .map(text => text.plain_text || text.text?.content || '')
      .join('');
  }
}
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { NotionService } from './NotionService';
import { ApiService } from '../ApiService';
import { EventBus } from '../EventBus';
import { LoggerService } from '../LoggerService';

// Mock ApiService methods
const mockGet = mock();
const mockPost = mock();
const mockPatch = mock();

// Create mock ApiService
class MockApiService extends ApiService {
  get = mockGet;
  post = mockPost;
  patch = mockPatch;
}

describe('NotionService', () => {
  let notionService: NotionService;
  let apiService: ApiService;
  let eventBus: EventBus;
  let logger: LoggerService;

  beforeEach(() => {
    // Reset singletons
    EventBus._resetInstance();
    LoggerService._resetInstance();
    
    // Initialize services
    eventBus = EventBus.getInstance();
    logger = LoggerService.getInstance();
    apiService = new MockApiService({ eventBus, logger });
    
    // Create NotionService with mock config
    notionService = new NotionService({
      apiService,
      databaseId: 'test-database-id',
      apiKey: 'test-api-key',
      apiVersion: '2022-06-28'
    });
    
    // Reset mocks
    mockGet.mockReset();
    mockPost.mockReset();
    mockPatch.mockReset();
  });

  describe('constructor', () => {
    it('should initialize with required configuration', () => {
      expect(notionService).toBeDefined();
    });

    it('should set up API headers with authentication', () => {
      // This is tested indirectly through the API calls
      expect(notionService).toBeDefined();
    });
  });

  describe('IService implementation', () => {
    it('should implement IService interface', () => {
      expect(notionService.start).toBeDefined();
      expect(notionService.stop).toBeDefined();
    });

    it('should start successfully', async () => {
      await expect(notionService.start()).resolves.toBeUndefined();
    });

    it('should stop successfully', async () => {
      await notionService.start();
      await expect(notionService.stop()).resolves.toBeUndefined();
    });
  });

  describe('getParticipantByEmail', () => {
    it('should query database with email filter', async () => {
      const mockResponse = {
        data: {
          results: [],
          has_more: false
        },
        ok: true,
        status: 200
      };
      
      mockPost.mockResolvedValueOnce(mockResponse);
      
      const result = await notionService.getParticipantByEmail('test@example.com');
      
      expect(mockPost).toHaveBeenCalledWith(
        '/databases/test-database-id/query',
        expect.objectContaining({
          filter: {
            property: 'Email',
            email: {
              equals: 'test@example.com'
            }
          }
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Notion-Version': '2022-06-28'
          })
        })
      );
    });

    it('should return null when no participant found', async () => {
      mockPost.mockResolvedValueOnce({
        data: {
          results: [],
          has_more: false
        },
        ok: true,
        status: 200
      });
      
      const result = await notionService.getParticipantByEmail('notfound@example.com');
      
      expect(result).toBeNull();
    });

    it('should transform Notion response to participant object', async () => {
      const notionResponse = {
        id: 'page-123',
        properties: {
          'Name': {
            title: [{ plain_text: 'John Doe' }]
          },
          'Email': {
            email: 'john@example.com'
          },
          'Referral Code': {
            rich_text: [{ plain_text: 'REF123' }]
          },
          'Points': {
            number: 100
          },
          'NFT': {
            checkbox: true
          }
        }
      };
      
      mockPost.mockResolvedValueOnce({
        data: {
          results: [notionResponse],
          has_more: false
        },
        ok: true,
        status: 200
      });
      
      const result = await notionService.getParticipantByEmail('john@example.com');
      
      expect(result).toEqual({
        id: 'page-123',
        name: 'John Doe',
        email: 'john@example.com',
        referralCode: 'REF123',
        points: 100,
        hasNFT: true
      });
    });

    it('should handle API errors', async () => {
      mockPost.mockResolvedValueOnce({
        data: null,
        ok: false,
        status: 400,
        error: {
          message: 'Invalid request'
        }
      });
      
      const result = await notionService.getParticipantByEmail('test@example.com');
      
      expect(result).toBeNull();
    });
  });

  describe('createParticipant', () => {
    it('should create page with participant data', async () => {
      const participant = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        referralCode: 'REF456'
      };
      
      const notionResponse = {
        id: 'page-456',
        properties: {
          'Name': {
            title: [{ plain_text: 'Jane Smith' }]
          },
          'Email': {
            email: 'jane@example.com'
          },
          'Referral Code': {
            rich_text: [{ plain_text: 'REF456' }]
          },
          'Points': {
            number: 0
          },
          'NFT': {
            checkbox: false
          }
        }
      };
      
      mockPost.mockResolvedValueOnce({
        data: notionResponse,
        ok: true,
        status: 200
      });
      
      const result = await notionService.createParticipant(participant);
      
      expect(mockPost).toHaveBeenCalledWith(
        '/pages',
        expect.objectContaining({
          parent: { database_id: 'test-database-id' },
          properties: {
            'Name': {
              title: [{ text: { content: 'Jane Smith' } }]
            },
            'Email': {
              email: 'jane@example.com'
            },
            'Referral Code': {
              rich_text: [{ text: { content: 'REF456' } }]
            },
            'Points': {
              number: 0
            },
            'NFT': {
              checkbox: false
            }
          }
        }),
        expect.any(Object)
      );
      
      expect(result).toEqual({
        id: 'page-456',
        name: 'Jane Smith',
        email: 'jane@example.com',
        referralCode: 'REF456',
        points: 0,
        hasNFT: false
      });
    });

    it('should set default values for optional fields', async () => {
      const participant = {
        name: 'Min User',
        email: 'min@example.com'
      };
      
      mockPost.mockResolvedValueOnce({
        data: { id: 'page-789' },
        ok: true,
        status: 200
      });
      
      await notionService.createParticipant(participant);
      
      expect(mockPost).toHaveBeenCalledWith(
        '/pages',
        expect.objectContaining({
          properties: expect.objectContaining({
            'Points': { number: 0 },
            'NFT': { checkbox: false }
          })
        }),
        expect.any(Object)
      );
    });

    it('should handle creation errors', async () => {
      mockPost.mockResolvedValueOnce({
        data: null,
        ok: false,
        status: 400,
        error: {
          message: 'Invalid properties'
        }
      });
      
      const result = await notionService.createParticipant({
        name: 'Test',
        email: 'test@example.com'
      });
      
      expect(result).toBeNull();
    });
  });

  describe('updateParticipant', () => {
    it('should update participant properties', async () => {
      const updates = {
        points: 150,
        hasNFT: true
      };
      
      mockPatch.mockResolvedValueOnce({
        data: { id: 'page-123' },
        ok: true,
        status: 200
      });
      
      const result = await notionService.updateParticipant('page-123', updates);
      
      expect(mockPatch).toHaveBeenCalledWith(
        '/pages/page-123',
        expect.objectContaining({
          properties: {
            'Points': { number: 150 },
            'NFT': { checkbox: true }
          }
        }),
        expect.any(Object)
      );
      
      expect(result).toBe(true);
    });

    it('should handle partial updates', async () => {
      mockPatch.mockResolvedValueOnce({
        data: { id: 'page-123' },
        ok: true,
        status: 200
      });
      
      await notionService.updateParticipant('page-123', { points: 200 });
      
      expect(mockPatch).toHaveBeenCalledWith(
        '/pages/page-123',
        expect.objectContaining({
          properties: {
            'Points': { number: 200 }
          }
        }),
        expect.any(Object)
      );
    });

    it('should return false on update error', async () => {
      mockPatch.mockResolvedValueOnce({
        data: null,
        ok: false,
        status: 404,
        error: {
          message: 'Page not found'
        }
      });
      
      const result = await notionService.updateParticipant('page-123', { points: 100 });
      
      expect(result).toBe(false);
    });
  });

  describe('getLeaderboard', () => {
    it('should query database sorted by points', async () => {
      mockPost.mockResolvedValueOnce({
        data: {
          results: [],
          has_more: false
        },
        ok: true,
        status: 200
      });
      
      await notionService.getLeaderboard(10);
      
      expect(mockPost).toHaveBeenCalledWith(
        '/databases/test-database-id/query',
        expect.objectContaining({
          sorts: [{
            property: 'Points',
            direction: 'descending'
          }],
          page_size: 10
        }),
        expect.any(Object)
      );
    });

    it('should return transformed participant list', async () => {
      const notionResults = [
        {
          id: 'page-1',
          properties: {
            'Name': { title: [{ plain_text: 'Top User' }] },
            'Email': { email: 'top@example.com' },
            'Referral Code': { rich_text: [{ plain_text: 'TOP1' }] },
            'Points': { number: 500 },
            'NFT': { checkbox: true }
          }
        },
        {
          id: 'page-2',
          properties: {
            'Name': { title: [{ plain_text: 'Second User' }] },
            'Email': { email: 'second@example.com' },
            'Referral Code': { rich_text: [{ plain_text: 'SEC2' }] },
            'Points': { number: 300 },
            'NFT': { checkbox: false }
          }
        }
      ];
      
      mockPost.mockResolvedValueOnce({
        data: {
          results: notionResults,
          has_more: false
        },
        ok: true,
        status: 200
      });
      
      const result = await notionService.getLeaderboard(10);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'page-1',
        name: 'Top User',
        email: 'top@example.com',
        referralCode: 'TOP1',
        points: 500,
        hasNFT: true
      });
    });

    it('should handle empty results', async () => {
      mockPost.mockResolvedValueOnce({
        data: {
          results: [],
          has_more: false
        },
        ok: true,
        status: 200
      });
      
      const result = await notionService.getLeaderboard(10);
      
      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      mockPost.mockResolvedValueOnce({
        data: null,
        ok: false,
        status: 500,
        error: {
          message: 'Server error'
        }
      });
      
      const result = await notionService.getLeaderboard(10);
      
      expect(result).toEqual([]);
    });
  });

  describe('transformNotionToParticipant', () => {
    it('should handle missing properties gracefully', async () => {
      const notionPage = {
        id: 'page-incomplete',
        properties: {
          'Name': { title: [] }, // Empty title array
          'Email': { email: null },
          'Points': { number: null }
        }
      };
      
      // Create a mock database query that returns this
      mockPost.mockResolvedValueOnce({
        data: {
          results: [notionPage],
          has_more: false
        },
        ok: true,
        status: 200
      });
      
      const result = await notionService.getParticipantByEmail('test@example.com');
      
      expect(result).toEqual({
        id: 'page-incomplete',
        name: '',
        email: '',
        referralCode: '',
        points: 0,
        hasNFT: false
      });
    });
  });
});
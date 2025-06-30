[<- Back to Index](./000_master_blueprint.md)

# Blueprint: NotionService.js

**Objective:** To encapsulate all communication with the Notion API.

**Test Specification:** `tests/services/NotionService.test.js`

```javascript
import { NotionService } from '../../js/services/NotionService.js';
import { ApiService } from '../../js/services/ApiService.js';
import { expect } from '../../js/testing/expect.js';
import { describe, it, beforeEach, mockFn } from '../../js/testing/veritas.js';

// Mock the ApiService module so NotionService uses our mock
jest.mock('../../js/services/ApiService.js'); // Assuming Jest-style mocking capability in Veritas

describe('NotionService', () => {
  let notionService;
  let mockApiServiceInstance;

  beforeEach(() => {
    // Reset the mock before each test
    ApiService.mockClear();
    notionService = new NotionService({
      apiKey: 'test-key',
      databaseId: 'test-db'
    });
    // Get the instance that the NotionService created
    mockApiServiceInstance = ApiService.mock.instances[0];
  });

  // == Data Transformation (The Anti-Corruption Layer) ==
  describe('Data Transformation', () => {
    it('should transform a complex Notion page object into a clean user object', () => {
      const notionPage = {
        id: 'page123',
        properties: {
          'Name': { title: [{ text: { content: 'John Doe' } }] },
          'Email': { email: 'john@test.com' },
          'First Name': { rich_text: [{ text: { content: 'John' } }] }
          // ... other complex Notion properties
        }
      };
      const cleanUser = notionService._transformNotionPageToUser(notionPage);
      expect(cleanUser).toEqual({
        id: 'page123',
        name: 'John Doe',
        email: 'john@test.com',
        firstName: 'John'
      });
    });

    it('should transform a simple user object into the complex structure Notion API expects for creation', () => {
      const cleanUser = { name: 'Jane Doe', email: 'jane@test.com' };
      const notionPayload = notionService._transformUserToNotionProperties(cleanUser);
      expect(notionPayload).toEqual({
        parent: { database_id: 'test-db' },
        properties: {
          'Name': { title: [{ text: { content: 'Jane Doe' } }] },
          'Email': { email: 'jane@test.com' }
        }
      });
    });
  });

  // == Service Methods ==
  describe('Service Methods', () => {
    it('should call the ApiService POST method with the correct endpoint and payload when creating a participant', async () => {
      const mockPost = mockFn().mockResolvedValue({ id: 'page456' });
      mockApiServiceInstance.post = mockPost;

      const user = { name: 'Test User', email: 'test@user.com' };
      await notionService.createParticipant(user);
      
      const expectedEndpoint = '/pages';
      const expectedPayload = notionService._transformUserToNotionProperties(user);
      
      expect(mockPost).toHaveBeenCalledWith(expectedEndpoint, expectedPayload);
    });

    it('should call the ApiService POST method to query the database when getting a participant by email', async () => {
      const mockPost = mockFn().mockResolvedValue({ results: [] });
      mockApiServiceInstance.post = mockPost;
      
      const email = 'findme@test.com';
      await notionService.getParticipantByEmail(email);

      const expectedEndpoint = '/databases/test-db/query';
      const expectedPayload = {
        filter: {
          property: 'Email',
          email: { equals: email }
        }
      };

      expect(mockPost).toHaveBeenCalledWith(expectedEndpoint, expectedPayload);
    });

    it('should return a transformed user object on successful query', async () => {
      const notionPage = { /* ... complex notion object ... */ };
      mockApiServiceInstance.post = mockFn().mockResolvedValue({ results: [notionPage] });

      const user = await notionService.getParticipantByEmail('test@test.com');
      expect(user).not.toBeNull();
      expect(user.id).toBe(notionPage.id);
    });
    
    it('should return null if getParticipantByEmail finds no user', async () => {
      mockApiServiceInstance.post = mockFn().mockResolvedValue({ results: [] });
      const user = await notionService.getParticipantByEmail('notfound@test.com');
      expect(user).toBeNull();
    });
  });
});
```

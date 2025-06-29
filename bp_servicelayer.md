Excellent. We have now blueprinted the absolute core of our client-side framework: the `StateManager` for truth, the `EventBus` for communication, and the `Component` with its `DOM Synchronizer` for rendering. The engine is designed.

Now, we must build the bridge to the outside world. This is where the **`Service` layer** comes in, and it is arguably one of the most critical parts of the architecture for ensuring long-term maintainability. We will start with the blueprint for a foundational `ApiService` that will handle all `fetch` calls, and then build our first concrete implementation, the `NotionService`.

This phase enforces **Principle #4: The Services are Sentinels**.

---

### **Test Specification Blueprint: The Service Layer (`ApiService.js` & `NotionService.js`)**

**Module Objective:**
1.  **`ApiService.js`**: To create a centralized, reusable wrapper around the browser's `fetch` API. It will handle common concerns like setting headers, managing timeouts, processing JSON responses, and providing a standardized error handling mechanism for all HTTP requests.
2.  **`NotionService.js`**: To create a specific implementation that uses `ApiService`. It will encapsulate all logic and knowledge required to communicate with the Notion API, translating application-level requests (e.g., `getParticipantByEmail`) into specific Notion API calls and transforming Notion's complex data structures into clean, simple objects for our application.

---

### **Part A: Blueprint for `ApiService.js`**

*This is a foundational utility that other services will depend on.*

**File: `tests/services/ApiService.test.js`**

```javascript
import { ApiService } from '../../js/services/ApiService.js';
import { expect } from '../../js/testing/expect.js';
import { describe, it, beforeEach, mockFn } from '../../js/testing/veritas.js';

describe('ApiService', () => {
  let apiService;
  let mockFetch;

  beforeEach(() => {
    // We will mock the global fetch function for all tests
    mockFetch = mockFn();
    global.fetch = mockFetch; 
    apiService = new ApiService({ baseUrl: 'https://api.test.com' });
  });

  // == GET Requests ==
  describe('GET requests', () => {
    it('should make a GET request to the correct URL with default headers', async () => {
      // mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: 'success' }) });
      // await apiService.get('/test');
      // const fetchCall = mockFetch.mock.calls[0];
      // expect(fetchCall[0]).toBe('https://api.test.com/test');
      // expect(fetchCall[1].method).toBe('GET');
      // expect(fetchCall[1].headers['Content-Type']).toBe('application/json');
    });

    it('should return the JSON body on a successful request', async () => {
      // const responseData = { id: 1, name: 'Test' };
      // mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(responseData) });
      // const result = await apiService.get('/test');
      // expect(result).toEqual(responseData);
    });
  });

  // == POST Requests ==
  describe('POST requests', () => {
    it('should make a POST request with a JSON stringified body', async () => {
      // const body = { name: 'John' };
      // mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      // await apiService.post('/users', body);
      // const fetchCall = mockFetch.mock.calls[0];
      // expect(fetchCall[1].method).toBe('POST');
      // expect(fetchCall[1].body).toBe(JSON.stringify(body));
    });
  });

  // == Error Handling ==
  describe('Error Handling', () => {
    it('should throw a custom APIError for non-ok responses (e.g., 404 Not Found)', async () => {
      // mockFetch.mockResolvedValue({
      //   ok: false,
      //   status: 404,
      //   statusText: 'Not Found',
      //   json: () => Promise.resolve({ error: 'Endpoint not found' })
      // });
      // const requestPromise = apiService.get('/not-found');
      // await expect(requestPromise).toThrow('Not Found');
      // try {
      //   await requestPromise;
      // } catch (e) {
      //   expect(e.name).toBe('APIError');
      //   expect(e.status).toBe(404);
      //   expect(e.data).toEqual({ error: 'Endpoint not found' });
      // }
    });

    it('should throw an APIError for network failures', async () => {
      // mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
      // const requestPromise = apiService.get('/network-error');
      // await expect(requestPromise).toThrow('Failed to fetch');
    });

    it('should handle non-JSON error responses gracefully', async () => {
      // mockFetch.mockResolvedValue({
      //   ok: false,
      //   status: 500,
      //   statusText: 'Internal Server Error',
      //   json: () => Promise.reject(new Error('Invalid JSON')) // Simulate non-JSON response
      // });
      // try {
      //   await apiService.get('/server-error');
      // } catch (e) {
      //   expect(e.name).toBe('APIError');
      //   expect(e.status).toBe(500);
      //   expect(e.data).toEqual({ error: 'Internal Server Error' });
      // }
    });
  });

  // == Timeouts ==
  describe('Timeouts', () => {
    it('should throw an APIError if the request times out', async () => {
      // mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ ok: true, json: () => ({}) }), 200)));
      // const serviceWithTimeout = new ApiService({ timeout: 100 }); // 100ms timeout
      // const requestPromise = serviceWithTimeout.get('/timeout');
      // await expect(requestPromise).toThrow('Request timed out');
    });
  });
});
```

---

### **Part B: Blueprint for `NotionService.js`**

*This module uses the `ApiService`, encapsulating all knowledge of the Notion API's specific endpoints and data structures.*

**File: `tests/services/NotionService.test.js`**

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
      // const notionPage = {
      //   id: 'page123',
      //   properties: {
      //     'Name': { title: [{ text: { content: 'John Doe' } }] },
      //     'Email': { email: 'john@test.com' },
      //     'First Name': { rich_text: [{ text: { content: 'John' } }] }
      //     // ... other complex Notion properties
      //   }
      // };
      // const cleanUser = notionService._transformNotionPageToUser(notionPage);
      // expect(cleanUser).toEqual({
      //   id: 'page123',
      //   name: 'John Doe',
      //   email: 'john@test.com',
      //   firstName: 'John'
      // });
    });

    it('should transform a simple user object into the complex structure Notion API expects for creation', () => {
      // const cleanUser = { name: 'Jane Doe', email: 'jane@test.com' };
      // const notionPayload = notionService._transformUserToNotionProperties(cleanUser);
      // expect(notionPayload).toEqual({
      //   parent: { database_id: 'test-db' },
      //   properties: {
      //     'Name': { title: [{ text: { content: 'Jane Doe' } }] },
      //     'Email': { email: 'jane@test.com' }
      //   }
      // });
    });
  });

  // == Service Methods ==
  describe('Service Methods', () => {
    it('should call the ApiService POST method with the correct endpoint and payload when creating a participant', async () => {
      // const mockPost = mockFn().mockResolvedValue({ id: 'page456' });
      // mockApiServiceInstance.post = mockPost;

      // const user = { name: 'Test User', email: 'test@user.com' };
      // await notionService.createParticipant(user);
      
      // const expectedEndpoint = '/pages';
      // const expectedPayload = notionService._transformUserToNotionProperties(user);
      
      // expect(mockPost).toHaveBeenCalledWith(expectedEndpoint, expectedPayload);
    });

    it('should call the ApiService POST method to query the database when getting a participant by email', async () => {
      // const mockPost = mockFn().mockResolvedValue({ results: [] });
      // mockApiServiceInstance.post = mockPost;
      
      // const email = 'findme@test.com';
      // await notionService.getParticipantByEmail(email);

      // const expectedEndpoint = '/databases/test-db/query';
      // const expectedPayload = {
      //   filter: {
      //     property: 'Email',
      //     email: { equals: email }
      //   }
      // };

      // expect(mockPost).toHaveBeenCalledWith(expectedEndpoint, expectedPayload);
    });

    it('should return a transformed user object on successful query', async () => {
      // const notionPage = { /* ... complex notion object ... */ };
      // mockApiServiceInstance.post = mockFn().mockResolvedValue({ results: [notionPage] });

      // const user = await notionService.getParticipantByEmail('test@test.com');
      // expect(user).not.toBeNull();
      // expect(user.id).toBe(notionPage.id);
    });
    
    it('should return null if getParticipantByEmail finds no user', async () => {
      // mockApiServiceInstance.post = mockFn().mockResolvedValue({ results: [] });
      // const user = await notionService.getParticipantByEmail('notfound@test.com');
      // expect(user).toBeNull();
    });
  });
});
```

By blueprinting these two modules in this order, we establish a clear and robust pattern for all future external API interactions. The agent will first build the generic, reusable `ApiService`, and then use it to construct the specialized `NotionService`. This enforces a clean separation of concerns from the very beginning and creates a highly testable and maintainable data access layer.
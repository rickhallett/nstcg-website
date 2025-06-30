[<- Back to Index](./000_master_blueprint.md)

# Blueprint: ApiService.js

**Objective:** To create a centralized wrapper around the `fetch` API.

**Test Specification:** `tests/services/ApiService.test.js`

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
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: 'success' }) });
      await apiService.get('/test');
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toBe('https://api.test.com/test');
      expect(fetchCall[1].method).toBe('GET');
      expect(fetchCall[1].headers['Content-Type']).toBe('application/json');
    });

    it('should return the JSON body on a successful request', async () => {
      const responseData = { id: 1, name: 'Test' };
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(responseData) });
      const result = await apiService.get('/test');
      expect(result).toEqual(responseData);
    });
  });

  // == POST Requests ==
  describe('POST requests', () => {
    it('should make a POST request with a JSON stringified body', async () => {
      const body = { name: 'John' };
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      await apiService.post('/users', body);
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[1].method).toBe('POST');
      expect(fetchCall[1].body).toBe(JSON.stringify(body));
    });
  });

  // == Error Handling ==
  describe('Error Handling', () => {
    it('should throw a custom APIError for non-ok responses (e.g., 404 Not Found)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'Endpoint not found' })
      });
      const requestPromise = apiService.get('/not-found');
      await expect(requestPromise).toThrow('Not Found');
      try {
        await requestPromise;
      } catch (e) {
        expect(e.name).toBe('APIError');
        expect(e.status).toBe(404);
        expect(e.data).toEqual({ error: 'Endpoint not found' });
      }
    });

    it('should throw an APIError for network failures', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
      const requestPromise = apiService.get('/network-error');
      await expect(requestPromise).toThrow('Failed to fetch');
    });

    it('should handle non-JSON error responses gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('Invalid JSON')) // Simulate non-JSON response
      });
      try {
        await apiService.get('/server-error');
      } catch (e) {
        expect(e.name).toBe('APIError');
        expect(e.status).toBe(500);
        expect(e.data).toEqual({ error: 'Internal Server Error' });
      }
    });
  });

  // == Timeouts ==
  describe('Timeouts', () => {
    it('should throw an APIError if the request times out', async () => {
      mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ ok: true, json: () => ({}) }), 200)));
      const serviceWithTimeout = new ApiService({ timeout: 100 }); // 100ms timeout
      const requestPromise = serviceWithTimeout.get('/timeout');
      await expect(requestPromise).toThrow('Request timed out');
    });
  });
});
```

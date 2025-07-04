import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { ApiService } from './ApiService';
import { EventBus } from '../EventBus';
import { LoggerService } from '../LoggerService';
import type { IService } from '../IService';

// Mock global fetch
const mockFetch = mock();
globalThis.fetch = mockFetch;

describe('ApiService', () => {
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
    
    // Create ApiService instance
    apiService = new ApiService({ eventBus, logger });
    
    // Reset fetch mock
    mockFetch.mockReset();
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const service = new ApiService({ eventBus, logger });
      expect(service).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const config = {
        baseURL: 'https://api.example.com',
        timeout: 5000,
        headers: {
          'X-Custom-Header': 'value'
        }
      };
      
      const service = new ApiService({ eventBus, logger, ...config });
      expect(service).toBeDefined();
    });
  });

  describe('IService implementation', () => {
    it('should implement IService interface', () => {
      expect(apiService.start).toBeDefined();
      expect(apiService.stop).toBeDefined();
    });

    it('should start successfully', async () => {
      await expect(apiService.start()).resolves.toBeUndefined();
    });

    it('should stop successfully', async () => {
      await apiService.start();
      await expect(apiService.stop()).resolves.toBeUndefined();
    });
  });

  describe('get', () => {
    it('should make GET request with correct URL', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
      
      await apiService.get('/test-endpoint');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test-endpoint'),
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should include default headers', async () => {
      mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));
      
      await apiService.get('/test');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should merge custom headers', async () => {
      mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));
      
      await apiService.get('/test', {
        headers: { 'X-Custom': 'value' }
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Custom': 'value'
          })
        })
      );
    });

    it('should handle query parameters', async () => {
      mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));
      
      await apiService.get('/test', {
        params: { foo: 'bar', baz: 42 }
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test?foo=bar&baz=42'),
        expect.any(Object)
      );
    });

    it('should return parsed JSON response', async () => {
      const responseData = { id: 1, name: 'Test' };
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
      
      const result = await apiService.get('/test');
      
      expect(result.data).toEqual(responseData);
      expect(result.status).toBe(200);
      expect(result.ok).toBe(true);
    });

    it('should handle non-JSON responses', async () => {
      const textResponse = 'Plain text response';
      mockFetch.mockResolvedValueOnce(new Response(textResponse, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      }));
      
      const result = await apiService.get('/test');
      
      expect(result.data).toBe(textResponse);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await apiService.get('/test');
      
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Network error');
    });

    it('should handle timeout', async () => {
      // Mock fetch to simulate a slow response that gets aborted
      mockFetch.mockImplementationOnce((url, config) => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            resolve(new Response('{}', { status: 200 }));
          }, 1000); // Response would come after 1 second
          
          // Listen for abort signal
          if (config?.signal) {
            config.signal.addEventListener('abort', () => {
              clearTimeout(timeout);
              reject(new DOMException('The operation was aborted', 'AbortError'));
            });
          }
        });
      });
      
      const service = new ApiService({ eventBus, logger, timeout: 100 });
      const result = await service.get('/test');
      
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain('timeout');
    });

    it('should emit api:error event on failure', async () => {
      const errorHandler = mock();
      eventBus.on('api:error', errorHandler);
      
      mockFetch.mockRejectedValueOnce(new Error('API Error'));
      
      await apiService.get('/test');
      
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: '/test',
          method: 'GET',
          error: expect.any(Object)
        })
      );
    });
  });

  describe('post', () => {
    it('should make POST request with body', async () => {
      mockFetch.mockResolvedValueOnce(new Response('{"success":true}', { status: 201 }));
      
      const body = { name: 'Test', value: 123 };
      await apiService.post('/test', body);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body)
        })
      );
    });

    it('should handle FormData body', async () => {
      mockFetch.mockResolvedValueOnce(new Response('{"success":true}', { status: 201 }));
      
      const formData = new FormData();
      formData.append('file', 'test');
      
      await apiService.post('/upload', formData);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: formData
        })
      );
    });

    it('should return created resource', async () => {
      const createdResource = { id: 1, name: 'New Resource' };
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(createdResource), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }));
      
      const result = await apiService.post('/resources', { name: 'New Resource' });
      
      expect(result.status).toBe(201);
      expect(result.data).toEqual(createdResource);
    });
  });

  describe('put', () => {
    it('should make PUT request with body', async () => {
      mockFetch.mockResolvedValueOnce(new Response('{"updated":true}', { status: 200 }));
      
      const updateData = { name: 'Updated' };
      await apiService.put('/resource/1', updateData);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/resource/1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData)
        })
      );
    });
  });

  describe('patch', () => {
    it('should make PATCH request with partial body', async () => {
      mockFetch.mockResolvedValueOnce(new Response('{"patched":true}', { status: 200 }));
      
      const patchData = { status: 'active' };
      await apiService.patch('/resource/1', patchData);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/resource/1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(patchData)
        })
      );
    });
  });

  describe('delete', () => {
    it('should make DELETE request', async () => {
      mockFetch.mockResolvedValueOnce(new Response('', { status: 204 }));
      
      await apiService.delete('/resource/1');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/resource/1'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should handle 204 No Content response', async () => {
      mockFetch.mockResolvedValueOnce(new Response('', { status: 204 }));
      
      const result = await apiService.delete('/resource/1');
      
      expect(result.status).toBe(204);
      expect(result.ok).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('request interceptors', () => {
    it('should support request interceptors', async () => {
      const interceptor = mock((config: any) => {
        config.headers['X-Intercepted'] = 'true';
        return config;
      });
      
      apiService.addRequestInterceptor(interceptor);
      
      mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));
      await apiService.get('/test');
      
      expect(interceptor).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Intercepted': 'true'
          })
        })
      );
    });

    it('should chain multiple request interceptors', async () => {
      apiService.addRequestInterceptor((config) => {
        config.headers['X-First'] = '1';
        return config;
      });
      
      apiService.addRequestInterceptor((config) => {
        config.headers['X-Second'] = '2';
        return config;
      });
      
      mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));
      await apiService.get('/test');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-First': '1',
            'X-Second': '2'
          })
        })
      );
    });
  });

  describe('response interceptors', () => {
    it('should support response interceptors', async () => {
      const interceptor = mock((response: any) => {
        response.intercepted = true;
        return response;
      });
      
      apiService.addResponseInterceptor(interceptor);
      
      mockFetch.mockResolvedValueOnce(new Response('{"data":"test"}', { status: 200 }));
      const result = await apiService.get('/test');
      
      expect(interceptor).toHaveBeenCalled();
      expect(result.intercepted).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle 4xx errors', async () => {
      mockFetch.mockResolvedValueOnce(new Response('{"error":"Bad Request"}', {
        status: 400,
        statusText: 'Bad Request'
      }));
      
      const result = await apiService.get('/test');
      
      expect(result.ok).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error).toBeDefined();
    });

    it('should handle 5xx errors', async () => {
      mockFetch.mockResolvedValueOnce(new Response('Server Error', {
        status: 500,
        statusText: 'Internal Server Error'
      }));
      
      const result = await apiService.get('/test');
      
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error).toBeDefined();
    });

    it('should log errors', async () => {
      const errorSpy = mock();
      logger.error = errorSpy;
      
      mockFetch.mockRejectedValueOnce(new Error('Test error'));
      
      await apiService.get('/test');
      
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('API request failed'),
        expect.any(Object)
      );
    });
  });

  describe('baseURL', () => {
    it('should prepend baseURL to relative paths', async () => {
      const service = new ApiService({
        eventBus,
        logger,
        baseURL: 'https://api.example.com/v1'
      });
      
      mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));
      await service.get('/users');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/users',
        expect.any(Object)
      );
    });

    it('should not prepend baseURL to absolute URLs', async () => {
      const service = new ApiService({
        eventBus,
        logger,
        baseURL: 'https://api.example.com'
      });
      
      mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));
      await service.get('https://other-api.com/data');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://other-api.com/data',
        expect.any(Object)
      );
    });
  });

  describe('abort/cancel', () => {
    it('should support request cancellation', async () => {
      const controller = new AbortController();
      
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new Error('AbortError'));
          });
        })
      );
      
      const promise = apiService.get('/test', { signal: controller.signal });
      controller.abort();
      
      const result = await promise;
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain('AbortError');
    });
  });
});
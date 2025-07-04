/**
 * @module ApiService
 * @description Generic HTTP service wrapper for Principia.js
 * 
 * Provides a standardized interface for making HTTP requests with:
 * - Automatic error handling
 * - Request/response interceptors
 * - Timeout management
 * - Event emission for errors
 * - Consistent response format
 * 
 * Follows Principia.js architectural canon:
 * - Services are Sentinels
 * - Events are the Messengers
 */

import type { IService } from '../IService';
import type { EventBus } from '../EventBus';
import type { LoggerService } from '../LoggerService';

/**
 * Configuration options for ApiService
 */
export interface ApiServiceConfig {
  eventBus: EventBus;
  logger: LoggerService;
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * Request configuration options
 */
export interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  signal?: AbortSignal;
  timeout?: number;
}

/**
 * Standardized API response format
 */
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText?: string;
  headers?: Headers;
  ok: boolean;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

/**
 * Request interceptor function type
 */
type RequestInterceptor = (config: any) => any | Promise<any>;

/**
 * Response interceptor function type
 */
type ResponseInterceptor = (response: ApiResponse) => ApiResponse | Promise<ApiResponse>;

/**
 * Generic API service for making HTTP requests
 * 
 * @class ApiService
 * @implements {IService}
 */
export class ApiService implements IService {
  private eventBus: EventBus;
  private logger: LoggerService;
  private baseURL: string;
  private timeout: number;
  private defaultHeaders: Record<string, string>;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  /**
   * Create a new ApiService instance
   * 
   * @param config Service configuration
   */
  constructor(config: ApiServiceConfig) {
    this.eventBus = config.eventBus;
    this.logger = config.logger;
    this.baseURL = config.baseURL || '';
    this.timeout = config.timeout || 30000; // 30 seconds default
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers
    };
  }

  /**
   * Start the service
   */
  async start(): Promise<void> {
    this.logger.info('ApiService started');
  }

  /**
   * Stop the service
   */
  async stop(): Promise<void> {
    this.logger.info('ApiService stopped');
  }

  /**
   * Add a request interceptor
   * 
   * @param interceptor Function to process requests before sending
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add a response interceptor
   * 
   * @param interceptor Function to process responses before returning
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Make a GET request
   * 
   * @param endpoint The API endpoint
   * @param config Request configuration
   * @returns Promise resolving to ApiResponse
   */
  async get<T = any>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, config);
  }

  /**
   * Make a POST request
   * 
   * @param endpoint The API endpoint
   * @param data Request body data
   * @param config Request configuration
   * @returns Promise resolving to ApiResponse
   */
  async post<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, data, config);
  }

  /**
   * Make a PUT request
   * 
   * @param endpoint The API endpoint
   * @param data Request body data
   * @param config Request configuration
   * @returns Promise resolving to ApiResponse
   */
  async put<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, data, config);
  }

  /**
   * Make a PATCH request
   * 
   * @param endpoint The API endpoint
   * @param data Request body data
   * @param config Request configuration
   * @returns Promise resolving to ApiResponse
   */
  async patch<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, data, config);
  }

  /**
   * Make a DELETE request
   * 
   * @param endpoint The API endpoint
   * @param config Request configuration
   * @returns Promise resolving to ApiResponse
   */
  async delete<T = any>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, config);
  }

  /**
   * Make an HTTP request
   * 
   * @private
   * @param method HTTP method
   * @param endpoint API endpoint
   * @param data Request body
   * @param config Request configuration
   * @returns Promise resolving to ApiResponse
   */
  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      // Build URL
      const url = this.buildURL(endpoint, config?.params);
      
      // Build request configuration
      let requestConfig: RequestInit = {
        method,
        headers: {
          ...this.defaultHeaders,
          ...config?.headers
        },
        signal: config?.signal
      };

      // Add body for methods that support it
      if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
        if (data instanceof FormData) {
          // Remove Content-Type for FormData (browser sets it with boundary)
          delete (requestConfig.headers as any)['Content-Type'];
          requestConfig.body = data;
        } else {
          requestConfig.body = JSON.stringify(data);
        }
      }

      // Apply request interceptors
      for (const interceptor of this.requestInterceptors) {
        requestConfig = await interceptor(requestConfig);
      }

      // Create timeout promise if needed
      const timeoutMs = config?.timeout || this.timeout;
      const controller = new AbortController();
      
      if (!config?.signal) {
        requestConfig.signal = controller.signal;
      }

      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        // Make the request
        const response = await fetch(url, requestConfig);
        clearTimeout(timeoutId);

        // Parse response
        let responseData: any = null;
        const contentType = response.headers.get('content-type');
        
        if (response.status !== 204) { // 204 No Content
          if (contentType?.includes('application/json')) {
            responseData = await response.json();
          } else {
            responseData = await response.text();
          }
        }

        // Build response object
        let apiResponse: ApiResponse<T> = {
          data: responseData,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          ok: response.ok
        };

        // Add error info for non-ok responses
        if (!response.ok) {
          apiResponse.error = {
            message: `HTTP ${response.status}: ${response.statusText}`,
            code: String(response.status),
            details: responseData
          };
        }

        // Apply response interceptors
        for (const interceptor of this.responseInterceptors) {
          apiResponse = await interceptor(apiResponse);
        }

        // Emit error event for failed requests
        if (!apiResponse.ok) {
          this.eventBus.emit('api:error', {
            endpoint,
            method,
            status: apiResponse.status,
            error: apiResponse.error
          });
        }

        return apiResponse;

      } catch (error: any) {
        clearTimeout(timeoutId);
        
        // Handle timeout
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeoutMs}ms`);
        }
        throw error;
      }

    } catch (error: any) {
      // Log error
      this.logger.error('API request failed', {
        endpoint,
        method,
        error: error.message
      });

      // Emit error event
      this.eventBus.emit('api:error', {
        endpoint,
        method,
        error: {
          message: error.message,
          code: 'NETWORK_ERROR'
        }
      });

      // Return error response
      return {
        data: null,
        status: 0,
        ok: false,
        error: {
          message: error.message,
          code: 'NETWORK_ERROR'
        }
      };
    }
  }

  /**
   * Build full URL with base URL and query parameters
   * 
   * @private
   * @param endpoint API endpoint
   * @param params Query parameters
   * @returns Full URL
   */
  private buildURL(endpoint: string, params?: Record<string, any>): string {
    // Handle absolute URLs
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return this.appendParams(endpoint, params);
    }

    // Build with base URL
    const url = this.baseURL + endpoint;
    return this.appendParams(url, params);
  }

  /**
   * Append query parameters to URL
   * 
   * @private
   * @param url Base URL
   * @param params Query parameters
   * @returns URL with parameters
   */
  private appendParams(url: string, params?: Record<string, any>): string {
    if (!params || Object.keys(params).length === 0) {
      return url;
    }

    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${searchParams.toString()}`;
  }
}
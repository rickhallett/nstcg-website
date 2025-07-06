/**
 * @module ResilientApiService
 * @description Enhanced API service with resilience patterns
 * 
 * Combines circuit breaker, retry logic, and rate limiting
 * to create a robust API client.
 */

import { ApiService } from './ApiService';
import { CircuitBreaker, CircuitBreakerConfig } from '../Resilience/CircuitBreaker';
import { RetryManager, RetryConfig } from '../Resilience/RetryManager';
import { RateLimiter, RateLimiterConfig } from '../Resilience/RateLimiter';
import { EventBus } from '../EventBus/EventBus';

/**
 * Resilient API configuration
 */
export interface ResilientApiConfig {
  /**
   * Base configuration for ApiService
   */
  baseURL?: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  
  /**
   * Circuit breaker configuration
   */
  circuitBreaker?: CircuitBreakerConfig | false;
  
  /**
   * Retry configuration
   */
  retry?: RetryConfig | false;
  
  /**
   * Rate limiter configuration
   */
  rateLimiter?: RateLimiterConfig | false;
  
  /**
   * Enable request/response logging
   */
  logging?: boolean;
  
  /**
   * Custom error handler
   */
  errorHandler?: (error: Error, context: RequestContext) => void;
}

/**
 * Request context for logging and debugging
 */
interface RequestContext {
  method: string;
  url: string;
  data?: any;
  headers?: Record<string, string>;
  startTime: number;
  attempt?: number;
}

/**
 * Enhanced response with metadata
 */
export interface ResilientResponse<T = any> {
  data: T;
  status: number;
  headers: Headers;
  duration: number;
  attempts: number;
  cached?: boolean;
}

/**
 * Request cache entry
 */
interface CacheEntry {
  data: any;
  timestamp: number;
  etag?: string;
}

/**
 * ResilientApiService class
 */
export class ResilientApiService extends ApiService {
  private circuitBreaker?: CircuitBreaker<any>;
  private retryManager?: RetryManager;
  private rateLimiter?: RateLimiter;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly logging: boolean;
  private readonly errorHandler?: (error: Error, context: RequestContext) => void;
  
  constructor(config: ResilientApiConfig = {}) {
    // Initialize base ApiService
    super(config.baseURL, config.defaultHeaders, config.timeout);
    
    this.logging = config.logging ?? false;
    this.errorHandler = config.errorHandler;
    
    // Setup circuit breaker
    if (config.circuitBreaker !== false) {
      const cbConfig = config.circuitBreaker || {
        failureThreshold: 5,
        recoveryTimeout: 30000,
        monitor: (event) => this.handleCircuitEvent(event)
      };
      
      this.circuitBreaker = new CircuitBreaker(
        this.executeRequest.bind(this),
        'ApiService',
        cbConfig
      );
    }
    
    // Setup retry manager
    if (config.retry !== false) {
      this.retryManager = new RetryManager(config.retry || {
        maxAttempts: 3,
        initialDelay: 1000,
        onRetry: (attempt, error, delay) => this.handleRetry(attempt, error, delay)
      });
    }
    
    // Setup rate limiter
    if (config.rateLimiter !== false) {
      this.rateLimiter = new RateLimiter(config.rateLimiter || {
        maxTokens: 10,
        refillRate: 1,
        queueRequests: true
      });
    }
  }
  
  /**
   * Enhanced GET request
   */
  public async get<T = any>(
    url: string,
    options?: RequestInit
  ): Promise<ResilientResponse<T>> {
    return this.request<T>('GET', url, undefined, options);
  }
  
  /**
   * Enhanced POST request
   */
  public async post<T = any>(
    url: string,
    data?: any,
    options?: RequestInit
  ): Promise<ResilientResponse<T>> {
    return this.request<T>('POST', url, data, options);
  }
  
  /**
   * Enhanced PUT request
   */
  public async put<T = any>(
    url: string,
    data?: any,
    options?: RequestInit
  ): Promise<ResilientResponse<T>> {
    return this.request<T>('PUT', url, data, options);
  }
  
  /**
   * Enhanced DELETE request
   */
  public async delete<T = any>(
    url: string,
    options?: RequestInit
  ): Promise<ResilientResponse<T>> {
    return this.request<T>('DELETE', url, undefined, options);
  }
  
  /**
   * Main request method with resilience patterns
   */
  private async request<T>(
    method: string,
    url: string,
    data?: any,
    options?: RequestInit
  ): Promise<ResilientResponse<T>> {
    const context: RequestContext = {
      method,
      url,
      data,
      headers: options?.headers as Record<string, string>,
      startTime: Date.now()
    };
    
    try {
      // Apply rate limiting
      if (this.rateLimiter) {
        await this.rateLimiter.consume();
      }
      
      // Check cache for GET requests
      if (method === 'GET') {
        const cached = this.getFromCache(url);
        if (cached) {
          return {
            data: cached.data,
            status: 200,
            headers: new Headers(),
            duration: 0,
            attempts: 0,
            cached: true
          };
        }
      }
      
      // Execute request with retry and circuit breaker
      let attempts = 0;
      const executeWithResilience = async () => {
        attempts++;
        context.attempt = attempts;
        
        if (this.circuitBreaker) {
          return this.circuitBreaker.execute(method, url, data, options);
        } else {
          return this.executeRequest(method, url, data, options);
        }
      };
      
      let response: Response;
      if (this.retryManager) {
        response = await this.retryManager.execute(executeWithResilience);
      } else {
        response = await executeWithResilience();
      }
      
      // Parse response
      const responseData = await this.parseResponse<T>(response);
      
      // Cache successful GET responses
      if (method === 'GET' && response.ok) {
        this.addToCache(url, responseData, response.headers.get('etag') || undefined);
      }
      
      // Create resilient response
      const result: ResilientResponse<T> = {
        data: responseData,
        status: response.status,
        headers: response.headers,
        duration: Date.now() - context.startTime,
        attempts
      };
      
      // Log success
      if (this.logging) {
        this.logRequest('success', context, result);
      }
      
      return result;
      
    } catch (error) {
      // Log error
      if (this.logging) {
        this.logRequest('error', context, error as Error);
      }
      
      // Call error handler
      if (this.errorHandler) {
        this.errorHandler(error as Error, context);
      }
      
      // Emit error event
      EventBus.getInstance().emit('api:error', {
        error,
        context
      });
      
      throw error;
    }
  }
  
  /**
   * Execute the actual request
   */
  private async executeRequest(
    method: string,
    url: string,
    data?: any,
    options?: RequestInit
  ): Promise<Response> {
    const fullUrl = this.buildFullUrl(url);
    const headers = this.buildHeaders(options?.headers);
    
    const requestOptions: RequestInit = {
      ...options,
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined
    };
    
    if (this.timeout) {
      const controller = new AbortController();
      requestOptions.signal = controller.signal;
      
      setTimeout(() => controller.abort(), this.timeout);
    }
    
    return fetch(fullUrl, requestOptions);
  }
  
  /**
   * Parse response with error handling
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = new ApiError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        await response.text()
      );
      throw error;
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    } else {
      return response.text() as any;
    }
  }
  
  /**
   * Build full URL
   */
  private buildFullUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${this.baseURL}${url}`;
  }
  
  /**
   * Build headers
   */
  private buildHeaders(additionalHeaders?: HeadersInit): Headers {
    const headers = new Headers(this.defaultHeaders);
    
    if (additionalHeaders) {
      const additional = new Headers(additionalHeaders);
      additional.forEach((value, key) => {
        headers.set(key, value);
      });
    }
    
    return headers;
  }
  
  /**
   * Get from cache
   */
  private getFromCache(url: string): CacheEntry | null {
    const entry = this.cache.get(url);
    if (!entry) return null;
    
    // Check if cache is still valid (5 minutes)
    const age = Date.now() - entry.timestamp;
    if (age > 300000) {
      this.cache.delete(url);
      return null;
    }
    
    return entry;
  }
  
  /**
   * Add to cache
   */
  private addToCache(url: string, data: any, etag?: string): void {
    this.cache.set(url, {
      data,
      timestamp: Date.now(),
      etag
    });
    
    // Limit cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
  
  /**
   * Handle circuit breaker events
   */
  private handleCircuitEvent(event: any): void {
    if (this.logging) {
      console.log(`[CircuitBreaker] ${event.type}:`, event);
    }
    
    EventBus.getInstance().emit(`circuit:${event.type}`, event);
  }
  
  /**
   * Handle retry events
   */
  private handleRetry(attempt: number, error: Error, delay: number): void {
    if (this.logging) {
      console.log(`[Retry] Attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
    }
    
    EventBus.getInstance().emit('api:retry', {
      attempt,
      error,
      delay
    });
  }
  
  /**
   * Log requests
   */
  private logRequest(
    type: 'success' | 'error',
    context: RequestContext,
    result: ResilientResponse | Error
  ): void {
    const duration = Date.now() - context.startTime;
    
    if (type === 'success') {
      console.log(
        `[API] ${context.method} ${context.url} - ${(result as ResilientResponse).status} in ${duration}ms (${(result as ResilientResponse).attempts} attempts)`
      );
    } else {
      console.error(
        `[API] ${context.method} ${context.url} - Error in ${duration}ms:`,
        (result as Error).message
      );
    }
  }
  
  /**
   * Get service statistics
   */
  public getStats(): ServiceStats {
    return {
      circuitBreaker: this.circuitBreaker?.getStats(),
      rateLimiter: this.rateLimiter?.getStats(),
      cacheSize: this.cache.size
    };
  }
  
  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Reset all resilience mechanisms
   */
  public reset(): void {
    this.circuitBreaker?.reset();
    this.rateLimiter?.reset();
    this.clearCache();
  }
}

/**
 * API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Service statistics
 */
export interface ServiceStats {
  circuitBreaker?: any;
  rateLimiter?: any;
  cacheSize: number;
}
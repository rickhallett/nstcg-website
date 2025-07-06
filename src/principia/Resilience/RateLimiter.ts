/**
 * @module RateLimiter
 * @description Rate limiting implementation with token bucket algorithm
 * 
 * Provides rate limiting to prevent overwhelming external services
 * and manage resource consumption.
 */

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  /**
   * Maximum number of tokens in the bucket
   */
  maxTokens: number;
  
  /**
   * Token refill rate (tokens per second)
   */
  refillRate: number;
  
  /**
   * Initial tokens (defaults to maxTokens)
   */
  initialTokens?: number;
  
  /**
   * Queue requests when no tokens available
   */
  queueRequests?: boolean;
  
  /**
   * Maximum queue size
   */
  maxQueueSize?: number;
  
  /**
   * Timeout for queued requests (ms)
   */
  queueTimeout?: number;
}

/**
 * Queued request
 */
interface QueuedRequest {
  resolve: (value: void) => void;
  reject: (error: Error) => void;
  tokensNeeded: number;
  timestamp: number;
  timeoutId?: NodeJS.Timeout;
}

/**
 * Rate limiter statistics
 */
export interface RateLimiterStats {
  availableTokens: number;
  maxTokens: number;
  queueLength: number;
  totalRequests: number;
  acceptedRequests: number;
  rejectedRequests: number;
  queuedRequests: number;
}

/**
 * RateLimiter class using token bucket algorithm
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private queue: QueuedRequest[] = [];
  
  // Statistics
  private totalRequests: number = 0;
  private acceptedRequests: number = 0;
  private rejectedRequests: number = 0;
  private queuedRequests: number = 0;
  
  // Configuration
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private readonly queueRequests: boolean;
  private readonly maxQueueSize: number;
  private readonly queueTimeout: number;
  
  constructor(config: RateLimiterConfig) {
    this.maxTokens = config.maxTokens;
    this.refillRate = config.refillRate;
    this.tokens = config.initialTokens ?? config.maxTokens;
    this.queueRequests = config.queueRequests ?? false;
    this.maxQueueSize = config.maxQueueSize ?? 100;
    this.queueTimeout = config.queueTimeout ?? 30000;
    this.lastRefill = Date.now();
    
    // Start refill timer
    this.startRefillTimer();
  }
  
  /**
   * Try to consume tokens
   */
  public async tryConsume(tokens: number = 1): Promise<boolean> {
    this.totalRequests++;
    
    // Refill tokens based on elapsed time
    this.refillTokens();
    
    // Check if we have enough tokens
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      this.acceptedRequests++;
      this.processQueue();
      return true;
    }
    
    // If queueing is disabled, reject immediately
    if (!this.queueRequests) {
      this.rejectedRequests++;
      return false;
    }
    
    // Try to queue the request
    if (this.queue.length >= this.maxQueueSize) {
      this.rejectedRequests++;
      throw new Error('Rate limiter queue is full');
    }
    
    // Queue the request
    return this.queueRequest(tokens);
  }
  
  /**
   * Consume tokens (throws if not available)
   */
  public async consume(tokens: number = 1): Promise<void> {
    const allowed = await this.tryConsume(tokens);
    if (!allowed) {
      throw new Error(`Rate limit exceeded. Required ${tokens} tokens but only ${this.tokens} available.`);
    }
  }
  
  /**
   * Check if tokens are available without consuming
   */
  public canConsume(tokens: number = 1): boolean {
    this.refillTokens();
    return this.tokens >= tokens;
  }
  
  /**
   * Get available tokens
   */
  public getAvailableTokens(): number {
    this.refillTokens();
    return Math.floor(this.tokens);
  }
  
  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = (elapsed / 1000) * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
  
  /**
   * Queue a request
   */
  private queueRequest(tokensNeeded: number): Promise<boolean> {
    this.queuedRequests++;
    
    return new Promise<boolean>((resolve, reject) => {
      const request: QueuedRequest = {
        resolve: () => resolve(true),
        reject,
        tokensNeeded,
        timestamp: Date.now()
      };
      
      // Set timeout
      if (this.queueTimeout > 0) {
        request.timeoutId = setTimeout(() => {
          this.removeFromQueue(request);
          this.rejectedRequests++;
          reject(new Error('Rate limiter queue timeout'));
        }, this.queueTimeout);
      }
      
      this.queue.push(request);
    });
  }
  
  /**
   * Process queued requests
   */
  private processQueue(): void {
    while (this.queue.length > 0) {
      const request = this.queue[0];
      
      // Check if we have enough tokens
      if (this.tokens >= request.tokensNeeded) {
        // Remove from queue
        this.queue.shift();
        
        // Clear timeout
        if (request.timeoutId) {
          clearTimeout(request.timeoutId);
        }
        
        // Consume tokens and resolve
        this.tokens -= request.tokensNeeded;
        this.acceptedRequests++;
        request.resolve();
      } else {
        // Not enough tokens, stop processing
        break;
      }
    }
  }
  
  /**
   * Remove request from queue
   */
  private removeFromQueue(request: QueuedRequest): void {
    const index = this.queue.indexOf(request);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }
  
  /**
   * Start refill timer
   */
  private startRefillTimer(): void {
    // Refill tokens periodically
    setInterval(() => {
      this.refillTokens();
      this.processQueue();
    }, 100); // Check every 100ms
  }
  
  /**
   * Get statistics
   */
  public getStats(): RateLimiterStats {
    return {
      availableTokens: this.getAvailableTokens(),
      maxTokens: this.maxTokens,
      queueLength: this.queue.length,
      totalRequests: this.totalRequests,
      acceptedRequests: this.acceptedRequests,
      rejectedRequests: this.rejectedRequests,
      queuedRequests: this.queuedRequests
    };
  }
  
  /**
   * Reset the rate limiter
   */
  public reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
    this.queue.forEach(request => {
      if (request.timeoutId) {
        clearTimeout(request.timeoutId);
      }
      request.reject(new Error('Rate limiter reset'));
    });
    this.queue = [];
    this.totalRequests = 0;
    this.acceptedRequests = 0;
    this.rejectedRequests = 0;
    this.queuedRequests = 0;
  }
}

/**
 * Create a rate-limited function
 */
export function createRateLimited<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  limiter: RateLimiter,
  tokens: number = 1
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    await limiter.consume(tokens);
    return fn(...args);
  }) as T;
}

/**
 * Rate limiter decorator
 */
export function rateLimit(limiter: RateLimiter, tokens: number = 1) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      await limiter.consume(tokens);
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}
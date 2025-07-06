/**
 * @module CircuitBreaker
 * @description Circuit breaker pattern for API resilience
 * 
 * Implements the circuit breaker pattern to prevent cascading failures
 * and provide graceful degradation when external services fail.
 */

import { EventBus } from '../EventBus/EventBus';

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject all requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /**
   * Number of failures before opening circuit
   */
  failureThreshold?: number;
  
  /**
   * Time window for counting failures (ms)
   */
  failureWindow?: number;
  
  /**
   * Time to wait before attempting recovery (ms)
   */
  recoveryTimeout?: number;
  
  /**
   * Success threshold in half-open state
   */
  successThreshold?: number;
  
  /**
   * Optional fallback function
   */
  fallback?: (...args: any[]) => Promise<any>;
  
  /**
   * Monitor function for metrics
   */
  monitor?: (event: CircuitEvent) => void;
}

/**
 * Circuit breaker event
 */
export interface CircuitEvent {
  type: 'call' | 'success' | 'failure' | 'open' | 'close' | 'half-open';
  timestamp: number;
  error?: Error;
  duration?: number;
}

/**
 * Failure record
 */
interface FailureRecord {
  timestamp: number;
  error: Error;
}

/**
 * CircuitBreaker class
 */
export class CircuitBreaker<T extends (...args: any[]) => Promise<any>> {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: FailureRecord[] = [];
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private recoveryTimer: NodeJS.Timeout | null = null;
  
  // Configuration with defaults
  private readonly failureThreshold: number;
  private readonly failureWindow: number;
  private readonly recoveryTimeout: number;
  private readonly successThreshold: number;
  private readonly fallback?: (...args: any[]) => Promise<any>;
  private readonly monitor?: (event: CircuitEvent) => void;
  
  constructor(
    private readonly fn: T,
    private readonly name: string,
    config: CircuitBreakerConfig = {}
  ) {
    this.failureThreshold = config.failureThreshold ?? 5;
    this.failureWindow = config.failureWindow ?? 60000; // 1 minute
    this.recoveryTimeout = config.recoveryTimeout ?? 30000; // 30 seconds
    this.successThreshold = config.successThreshold ?? 3;
    this.fallback = config.fallback;
    this.monitor = config.monitor;
  }
  
  /**
   * Get current state
   */
  public getState(): CircuitState {
    return this.state;
  }
  
  /**
   * Get failure count
   */
  public getFailureCount(): number {
    this.cleanOldFailures();
    return this.failures.length;
  }
  
  /**
   * Execute function with circuit breaker protection
   */
  public async execute(...args: Parameters<T>): Promise<ReturnType<T>> {
    const startTime = Date.now();
    
    // Emit call event
    this.emitEvent({ type: 'call', timestamp: startTime });
    
    // Check circuit state
    if (this.state === CircuitState.OPEN) {
      // Try fallback or throw
      if (this.fallback) {
        return this.fallback(...args) as ReturnType<T>;
      }
      throw new Error(`Circuit breaker is OPEN for ${this.name}`);
    }
    
    try {
      // Execute the function
      const result = await this.fn(...args);
      
      // Record success
      this.onSuccess();
      
      // Emit success event
      this.emitEvent({
        type: 'success',
        timestamp: Date.now(),
        duration: Date.now() - startTime
      });
      
      return result;
    } catch (error) {
      // Record failure
      this.onFailure(error as Error);
      
      // Emit failure event
      this.emitEvent({
        type: 'failure',
        timestamp: Date.now(),
        error: error as Error,
        duration: Date.now() - startTime
      });
      
      // Try fallback if available
      if (this.fallback) {
        return this.fallback(...args) as ReturnType<T>;
      }
      
      throw error;
    }
  }
  
  /**
   * Handle successful call
   */
  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      
      // Check if we've reached success threshold
      if (this.successCount >= this.successThreshold) {
        this.close();
      }
    }
  }
  
  /**
   * Handle failed call
   */
  private onFailure(error: Error): void {
    const now = Date.now();
    
    // Record failure
    this.failures.push({ timestamp: now, error });
    this.lastFailureTime = now;
    
    // Clean old failures
    this.cleanOldFailures();
    
    // Check if we should open the circuit
    if (this.state === CircuitState.CLOSED) {
      if (this.failures.length >= this.failureThreshold) {
        this.open();
      }
    } else if (this.state === CircuitState.HALF_OPEN) {
      // Single failure in half-open state reopens circuit
      this.open();
    }
  }
  
  /**
   * Open the circuit
   */
  private open(): void {
    this.state = CircuitState.OPEN;
    this.successCount = 0;
    
    // Emit open event
    this.emitEvent({ type: 'open', timestamp: Date.now() });
    
    // Emit to EventBus
    EventBus.getInstance().emit('circuit:open', {
      name: this.name,
      failures: this.failures.length
    });
    
    // Schedule recovery attempt
    this.scheduleRecovery();
  }
  
  /**
   * Close the circuit
   */
  private close(): void {
    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.successCount = 0;
    
    // Clear recovery timer
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
    
    // Emit close event
    this.emitEvent({ type: 'close', timestamp: Date.now() });
    
    // Emit to EventBus
    EventBus.getInstance().emit('circuit:close', { name: this.name });
  }
  
  /**
   * Enter half-open state
   */
  private halfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.successCount = 0;
    
    // Emit half-open event
    this.emitEvent({ type: 'half-open', timestamp: Date.now() });
    
    // Emit to EventBus
    EventBus.getInstance().emit('circuit:half-open', { name: this.name });
  }
  
  /**
   * Schedule recovery attempt
   */
  private scheduleRecovery(): void {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }
    
    this.recoveryTimer = setTimeout(() => {
      this.halfOpen();
    }, this.recoveryTimeout);
  }
  
  /**
   * Clean old failures outside the window
   */
  private cleanOldFailures(): void {
    const cutoff = Date.now() - this.failureWindow;
    this.failures = this.failures.filter(f => f.timestamp > cutoff);
  }
  
  /**
   * Emit monitoring event
   */
  private emitEvent(event: CircuitEvent): void {
    if (this.monitor) {
      this.monitor(event);
    }
  }
  
  /**
   * Reset the circuit breaker
   */
  public reset(): void {
    this.close();
  }
  
  /**
   * Get circuit statistics
   */
  public getStats(): CircuitBreakerStats {
    this.cleanOldFailures();
    
    return {
      state: this.state,
      failures: this.failures.length,
      lastFailureTime: this.lastFailureTime,
      successCount: this.successCount
    };
  }
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  lastFailureTime: number;
  successCount: number;
}

/**
 * Create a circuit breaker decorator
 */
export function withCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  name: string,
  config?: CircuitBreakerConfig
) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    let breaker: CircuitBreaker<any>;
    
    descriptor.value = async function(...args: any[]) {
      if (!breaker) {
        // Create breaker with bound method
        breaker = new CircuitBreaker(
          originalMethod.bind(this),
          `${target.constructor.name}.${propertyKey}`,
          config
        );
      }
      return breaker.execute(...args);
    };
    
    return descriptor;
  };
}
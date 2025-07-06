import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { RetryManager, RetryStrategy, RetryExhaustedError, withRetry } from './RetryManager';

describe('RetryManager', () => {
  let attemptCount: number;
  let failingFn: any;
  let eventuallySucceedingFn: any;

  beforeEach(() => {
    attemptCount = 0;
    
    failingFn = mock(async () => {
      attemptCount++;
      throw new Error(`Attempt ${attemptCount} failed`);
    });

    eventuallySucceedingFn = mock(async () => {
      attemptCount++;
      if (attemptCount < 3) {
        throw new Error(`Attempt ${attemptCount} failed`);
      }
      return 'success';
    });
  });

  describe('basic retry functionality', () => {
    it('should retry on failure', async () => {
      const manager = new RetryManager({
        maxAttempts: 3,
        initialDelay: 10
      });

      const result = await manager.execute(eventuallySucceedingFn);
      
      expect(result).toBe('success');
      expect(attemptCount).toBe(3);
    });

    it('should throw RetryExhaustedError after max attempts', async () => {
      const manager = new RetryManager({
        maxAttempts: 3,
        initialDelay: 10
      });

      await expect(manager.execute(failingFn))
        .rejects.toThrow(RetryExhaustedError);
      
      expect(attemptCount).toBe(3);
    });

    it('should not retry non-retryable errors', async () => {
      const manager = new RetryManager({
        maxAttempts: 3,
        isRetryable: () => false
      });

      await expect(manager.execute(failingFn))
        .rejects.toThrow('Attempt 1 failed');
      
      expect(attemptCount).toBe(1);
    });
  });

  describe('retry strategies', () => {
    it('should use exponential backoff', async () => {
      const delays: number[] = [];
      
      const manager = new RetryManager({
        maxAttempts: 4,
        initialDelay: 100,
        strategy: RetryStrategy.EXPONENTIAL,
        backoffMultiplier: 2,
        jitter: false,
        onRetry: (attempt, error, delay) => delays.push(delay)
      });

      try {
        await manager.execute(failingFn);
      } catch {}

      expect(delays).toEqual([100, 200, 400]);
    });

    it('should use linear backoff', async () => {
      const delays: number[] = [];
      
      const manager = new RetryManager({
        maxAttempts: 4,
        initialDelay: 100,
        strategy: RetryStrategy.LINEAR,
        jitter: false,
        onRetry: (attempt, error, delay) => delays.push(delay)
      });

      try {
        await manager.execute(failingFn);
      } catch {}

      expect(delays).toEqual([100, 200, 300]);
    });

    it('should use fixed delay', async () => {
      const delays: number[] = [];
      
      const manager = new RetryManager({
        maxAttempts: 4,
        initialDelay: 100,
        strategy: RetryStrategy.FIXED,
        jitter: false,
        onRetry: (attempt, error, delay) => delays.push(delay)
      });

      try {
        await manager.execute(failingFn);
      } catch {}

      expect(delays).toEqual([100, 100, 100]);
    });
  });

  describe('jitter', () => {
    it('should add jitter to delays', async () => {
      const delays: number[] = [];
      
      const manager = new RetryManager({
        maxAttempts: 3,
        initialDelay: 1000,
        jitter: true,
        jitterFactor: 0.3,
        onRetry: (attempt, error, delay) => delays.push(delay)
      });

      try {
        await manager.execute(failingFn);
      } catch {}

      // With 30% jitter, delays should be within 700-1300
      expect(delays[0]).toBeGreaterThanOrEqual(700);
      expect(delays[0]).toBeLessThanOrEqual(1300);
    });
  });

  describe('max delay', () => {
    it('should cap delay at maxDelay', async () => {
      const delays: number[] = [];
      
      const manager = new RetryManager({
        maxAttempts: 5,
        initialDelay: 100,
        maxDelay: 200,
        strategy: RetryStrategy.EXPONENTIAL,
        backoffMultiplier: 3,
        jitter: false,
        onRetry: (attempt, error, delay) => delays.push(delay)
      });

      try {
        await manager.execute(failingFn);
      } catch {}

      // With exponential backoff and multiplier 3:
      // Attempt 1 retry: 100 * 3^0 = 100
      // Attempt 2 retry: 100 * 3^1 = 300 → capped at 200
      // Attempt 3 retry: 100 * 3^2 = 900 → capped at 200
      // Attempt 4 retry: 100 * 3^3 = 2700 → capped at 200
      expect(delays).toEqual([100, 300, 900, 2700].map(d => Math.min(d, 200)));
    });
  });

  describe('retryable errors', () => {
    it('should retry network errors by default', async () => {
      const networkError = new Error('network timeout');
      let networkAttempts = 0;
      const networkFn = mock(async () => {
        networkAttempts++;
        if (networkAttempts === 1) throw networkError;
        return 'success';
      });

      const manager = new RetryManager({ maxAttempts: 3, initialDelay: 10 });
      const result = await manager.execute(networkFn);
      
      expect(result).toBe('success');
      expect(networkAttempts).toBe(2);
    });

    it('should retry specific HTTP status codes', async () => {
      const httpError: any = new Error('HTTP Error');
      httpError.status = 503;
      
      const httpFn = mock(async () => {
        attemptCount++;
        if (attemptCount < 2) throw httpError;
        return 'success';
      });

      const manager = new RetryManager({ maxAttempts: 3, initialDelay: 10 });
      const result = await manager.execute(httpFn);
      
      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
    });

    it('should use custom retryable checker', async () => {
      const manager = new RetryManager({
        maxAttempts: 3,
        initialDelay: 10,
        isRetryable: (error) => error.message.includes('retry me')
      });

      const customError = new Error('please retry me');
      const customFn = mock(async () => {
        attemptCount++;
        if (attemptCount < 2) throw customError;
        return 'success';
      });

      const result = await manager.execute(customFn);
      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
    });
  });

  describe('onRetry callback', () => {
    it('should call onRetry for each retry', async () => {
      const retryEvents: any[] = [];
      
      const manager = new RetryManager({
        maxAttempts: 3,
        initialDelay: 10,
        onRetry: (attempt, error, delay) => {
          retryEvents.push({ attempt, error: error.message, delay });
        }
      });

      await manager.execute(eventuallySucceedingFn);
      
      expect(retryEvents).toHaveLength(2);
      expect(retryEvents[0].attempt).toBe(1);
      expect(retryEvents[1].attempt).toBe(2);
    });
  });

  describe('createRetryable', () => {
    it('should create retryable function', async () => {
      const originalFn = mock(async (x: number) => {
        attemptCount++;
        if (attemptCount < 2) throw new Error('Fail');
        return x * 2;
      });

      const retryable = RetryManager.createRetryable(originalFn, {
        maxAttempts: 3,
        initialDelay: 10
      });

      const result = await retryable(5);
      expect(result).toBe(10);
      expect(attemptCount).toBe(2);
    });
  });

  describe('decorator', () => {
    it('should work as decorator', async () => {
      const { retry } = await import('./RetryManager');
      
      class TestService {
        calls = 0;

        @retry({ maxAttempts: 3, initialDelay: 10 })
        async flaky() {
          this.calls++;
          if (this.calls < 2) throw new Error('Flaky error');
          return 'success';
        }
      }

      const service = new TestService();
      const result = await service.flaky();
      
      expect(result).toBe('success');
      expect(service.calls).toBe(2);
    });
  });

  describe('withRetry utility', () => {
    it('should retry function', async () => {
      const result = await withRetry(
        eventuallySucceedingFn,
        { maxAttempts: 3, initialDelay: 10 }
      );
      
      expect(result).toBe('success');
      expect(attemptCount).toBe(3);
    });
  });

  describe('context parameter', () => {
    it('should include context in error message', async () => {
      const manager = new RetryManager({
        maxAttempts: 2,
        initialDelay: 10
      });

      try {
        await manager.execute(failingFn, 'API.getUserData');
      } catch (error: any) {
        expect(error.message).toContain('API.getUserData');
      }
    });
  });
});
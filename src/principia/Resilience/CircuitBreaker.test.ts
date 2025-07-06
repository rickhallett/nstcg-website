import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { CircuitBreaker, CircuitState } from './CircuitBreaker';

describe('CircuitBreaker', () => {
  let successFn: any;
  let failFn: any;
  let breaker: CircuitBreaker<any>;

  beforeEach(() => {
    successFn = mock(async () => 'success');
    failFn = mock(async () => {
      throw new Error('Test error');
    });
  });

  describe('basic functionality', () => {
    it('should allow successful calls when closed', async () => {
      breaker = new CircuitBreaker(successFn, 'test', {
        failureThreshold: 3
      });

      const result = await breaker.execute();
      expect(result).toBe('success');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should count failures', async () => {
      breaker = new CircuitBreaker(failFn, 'test', {
        failureThreshold: 3
      });

      try {
        await breaker.execute();
      } catch {}

      expect(breaker.getFailureCount()).toBe(1);
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should open after threshold', async () => {
      breaker = new CircuitBreaker(failFn, 'test', {
        failureThreshold: 3
      });

      // Fail 3 times
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute();
        } catch {}
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
      expect(breaker.getFailureCount()).toBe(3);
    });
  });

  describe('open state behavior', () => {
    it('should reject calls when open', async () => {
      breaker = new CircuitBreaker(failFn, 'test', {
        failureThreshold: 1
      });

      // Open the circuit
      try {
        await breaker.execute();
      } catch {}

      // Should reject without calling function
      await expect(breaker.execute()).rejects.toThrow('Circuit breaker is OPEN');
      expect(failFn).toHaveBeenCalledTimes(1); // Only the first call
    });

    it('should use fallback when open', async () => {
      const fallback = mock(async () => 'fallback');
      
      breaker = new CircuitBreaker(failFn, 'test', {
        failureThreshold: 1,
        fallback
      });

      // Open the circuit
      try {
        await breaker.execute();
      } catch {}

      // Should use fallback
      const result = await breaker.execute();
      expect(result).toBe('fallback');
      expect(fallback).toHaveBeenCalled();
    });
  });

  describe('half-open state', () => {
    it('should transition to half-open after timeout', async () => {
      breaker = new CircuitBreaker(failFn, 'test', {
        failureThreshold: 1,
        recoveryTimeout: 100
      });

      // Open the circuit
      try {
        await breaker.execute();
      } catch {}

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
    });

    it('should close after success threshold', async () => {
      let callCount = 0;
      const alternatingFn = mock(async () => {
        callCount++;
        if (callCount <= 1) throw new Error('Fail');
        return 'success';
      });

      breaker = new CircuitBreaker(alternatingFn, 'test', {
        failureThreshold: 1,
        recoveryTimeout: 100,
        successThreshold: 2
      });

      // Open the circuit
      try {
        await breaker.execute();
      } catch {}

      // Wait for half-open
      await new Promise(resolve => setTimeout(resolve, 150));

      // Succeed twice
      await breaker.execute();
      await breaker.execute();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should reopen on failure in half-open', async () => {
      breaker = new CircuitBreaker(failFn, 'test', {
        failureThreshold: 1,
        recoveryTimeout: 100
      });

      // Open the circuit
      try {
        await breaker.execute();
      } catch {}

      // Wait for half-open
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

      // Fail again
      try {
        await breaker.execute();
      } catch {}

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('failure window', () => {
    it('should only count recent failures', async () => {
      breaker = new CircuitBreaker(failFn, 'test', {
        failureThreshold: 3,
        failureWindow: 200
      });

      // Two failures
      try { await breaker.execute(); } catch {}
      try { await breaker.execute(); } catch {}

      expect(breaker.getFailureCount()).toBe(2);

      // Wait for failures to expire
      await new Promise(resolve => setTimeout(resolve, 250));

      expect(breaker.getFailureCount()).toBe(0);
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('monitoring', () => {
    it('should call monitor function', async () => {
      const monitor = mock();
      
      breaker = new CircuitBreaker(successFn, 'test', {
        monitor
      });

      await breaker.execute();

      expect(monitor).toHaveBeenCalledTimes(2); // call + success
      expect(monitor).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'call' })
      );
      expect(monitor).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success' })
      );
    });
  });

  describe('decorator', () => {
    it('should work as decorator', async () => {
      const { withCircuitBreaker } = await import('./CircuitBreaker');
      
      let callCount = 0;
      
      class TestService {
        @withCircuitBreaker('test', { failureThreshold: 2 })
        async riskyMethod() {
          callCount++;
          if (callCount <= 2) throw new Error('Fail');
          return 'success';
        }
      }

      const service = new TestService();

      // Should fail twice
      await expect(service.riskyMethod()).rejects.toThrow();
      await expect(service.riskyMethod()).rejects.toThrow();

      // Should be open
      await expect(service.riskyMethod()).rejects.toThrow('Circuit breaker is OPEN');
    });
  });

  describe('statistics', () => {
    it('should provide stats', async () => {
      breaker = new CircuitBreaker(failFn, 'test', {
        failureThreshold: 5
      });

      try { await breaker.execute(); } catch {}
      try { await breaker.execute(); } catch {}

      const stats = breaker.getStats();
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.failures).toBe(2);
      expect(stats.lastFailureTime).toBeGreaterThan(0);
      expect(stats.successCount).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset to closed state', async () => {
      breaker = new CircuitBreaker(failFn, 'test', {
        failureThreshold: 1
      });

      // Open the circuit
      try {
        await breaker.execute();
      } catch {}

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Reset
      breaker.reset();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.getFailureCount()).toBe(0);
    });
  });
});
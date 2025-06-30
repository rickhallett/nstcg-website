// test/PrincipiaTest.test.ts
import { describe, it, expect, createMock, beforeEach, afterEach, run } from '../src/PrincipiaTest';

describe('PrincipiaTest Framework', () => {
  let count = 0;

  beforeEach(() => {
    count++;
  });

  afterEach(() => {
    count = 0;
  });

  it('should run beforeEach and afterEach', () => {
    expect(count).toBe(1);
  });

  it.skip('should skip this test', () => {
    throw new Error('This test should not run');
  });

  describe('nested describe', () => {
    let nestedCount = 0;
    beforeEach(() => {
        nestedCount = 1;
    });

    it('should run nested beforeEach', () => {
        expect(nestedCount).toBe(1);
    });
  });
});

describe('mocking tests', () => {
    it('should create a mock object with specified methods', () => {
        const mock = createMock(['method1', 'method2']);
        expect(typeof mock.method1).toBe('function');
        expect(typeof mock.method2).toBe('function');
    });

    it('should track calls to mocked functions', () => {
        const mock = createMock(['method1']);
        mock.method1();
        expect(mock.method1).toHaveBeenCalled();
    });

    it('should allow mocking return values', () => {
        const mock = createMock(['method1']);
        mock.method1.mockReturnValue(42);
        const result = mock.method1();
        expect(result).toBe(42);
    });
});

run();

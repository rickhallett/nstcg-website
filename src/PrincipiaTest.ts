// src/PrincipiaTest.ts

type Test = {
  description: string;
  callback: () => void | Promise<void>;
  only: boolean;
  skip: boolean;
  beforeEaches: (() => void | Promise<void>)[];
  afterEaches: (() => void | Promise<void>)[];
};

let tests: Test[] = [];
let beforeEaches: (() => void | Promise<void>)[] = [];
let afterEaches: (() => void | Promise<void>)[] = [];

export function describe(name: string, callback: () => void) {
  console.log(name);
  const parentBeforeEaches = [...beforeEaches];
  const parentAfterEaches = [...afterEaches];
  callback();
  beforeEaches = parentBeforeEaches;
  afterEaches = parentAfterEaches;
}

export const it = (description: string, callback: () => void | Promise<void>) => {
  tests.push({ description, callback, only: false, skip: false, beforeEaches: [...beforeEaches], afterEaches: [...afterEaches] });
};

it.only = (description: string, callback: () => void | Promise<void>) => {
  tests.push({ description, callback, only: true, skip: false, beforeEaches: [...beforeEaches], afterEaches: [...afterEaches] });
};

it.skip = (description: string, callback: () => void | Promise<void>) => {
  tests.push({ description, callback, only: false, skip: true, beforeEaches: [...beforeEaches], afterEaches: [...afterEaches] });
};

export function beforeEach(callback: () => void | Promise<void>) {
  beforeEaches.push(callback);
}

export function afterEach(callback: () => void | Promise<void>) {
  afterEaches.push(callback);
}

export async function run() {
  const hasOnly = tests.some(test => test.only);
  const testsToRun = hasOnly ? tests.filter(t => t.only) : tests;

  for (const test of testsToRun) {
    if (test.skip) {
      console.log(`  - ${test.description}`);
      continue;
    }
    try {
      for (const beforeEach of test.beforeEaches) {
        await beforeEach();
      }
      await test.callback();
      console.log(`  ✓ ${test.description}`);
    } catch (error) {
      console.error(`  ✗ ${test.description}`);
      console.error(error);
      process.exit(1);
    } finally {
      for (const afterEach of test.afterEaches) {
        await afterEach();
      }
    }
  }
  tests = [];
}

export function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`);
      }
    },
    toEqual(expected: any) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
      }
    },
    toThrow(error?: any) {
      let thrownError;
      try {
        actual();
      } catch (e) {
        thrownError = e;
      }
      if (!thrownError) {
        throw new Error('Expected function to throw an error, but it did not.');
      }
      if (error && thrownError.message !== error.message) {
        throw new Error(`Expected function to throw error with message "${error.message}", but it threw "${thrownError.message}".`);
      }
    },
    toHaveBeenCalled() {
      if (actual.calls.length === 0) {
        throw new Error('Expected function to have been called, but it was not.');
      }
    },
    toBeGreaterThan(expected: number) {
        if (actual <= expected) {
            throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
    }
  };
}

type MockedFunction = {
  (...args: any[]): any;
  calls: any[][];
  results: any[];
  mockReturnValue(value: any): void;
};

export function createMock(methods?: string[]): { [key: string]: MockedFunction } {
  const mock: { [key: string]: MockedFunction } = {};

  const mockFunction = (): MockedFunction => {
    const func: any = (...args: any[]) => {
      func.calls.push(args);
      const result = func.mockedReturnValue;
      func.results.push(result);
      return result;
    };
    func.calls = [];
    func.results = [];
    func.mockedReturnValue = undefined;
    func.mockReturnValue = (value: any) => {
      func.mockedReturnValue = value;
    };
    return func;
  };

  if (methods) {
    methods.forEach(method => {
      mock[method] = mockFunction();
    });
  }

  return mock;
}

// StarLinkOptimiser/test/JqWrapper.test.ts
import { describe, it, expect } from '../../src/PrincipiaTest';
import { JqWrapper } from '../src/JqWrapper';

describe('JqWrapper', () => {
    it('should process json with a filter', async () => {
        const json = '{"a": 1, "b": 2}';
        const result = await JqWrapper.process(json, '.a');
        expect(result).toBe(1);
    });
});

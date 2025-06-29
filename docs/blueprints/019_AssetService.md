[<- Back to Index](./000_master_blueprint.md)

# Blueprint: AssetService.js

**Objective:** To create a centralized service for loading and caching non-JS/CSS assets.

**Test Specification:** `tests/services/AssetService.test.js`

```javascript
import { AssetService } from '../../js/services/AssetService.js';
import { expect } from '../../js/testing/expect.js';
import { describe, it, beforeEach, mockFn } from '../../js/testing/veritas.js';

describe('AssetService', () => {
  let assetService;
  let mockFetch;

  beforeEach(() => {
    mockFetch = mockFn();
    global.fetch = mockFetch;
    AssetService._resetInstance();
    assetService = AssetService.getInstance();
  });

  describe('getJSON()', () => {
    it('should fetch a JSON file and return the parsed data', async () => {
      const jsonData = { key: 'value' };
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(jsonData) });
      const data = await assetService.getJSON('/data/test.json');
      expect(mockFetch).toHaveBeenCalledWith('/data/test.json');
      expect(data).toEqual(jsonData);
    });

    it('should return cached data on the second request for the same JSON file', async () => {
      const jsonData = { key: 'value' };
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(jsonData) });
      
      await assetService.getJSON('/data/test.json'); // First call
      await assetService.getJSON('/data/test.json'); // Second call
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if fetching the JSON fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'));
      const promise = assetService.getJSON('/data/fail.json');
      await expect(promise).toThrow('Network failure');
    });
  });

  describe('loadScript()', () => {
    it('should create a script tag and append it to the document head', async () => {
      // We can't easily test the script's onload, so we test the DOM manipulation
      const scriptUrl = 'https://third-party.com/library.js';
      // Mock the script's onload event to resolve the promise immediately
      document.head.appendChild = mockFn().mockImplementation(script => {
        script.onload();
      });
      
      await assetService.loadScript(scriptUrl);
      
      expect(document.head.appendChild).toHaveBeenCalled();
      const scriptTag = document.head.appendChild.mock.calls[0][0];
      expect(scriptTag.tagName).toBe('SCRIPT');
      expect(scriptTag.src).toBe(scriptUrl);
      expect(scriptTag.async).toBe(true);
    });

    it('should not add the same script twice', async () => {
      document.head.appendChild = mockFn().mockImplementation(script => script.onload());
      const scriptUrl = 'https://third-party.com/library.js';
      
      await assetService.loadScript(scriptUrl);
      await assetService.loadScript(scriptUrl);
      
      expect(document.head.appendChild).toHaveBeenCalledTimes(1);
    });
  });
});
```

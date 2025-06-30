[<- Back to Index](./000_master_blueprint.md)

# Blueprint: I18nService.js

**Objective:** To abstract all user-facing strings into a single, manageable system.

**Test Specification:** `tests/services/I18nService.test.js`

```javascript
import { I18nService } from '../../js/services/I18nService.js';
import { expect } from '../../js/testing/expect.js';
import { describe, it, beforeEach, mockFn } from '../../js/testing/veritas.js';

describe('I18nService', () => {
  let i18nService;
  let mockFetch;

  const englishLocale = {
    "app.title": "NSTCG Website",
    "form.submit": "Join Now",
    "greeting": "Hello, {{name}}!",
    "user.messages": {
      "welcome": "Welcome back!",
      "error": "An error occurred."
    }
  };

  beforeEach(async () => {
    mockFetch = mockFn();
    global.fetch = mockFetch;
    
    // Mock the fetch call to return our English locale data
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(englishLocale)
    });

    I18nService._resetInstance();
    i18nService = I18nService.getInstance();
    // init() will be called to load the default locale
    await i18nService.init('en');
  });
  
  // == Initialization ==
  describe('Initialization', () => {
    it('should fetch and load the specified locale file on init()', () => {
        // The beforeEach already calls init, so we just check the mock
        expect(mockFetch).toHaveBeenCalledWith('/locales/en.json');
    });

    it('should throw an error if the locale file fails to load', async () => {
        mockFetch.mockRejectedValue(new Error('Network Error'));
        const failedInit = i18nService.init('fr');
        await expect(failedInit).toThrow('Failed to load locale file for: fr');
    });
  });
  
  // == Translation Function `t()` ==
  describe('t()', () => {
    it('should return the correct string for a simple key', () => {
        expect(i18nService.t('app.title')).toBe('NSTCG Website');
    });

    it('should return the correct string for a nested key using dot notation', () => {
        expect(i18nService.t('user.messages.welcome')).toBe('Welcome back!');
    });

    it('should return the key itself if the translation is not found', () => {
        const key = 'non.existent.key';
        expect(i18nService.t(key)).toBe(key);
        // This should also produce a console.warn, which can be spied on.
    });

    it('should substitute parameters using {{variable}} syntax', () => {
        const greeting = i18nService.t('greeting', { name: 'Alice' });
        expect(greeting).toBe('Hello, Alice!');
    });

    it('should handle multiple substitutions in one string', () => {
        englishLocale.complex = 'Order {{orderId}} for {{name}}';
        const result = i18nService.t('complex', { orderId: 123, name: 'Bob' });
        expect(result).toBe('Order 123 for Bob');
    });

    it('should not replace anything if a parameter is missing', () => {
        const greeting = i18nService.t('greeting', { user: 'Alice' }); // Wrong param name
        expect(greeting).toBe('Hello, {{name}}!');
    });
  });
  
  // == Language Switching ==
  describe('loadLanguage()', () => {
      it('should fetch a new locale file and switch the language', async () => {
          const frenchLocale = { "form.submit": "Rejoindre" };
          mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(frenchLocale) });
          
          await i18nService.loadLanguage('fr');
          
          expect(mockFetch).toHaveBeenCalledWith('/locales/fr.json');
          expect(i18nService.t('form.submit')).toBe('Rejoindre');
      });

      it('should fall back to the default language if a key is missing in the new language', async () => {
          const frenchLocale = { "form.submit": "Rejoindre" }; // Missing app.title
          mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(frenchLocale) });

          await i18nService.loadLanguage('fr');

          expect(i18nService.t('app.title')).toBe('NSTCG Website');
      });
  });
});
```

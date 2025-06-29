Excellent. We are now moving from the core foundation and the first interactive slice into building out the supporting architecture that makes the application feel rich, alive, and professional.

The next two modules are perfect candidates to build in sequence:

1.  **The `Router.js`:** This was blueprinted in concept but needs a full test specification. It's the mechanism that will allow us to create a multi-page application feel without full page reloads, enabling a seamless user experience.
2.  **The `I18nService.js` (Internationalization Service):** This is a crucial piece of forward-thinking architecture. By blueprinting and implementing it now, we ensure that every piece of user-facing text in our application is ready for future localization, saving us from a massive refactoring project down the line.

Let's blueprint them.

---

### **Part 1: Test Specification Blueprint for `Router.js`**

**Module Objective:** To create a client-side router that intercepts navigation, fetches page content asynchronously, updates the DOM and browser history, and orchestrates the initialization of page-specific JavaScript logic. This module provides the foundation for our Single-Page Application (SPA) experience.

**Architectural Role:** The `Router` is a core Singleton service. It works closely with the `EventBus` (for listening to link clicks), the `ApiService` (for fetching HTML), and the `View Controllers` (for initializing page logic).

**File: `tests/core/Router.test.js`**

```javascript
import { Router } from '../../js/core/Router.js';
import { expect } from '../../js/testing/expect.js';
import { describe, it, beforeEach, mockFn, mockSpy } from '../../js/testing/veritas.js';

// We need a mock DOM environment and mock fetch
describe('Router', () => {
  let router;
  let mockFetch;

  beforeEach(() => {
    // Reset DOM and history for each test
    document.body.innerHTML = `
      <div id="main-content">Initial Content</div>
      <a href="/about">About</a>
      <a href="https://external.com">External</a>
    `;
    history.pushState({}, '', '/');
    
    // Mock global fetch
    mockFetch = mockFn();
    global.fetch = mockFetch;
    
    // Reset and get router instance
    Router._resetInstance();
    router = Router.getInstance();
    
    // Mock the dynamic import for view controllers
    // This is a key part of testing the router in isolation
    jest.mock('../../js/views/AboutPage.js', () => ({ init: mockFn() }), { virtual: true });
    jest.mock('../../js/views/HomePage.js', () => ({ init: mockFn() }), { virtual: true });
  });

  // == Initialization & Event Handling ==
  describe('Initialization', () => {
    it('should attach a delegated click listener to the document body on init()', () => {
      // const spy = mockSpy(document.body, 'addEventListener');
      // router.init({
      //   '/about': () => import('../../js/views/AboutPage.js')
      // });
      // expect(spy).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should handle the popstate event to manage browser back/forward buttons', () => {
      // const spy = mockSpy(window, 'addEventListener');
      // router.init({});
      // expect(spy).toHaveBeenCalledWith('popstate', expect.any(Function));
    });
  });

  // == Navigation & Routing Logic ==
  describe('Navigation', () => {
    it('should intercept a click on an internal link and call navigate()', () => {
      // const navigateSpy = mockSpy(router, 'navigate');
      // router.init({}); // Initialize with click listener
      
      // const aboutLink = document.querySelector('a[href="/about"]');
      // aboutLink.click();
      
      // expect(navigateSpy).toHaveBeenCalledWith('/about');
    });

    it('should NOT intercept a click on an external link', () => {
      // const navigateSpy = mockSpy(router, 'navigate');
      // router.init({});
      
      // const externalLink = document.querySelector('a[href*="external.com"]');
      // // In a real browser test, this would navigate away. Here, we just check our handler.
      // // The mock event won't have a default action to prevent.
      // externalLink.click();
      
      // expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('should call fetch for a new, non-preloaded page on navigate()', async () => {
      // const newPageHtml = '<title>About</title><div id="main-content">About Page</div>';
      // mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(newPageHtml) });
      // await router.navigate('/about');
      // expect(mockFetch).toHaveBeenCalledWith('/about');
    });

    it('should update the main content area with the new page content', async () => {
      // const newPageHtml = '<title>About</title><div id="main-content">About Page Content</div>';
      // mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(newPageHtml) });
      
      // await router.navigate('/about');
      // const mainContent = document.getElementById('main-content');
      // expect(mainContent.textContent).toBe('About Page Content');
    });

    it('should update the document title from the fetched HTML', async () => {
      // const newPageHtml = '<title>New Page Title</title><div id="main-content">...</div>';
      // mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(newPageHtml) });
      // await router.navigate('/new-page');
      // expect(document.title).toBe('New Page Title');
    });

    it('should update the browser history with history.pushState', async () => {
      // const pushStateSpy = mockSpy(history, 'pushState');
      // mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve('<div id="main-content"></div>') });
      // await router.navigate('/about');
      // expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/about');
    });
  });
  
  // == Pre-loading and Caching ==
  describe('Pre-loading and Caching', () => {
    it('should fetch and cache page content on preload()', async () => {
      // const newPageHtml = '<div>Preloaded</div>';
      // mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(newPageHtml) });
      
      // await router.preload('/preloaded-page');
      // expect(mockFetch).toHaveBeenCalledTimes(1);
      // // Verify internal cache (would require exposing a method or checking behavior)
    });

    it('should use cached content on navigate() if a page was preloaded', async () => {
      // const newPageHtml = '<div id="main-content">Cached Content</div>';
      // mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(newPageHtml) });

      // await router.preload('/cached-page');
      // expect(mockFetch).toHaveBeenCalledTimes(1); // Fetched once for preload

      // // Now navigate, it should NOT fetch again
      // await router.navigate('/cached-page');
      // expect(mockFetch).toHaveBeenCalledTimes(1);
      // expect(document.getElementById('main-content').textContent).toBe('Cached Content');
    });
  });

  // == View Controller Initialization ==
  describe('View Initialization', () => {
    it('should call the correct view controller\'s init() method after navigation', async () => {
      // router.init({
      //   '/about': () => import('../../js/views/AboutPage.js')
      // });
      // const aboutPageModule = require('../../js/views/AboutPage.js');
      // const newPageHtml = '<div id="main-content">About Page</div>';
      // mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(newPageHtml) });

      // await router.navigate('/about');

      // // Verify the mocked init function was called
      // expect(aboutPageModule.init).toHaveBeenCalled();
    });
  });
});
```

---

### **Part 2: Blueprint for `I18nService.js` (Internationalization)**

**Module Objective:** To abstract all user-facing strings into a single, manageable system, making future localization possible. It provides a simple `t()` function to retrieve strings by a key.

**Architectural Role:** This is a core Singleton service. It will be used by `Components` and `View Controllers` to render any text that the user will see. This decouples the application's code from its content.

**File: `tests/services/I18nService.test.js`**

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
        // expect(mockFetch).toHaveBeenCalledWith('/locales/en.json');
    });

    it('should throw an error if the locale file fails to load', async () => {
        // mockFetch.mockRejectedValue(new Error('Network Error'));
        // const failedInit = i18nService.init('fr');
        // await expect(failedInit).toThrow('Failed to load locale file for: fr');
    });
  });
  
  // == Translation Function `t()` ==
  describe('t()', () => {
    it('should return the correct string for a simple key', () => {
        // expect(i18nService.t('app.title')).toBe('NSTCG Website');
    });

    it('should return the correct string for a nested key using dot notation', () => {
        // expect(i18nService.t('user.messages.welcome')).toBe('Welcome back!');
    });

    it('should return the key itself if the translation is not found', () => {
        // const key = 'non.existent.key';
        // expect(i18nService.t(key)).toBe(key);
        // This should also produce a console.warn, which can be spied on.
    });

    it('should substitute parameters using {{variable}} syntax', () => {
        // const greeting = i18nService.t('greeting', { name: 'Alice' });
        // expect(greeting).toBe('Hello, Alice!');
    });

    it('should handle multiple substitutions in one string', () => {
        // englishLocale.complex = 'Order {{orderId}} for {{name}}';
        // const result = i18nService.t('complex', { orderId: 123, name: 'Bob' });
        // expect(result).toBe('Order 123 for Bob');
    });

    it('should not replace anything if a parameter is missing', () => {
        // const greeting = i18nService.t('greeting', { user: 'Alice' }); // Wrong param name
        // expect(greeting).toBe('Hello, {{name}}!');
    });
  });
  
  // == Language Switching ==
  describe('loadLanguage()', () => {
      it('should fetch a new locale file and switch the language', async () => {
          // const frenchLocale = { "form.submit": "Rejoindre" };
          // mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(frenchLocale) });
          
          // await i18nService.loadLanguage('fr');
          
          // expect(mockFetch).toHaveBeenCalledWith('/locales/fr.json');
          // expect(i18nService.t('form.submit')).toBe('Rejoindre');
      });

      it('should fall back to the default language if a key is missing in the new language', async () => {
          // const frenchLocale = { "form.submit": "Rejoindre" }; // Missing app.title
          // mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(frenchLocale) });

          // await i18nService.loadLanguage('fr');

          // expect(i18nService.t('app.title')).toBe('NSTCG Website');
      });
  });
});
```

By blueprinting these two modules, you are preparing the application for a multi-view, potentially multi-lingual future. The `Router` provides the chassis for a SPA-like experience, and the `I18nService` ensures that the application's content is decoupled from its code, a hallmark of highly maintainable systems. The agent's task is now clearly defined for these critical architectural components.
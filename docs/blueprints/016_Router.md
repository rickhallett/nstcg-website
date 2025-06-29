[<- Back to Index](./000_master_blueprint.md)

# Blueprint: Router.js

**Objective:** To create a client-side router for a Single-Page Application experience.

**Test Specification:** `tests/core/Router.test.js`

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
      const spy = mockSpy(document.body, 'addEventListener');
      router.init({
        '/about': () => import('../../js/views/AboutPage.js')
      });
      expect(spy).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should handle the popstate event to manage browser back/forward buttons', () => {
      const spy = mockSpy(window, 'addEventListener');
      router.init({});
      expect(spy).toHaveBeenCalledWith('popstate', expect.any(Function));
    });
  });

  // == Navigation & Routing Logic ==
  describe('Navigation', () => {
    it('should intercept a click on an internal link and call navigate()', () => {
      const navigateSpy = mockSpy(router, 'navigate');
      router.init({}); // Initialize with click listener
      
      const aboutLink = document.querySelector('a[href="/about"]');
      aboutLink.click();
      
      expect(navigateSpy).toHaveBeenCalledWith('/about');
    });

    it('should NOT intercept a click on an external link', () => {
      const navigateSpy = mockSpy(router, 'navigate');
      router.init({});
      
      const externalLink = document.querySelector('a[href*="external.com"]');
      // In a real browser test, this would navigate away. Here, we just check our handler.
      // The mock event won't have a default action to prevent.
      externalLink.click();
      
      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('should call fetch for a new, non-preloaded page on navigate()', async () => {
      const newPageHtml = '<title>About</title><div id="main-content">About Page</div>';
      mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(newPageHtml) });
      await router.navigate('/about');
      expect(mockFetch).toHaveBeenCalledWith('/about');
    });

    it('should update the main content area with the new page content', async () => {
      const newPageHtml = '<title>About</title><div id="main-content">About Page Content</div>';
      mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(newPageHtml) });
      
      await router.navigate('/about');
      const mainContent = document.getElementById('main-content');
      expect(mainContent.textContent).toBe('About Page Content');
    });

    it('should update the document title from the fetched HTML', async () => {
      const newPageHtml = '<title>New Page Title</title><div id="main-content">...</div>';
      mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(newPageHtml) });
      await router.navigate('/new-page');
      expect(document.title).toBe('New Page Title');
    });

    it('should update the browser history with history.pushState', async () => {
      const pushStateSpy = mockSpy(history, 'pushState');
      mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve('<div id="main-content"></div>') });
      await router.navigate('/about');
      expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/about');
    });
  });
  
  // == Pre-loading and Caching ==
  describe('Pre-loading and Caching', () => {
    it('should fetch and cache page content on preload()', async () => {
      const newPageHtml = '<div>Preloaded</div>';
      mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(newPageHtml) });
      
      await router.preload('/preloaded-page');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      // Verify internal cache (would require exposing a method or checking behavior)
    });

    it('should use cached content on navigate() if a page was preloaded', async () => {
      const newPageHtml = '<div id="main-content">Cached Content</div>';
      mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(newPageHtml) });

      await router.preload('/cached-page');
      expect(mockFetch).toHaveBeenCalledTimes(1); // Fetched once for preload

      // Now navigate, it should NOT fetch again
      await router.navigate('/cached-page');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(document.getElementById('main-content').textContent).toBe('Cached Content');
    });
  });

  // == View Controller Initialization ==
  describe('View Initialization', () => {
    it('should call the correct view controller\'s init() method after navigation', async () => {
      router.init({
        '/about': () => import('../../js/views/AboutPage.js')
      });
      const aboutPageModule = require('../../js/views/AboutPage.js');
      const newPageHtml = '<div id="main-content">About Page</div>';
      mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve(newPageHtml) });

      await router.navigate('/about');

      // Verify the mocked init function was called
      expect(aboutPageModule.init).toHaveBeenCalled();
    });
  });
});
```

```
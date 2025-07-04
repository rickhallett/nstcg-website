import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { Window } from 'happy-dom';
import { Router } from './Router';
import { EventBus } from '../EventBus';
import { LoggerService } from '../LoggerService';

// Mock route handlers
const homeHandler = mock();
const aboutHandler = mock();
const userHandler = mock();
const notFoundHandler = mock();

describe('Router', () => {
  let window: Window;
  let document: Document;
  let router: Router;
  let eventBus: EventBus;
  let logger: LoggerService;
  
  // Store original window functions
  let originalPushState: any;
  let originalReplaceState: any;

  beforeEach(() => {
    // Set up happy-dom environment
    window = new Window({ url: 'http://localhost/' });
    document = window.document;
    globalThis.document = document;
    globalThis.window = window as any;
    globalThis.location = window.location as any;
    globalThis.history = window.history as any;
    
    // Store original functions
    originalPushState = window.history.pushState;
    originalReplaceState = window.history.replaceState;
    
    // Reset singletons
    EventBus._resetInstance();
    LoggerService._resetInstance();
    
    // Initialize services
    eventBus = EventBus.getInstance();
    logger = LoggerService.getInstance();
    
    // Set logger to debug level
    logger.setLevel('debug');
    
    // Create router
    router = new Router({ eventBus, logger });
    
    // Reset mocks
    homeHandler.mockReset();
    aboutHandler.mockReset();
    userHandler.mockReset();
    notFoundHandler.mockReset();
    
    // Set up document body
    document.body.innerHTML = `
      <div id="app">
        <nav>
          <a href="/" data-route>Home</a>
          <a href="/about" data-route>About</a>
          <a href="/user/123" data-route>User</a>
          <a href="https://external.com">External</a>
        </nav>
        <main id="content"></main>
      </div>
    `;
  });

  afterEach(() => {
    router.stop();
    window.close();
  });

  describe('constructor', () => {
    it('should initialize with configuration', () => {
      expect(router).toBeDefined();
    });
    
    it('should accept custom content selector', () => {
      const customRouter = new Router({
        eventBus,
        logger,
        contentSelector: '#custom-content'
      });
      
      expect(customRouter).toBeDefined();
    });
  });

  describe('IService implementation', () => {
    it('should implement IService interface', () => {
      expect(router.start).toBeDefined();
      expect(router.stop).toBeDefined();
    });

    it('should start successfully', async () => {
      await expect(router.start()).resolves.toBeUndefined();
    });

    it('should stop successfully', async () => {
      await router.start();
      await expect(router.stop()).resolves.toBeUndefined();
    });
  });

  describe('addRoute', () => {
    it('should add a route with exact path', () => {
      router.addRoute('/', homeHandler);
      
      // Route should be stored internally
      expect(router['routes'].size).toBe(1);
    });

    it('should add a route with parameters', () => {
      router.addRoute('/user/:id', userHandler);
      
      expect(router['routes'].size).toBe(1);
    });

    it('should add a route with optional parameters', () => {
      router.addRoute('/post/:id/:slug?', mock());
      
      expect(router['routes'].size).toBe(1);
    });

    it('should add a wildcard route', () => {
      router.addRoute('*', notFoundHandler);
      
      expect(router['routes'].size).toBe(1);
    });

    it('should overwrite existing route', () => {
      const handler1 = mock();
      const handler2 = mock();
      
      router.addRoute('/test', handler1);
      router.addRoute('/test', handler2);
      
      expect(router['routes'].size).toBe(1);
      expect(router['routes'].get('/test')?.handler).toBe(handler2);
    });
  });

  describe('navigate', () => {
    beforeEach(async () => {
      router.addRoute('/', homeHandler);
      router.addRoute('/about', aboutHandler);
      await router.start();
    });

    it('should navigate to a route', async () => {
      await router.navigate('/about');
      
      expect(aboutHandler).toHaveBeenCalledWith({
        path: '/about',
        params: {},
        query: {}
      });
    });

    it('should update browser history', async () => {
      const pushStateSpy = mock();
      window.history.pushState = pushStateSpy;
      
      await router.navigate('/about');
      
      expect(pushStateSpy).toHaveBeenCalledWith(
        { path: '/about' },
        '',
        '/about'
      );
    });

    it('should emit navigation events', async () => {
      const beforeHandler = mock();
      const afterHandler = mock();
      
      eventBus.on('navigation:before', beforeHandler);
      eventBus.on('navigation:after', afterHandler);
      
      await router.navigate('/about');
      
      expect(beforeHandler).toHaveBeenCalledWith({
        from: '/',
        to: '/about'
      });
      
      expect(afterHandler).toHaveBeenCalledWith({
        path: '/about',
        params: {},
        query: {}
      });
    });

    it('should not push to history with replace option', async () => {
      const replaceStateSpy = mock();
      window.history.replaceState = replaceStateSpy;
      
      await router.navigate('/about', { replace: true });
      
      expect(replaceStateSpy).toHaveBeenCalled();
    });

    it('should handle navigation errors', async () => {
      const errorHandler = mock(() => {
        throw new Error('Navigation error');
      });
      
      router.addRoute('/error', errorHandler);
      
      const eventHandler = mock();
      eventBus.on('navigation:error', eventHandler);
      
      await router.navigate('/error');
      
      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/error',
          error: expect.any(Error)
        })
      );
    });
  });

  describe('route matching', () => {
    beforeEach(async () => {
      router.addRoute('/', homeHandler);
      router.addRoute('/user/:id', userHandler);
      router.addRoute('/post/:id/:slug?', mock());
      router.addRoute('*', notFoundHandler);
      await router.start();
    });

    it('should match exact routes', async () => {
      // Clear any calls from router initialization
      homeHandler.mockClear();
      notFoundHandler.mockClear();
      
      await router.navigate('/');
      
      expect(homeHandler).toHaveBeenCalled();
      expect(notFoundHandler).not.toHaveBeenCalled();
    });

    it('should match parameterized routes', async () => {
      await router.navigate('/user/123');
      
      expect(userHandler).toHaveBeenCalledWith({
        path: '/user/123',
        params: { id: '123' },
        query: {}
      });
    });

    it('should handle optional parameters', async () => {
      const handler = mock();
      router.addRoute('/post/:id/:slug?', handler);
      
      await router.navigate('/post/456');
      
      expect(handler).toHaveBeenCalledWith({
        path: '/post/456',
        params: { id: '456' },
        query: {}
      });
    });

    it('should fall back to wildcard route', async () => {
      await router.navigate('/non-existent');
      
      expect(notFoundHandler).toHaveBeenCalledWith({
        path: '/non-existent',
        params: {},
        query: {}
      });
    });

    it('should parse query parameters', async () => {
      await router.navigate('/user/123?tab=profile&sort=asc');
      
      expect(userHandler).toHaveBeenCalledWith({
        path: '/user/123',
        params: { id: '123' },
        query: { tab: 'profile', sort: 'asc' }
      });
    });
  });

  describe('link interception', () => {
    beforeEach(async () => {
      router.addRoute('/', homeHandler);
      router.addRoute('/about', aboutHandler);
      await router.start();
    });

    it('should intercept clicks on route links', async () => {
      const link = document.querySelector('a[href="/about"]') as HTMLAnchorElement;
      
      // Create and dispatch a proper MouseEvent
      const event = new window.MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0
      });
      
      link.dispatchEvent(event);
      
      // Wait for async navigation
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(aboutHandler).toHaveBeenCalled();
    });

    it('should not intercept external links', async () => {
      const link = document.querySelector('a[href="https://external.com"]') as HTMLAnchorElement;
      const preventDefault = mock();
      
      const event = new window.MouseEvent('click', {
        bubbles: true,
        cancelable: true
      });
      Object.defineProperty(event, 'preventDefault', { value: preventDefault });
      
      link.dispatchEvent(event);
      
      expect(preventDefault).not.toHaveBeenCalled();
    });

    it('should not intercept links with target="_blank"', async () => {
      const link = document.createElement('a');
      link.href = '/about';
      link.target = '_blank';
      link.setAttribute('data-route', '');
      document.body.appendChild(link);
      
      const preventDefault = mock();
      const event = new window.MouseEvent('click', {
        bubbles: true,
        cancelable: true
      });
      Object.defineProperty(event, 'preventDefault', { value: preventDefault });
      
      link.dispatchEvent(event);
      
      expect(preventDefault).not.toHaveBeenCalled();
    });

    it('should not intercept modified clicks', async () => {
      const link = document.querySelector('a[href="/about"]') as HTMLAnchorElement;
      
      // Ctrl+click
      const event = new window.MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        ctrlKey: true
      });
      
      link.dispatchEvent(event);
      
      // Should not navigate
      expect(aboutHandler).not.toHaveBeenCalled();
    });
  });

  describe('browser navigation', () => {
    beforeEach(async () => {
      router.addRoute('/', homeHandler);
      router.addRoute('/about', aboutHandler);
      await router.start();
    });

    it('should handle popstate events', async () => {
      // Navigate to create history
      await router.navigate('/about');
      aboutHandler.mockClear();
      
      // Simulate browser back button
      window.history.back();
      window.dispatchEvent(new window.PopStateEvent('popstate', {
        state: { path: '/' }
      }));
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(homeHandler).toHaveBeenCalled();
    });

    it('should handle popstate without state', async () => {
      window.dispatchEvent(new window.PopStateEvent('popstate', {
        state: null
      }));
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should navigate to current pathname
      expect(homeHandler).toHaveBeenCalled();
    });
  });

  describe('route guards', () => {
    it('should support beforeNavigate guard', async () => {
      const guard = mock((context) => {
        if (context.to === '/protected') {
          return false; // Prevent navigation
        }
        return true;
      });
      
      router.beforeNavigate(guard);
      router.addRoute('/protected', mock());
      await router.start();
      
      await router.navigate('/protected');
      
      expect(guard).toHaveBeenCalledWith({
        from: '/',
        to: '/protected'
      });
    });

    it('should cancel navigation if guard returns false', async () => {
      const guard = mock(() => false);
      const handler = mock();
      
      router.beforeNavigate(guard);
      router.addRoute('/blocked', handler);
      await router.start();
      
      await router.navigate('/blocked');
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should emit navigation:cancelled event', async () => {
      const guard = mock(() => false);
      const cancelHandler = mock();
      
      router.beforeNavigate(guard);
      router.addRoute('/blocked', mock());
      eventBus.on('navigation:cancelled', cancelHandler);
      await router.start();
      
      await router.navigate('/blocked');
      
      expect(cancelHandler).toHaveBeenCalledWith({
        from: '/',
        to: '/blocked'
      });
    });
  });

  describe('getCurrentRoute', () => {
    beforeEach(async () => {
      router.addRoute('/user/:id', userHandler);
      await router.start();
    });

    it('should return current route information', async () => {
      await router.navigate('/user/456?tab=posts');
      
      const current = router.getCurrentRoute();
      
      expect(current).toEqual({
        path: '/user/456',
        params: { id: '456' },
        query: { tab: 'posts' }
      });
    });

    it('should return null if no route matched', () => {
      const current = router.getCurrentRoute();
      
      expect(current).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle routes with trailing slashes', async () => {
      router.addRoute('/about', aboutHandler);
      await router.start();
      
      await router.navigate('/about/');
      
      expect(aboutHandler).toHaveBeenCalled();
    });

    it('should handle empty path', async () => {
      router.addRoute('/', homeHandler);
      await router.start();
      
      await router.navigate('');
      
      expect(homeHandler).toHaveBeenCalled();
    });

    it('should handle hash in URL', async () => {
      router.addRoute('/about', aboutHandler);
      await router.start();
      
      await router.navigate('/about#section');
      
      expect(aboutHandler).toHaveBeenCalledWith({
        path: '/about',
        params: {},
        query: {}
      });
    });

    it('should decode URL parameters', async () => {
      router.addRoute('/search/:query', mock());
      await router.start();
      
      const handler = mock();
      router.addRoute('/search/:query', handler);
      
      await router.navigate('/search/hello%20world');
      
      expect(handler).toHaveBeenCalledWith({
        path: '/search/hello%20world',
        params: { query: 'hello world' },
        query: {}
      });
    });
  });
});
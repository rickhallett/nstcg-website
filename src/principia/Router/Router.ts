/**
 * @module Router
 * @description SPA router for Principia.js
 * 
 * Handles client-side routing with support for:
 * - Dynamic route parameters
 * - Query string parsing
 * - Navigation guards
 * - History API integration
 * - Link interception
 * 
 * Follows Principia.js architectural canon:
 * - Events are the Messengers
 * - Services handle external concerns
 */

import type { IService } from '../IService';
import type { EventBus } from '../EventBus';
import type { LoggerService } from '../LoggerService';

/**
 * Router configuration
 */
export interface RouterConfig {
  eventBus: EventBus;
  logger: LoggerService;
  contentSelector?: string;
}

/**
 * Route context passed to handlers
 */
export interface RouteContext {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
}

/**
 * Route handler function
 */
export type RouteHandler = (context: RouteContext) => void | Promise<void>;

/**
 * Navigation guard function
 */
export type NavigationGuard = (context: { from: string; to: string }) => boolean | Promise<boolean>;

/**
 * Internal route representation
 */
interface Route {
  pattern: string;
  regex: RegExp;
  paramNames: string[];
  handler: RouteHandler;
}

/**
 * Navigation options
 */
export interface NavigationOptions {
  replace?: boolean;
}

/**
 * SPA Router service
 * 
 * @class Router
 * @implements {IService}
 */
export class Router implements IService {
  private eventBus: EventBus;
  private logger: LoggerService;
  private contentSelector: string;
  private routes: Map<string, Route> = new Map();
  private currentRoute: RouteContext | null = null;
  private guards: NavigationGuard[] = [];
  private clickHandler: ((e: Event) => void) | null = null;
  private popstateHandler: ((e: PopStateEvent) => void) | null = null;

  /**
   * Create a new Router instance
   * 
   * @param config Router configuration
   */
  constructor(config: RouterConfig) {
    this.eventBus = config.eventBus;
    this.logger = config.logger;
    this.contentSelector = config.contentSelector || '#content';
  }

  /**
   * Start the router
   */
  async start(): Promise<void> {
    // Set up event listeners
    this.setupEventListeners();
    
    // Handle initial route
    await this.handleCurrentLocation();
    
    this.logger.info('Router started');
  }

  /**
   * Stop the router
   */
  async stop(): Promise<void> {
    // Remove event listeners
    this.removeEventListeners();
    
    this.logger.info('Router stopped');
  }

  /**
   * Add a route
   * 
   * @param pattern Route pattern (e.g., '/user/:id')
   * @param handler Route handler function
   */
  addRoute(pattern: string, handler: RouteHandler): void {
    const route = this.compileRoute(pattern);
    route.handler = handler;
    
    this.routes.set(pattern, route);
    this.logger.debug(`Route added: ${pattern}`);
  }

  /**
   * Navigate to a path
   * 
   * @param path Path to navigate to
   * @param options Navigation options
   */
  async navigate(path: string, options: NavigationOptions = {}): Promise<void> {
    try {
      // Normalize path
      path = this.normalizePath(path);
      
      // Get current path
      const fromPath = this.currentRoute?.path || '/';
      
      // Check guards
      const canNavigate = await this.checkGuards(fromPath, path);
      if (!canNavigate) {
        this.eventBus.emit('navigation:cancelled', { from: fromPath, to: path });
        return;
      }
      
      // Emit before navigation event
      this.eventBus.emit('navigation:before', { from: fromPath, to: path });
      
      // Update URL
      if (options.replace) {
        window.history.replaceState({ path }, '', path);
      } else {
        window.history.pushState({ path }, '', path);
      }
      
      // Handle the route
      await this.handleRoute(path);
      
    } catch (error) {
      this.logger.error('Navigation error', { path, error });
      this.eventBus.emit('navigation:error', { path, error });
    }
  }

  /**
   * Add a navigation guard
   * 
   * @param guard Navigation guard function
   */
  beforeNavigate(guard: NavigationGuard): void {
    this.guards.push(guard);
  }

  /**
   * Get current route information
   * 
   * @returns Current route context or null
   */
  getCurrentRoute(): RouteContext | null {
    return this.currentRoute;
  }

  /**
   * Set up event listeners
   * 
   * @private
   */
  private setupEventListeners(): void {
    // Handle link clicks
    this.clickHandler = (e: Event) => this.handleClick(e);
    document.addEventListener('click', this.clickHandler);
    
    // Handle browser navigation
    this.popstateHandler = (e: PopStateEvent) => this.handlePopState(e);
    window.addEventListener('popstate', this.popstateHandler);
  }

  /**
   * Remove event listeners
   * 
   * @private
   */
  private removeEventListeners(): void {
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler);
      this.clickHandler = null;
    }
    
    if (this.popstateHandler) {
      window.removeEventListener('popstate', this.popstateHandler);
      this.popstateHandler = null;
    }
  }

  /**
   * Handle link clicks
   * 
   * @private
   */
  private handleClick(e: Event): void {
    // Check if it's a left click on an anchor
    if (!(e instanceof MouseEvent) || e.button !== 0) return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    
    const target = e.target as HTMLElement;
    const anchor = target.closest('a') as HTMLAnchorElement;
    
    if (!anchor || !anchor.hasAttribute('data-route')) return;
    
    // Check for external links
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('http') || anchor.target === '_blank') return;
    
    // Prevent default and navigate
    e.preventDefault();
    this.logger.debug('Link clicked, navigating to:', href);
    this.navigate(href);
  }

  /**
   * Handle browser back/forward
   * 
   * @private
   */
  private handlePopState(e: PopStateEvent): void {
    const path = e.state?.path || window.location.pathname;
    this.handleRoute(path);
  }

  /**
   * Handle current location
   * 
   * @private
   */
  private async handleCurrentLocation(): Promise<void> {
    const path = window.location.pathname || '/';
    await this.handleRoute(path);
  }

  /**
   * Handle a route
   * 
   * @private
   */
  private async handleRoute(path: string): Promise<void> {
    try {
      // Normalize path
      path = this.normalizePath(path);
      
      // Parse query string
      const [pathname, queryString] = path.split('?');
      const query = this.parseQueryString(queryString || '');
      
      // Find matching route
      const match = this.findMatchingRoute(pathname);
      
      if (match) {
        const context: RouteContext = {
          path: pathname,
          params: match.params,
          query
        };
        
        this.logger.debug(`Executing handler for route: ${match.route.pattern}`, context);
        
        // Store current route
        this.currentRoute = context;
        
        // Execute handler
        await match.route.handler(context);
        
        // Emit after navigation event
        this.eventBus.emit('navigation:after', context);
      } else {
        this.logger.debug(`No route found for path: ${pathname}`);
      }
      
    } catch (error) {
      this.logger.error('Route handling error', { path, error });
      this.eventBus.emit('navigation:error', { path, error });
    }
  }

  /**
   * Find matching route for a path
   * 
   * @private
   */
  private findMatchingRoute(path: string): { route: Route; params: Record<string, string> } | null {
    // Debug logging
    this.logger.debug(`Finding route for path: ${path}`);
    this.logger.debug(`Available routes: ${Array.from(this.routes.keys()).join(', ')}`);
    
    // Try exact match first (but not wildcard)
    for (const [pattern, route] of this.routes) {
      if (pattern === path && pattern !== '*') {
        this.logger.debug(`Exact match found: ${pattern}`);
        return { route, params: {} };
      }
    }
    
    // Try pattern matching
    for (const [pattern, route] of this.routes) {
      if (pattern === '*') continue; // Skip wildcard in this pass
      
      this.logger.debug(`Testing pattern ${pattern} with regex ${route.regex}`);
      const match = path.match(route.regex);
      if (match) {
        const params: Record<string, string> = {};
        
        // Extract parameters
        route.paramNames.forEach((name, index) => {
          const value = match[index + 1];
          if (value !== undefined) {
            params[name] = decodeURIComponent(value);
          }
        });
        
        this.logger.debug(`Pattern match found: ${pattern} with params:`, params);
        return { route, params };
      }
    }
    
    // Try wildcard route
    const wildcardRoute = this.routes.get('*');
    if (wildcardRoute) {
      this.logger.debug('Using wildcard route');
      return { route: wildcardRoute, params: {} };
    }
    
    this.logger.debug('No route found');
    return null;
  }

  /**
   * Compile a route pattern into a regex
   * 
   * @private
   */
  private compileRoute(pattern: string): Route {
    // Handle wildcard
    if (pattern === '*') {
      return {
        pattern,
        regex: /.*/,
        paramNames: [],
        handler: () => {}
      };
    }
    
    // Debug initial pattern
    this.logger.debug(`Compiling route ${pattern}:`);
    
    const paramNames: string[] = [];
    let regexParts: string[] = [];
    let lastIndex = 0;
    
    // Find all parameters
    const paramRegex = /:(\w+)(\?)?/g;
    let match;
    
    while ((match = paramRegex.exec(pattern)) !== null) {
      const [fullMatch, name, optional] = match;
      
      this.logger.debug(`  Found ${optional ? 'optional' : 'required'} param: ${fullMatch} -> ${name}`);
      paramNames.push(name);
      
      // Add the static part before the parameter
      const staticPart = pattern.slice(lastIndex, match.index);
      if (staticPart) {
        // For optional parameters, include the preceding / in the optional group
        if (optional && staticPart.endsWith('/')) {
          regexParts.push(staticPart.slice(0, -1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
          regexParts.push('(?:/([^/]+))?');
        } else {
          // Escape special regex characters in static parts
          regexParts.push(staticPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
          // Add the parameter pattern
          if (optional) {
            regexParts.push('(?:/([^/]+))?');
          } else {
            regexParts.push('([^/]+)');
          }
        }
      } else {
        // No static part, just add the parameter pattern
        if (optional) {
          regexParts.push('(?:/([^/]+))?');
        } else {
          regexParts.push('([^/]+)');
        }
      }
      
      lastIndex = match.index + fullMatch.length;
    }
    
    // Add any remaining static part
    if (lastIndex < pattern.length) {
      const staticPart = pattern.slice(lastIndex);
      regexParts.push(staticPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    }
    
    // Build final regex
    const regexPattern = '^' + regexParts.join('') + '$';
    const regex = new RegExp(regexPattern);
    
    this.logger.debug(`  Param names: ${paramNames.join(', ')}`);
    this.logger.debug(`  Final regex: ${regex}`);
    
    return {
      pattern,
      regex,
      paramNames,
      handler: () => {}
    };
  }

  /**
   * Normalize a path
   * 
   * @private
   */
  private normalizePath(path: string): string {
    // Remove hash
    path = path.split('#')[0];
    
    // Ensure leading slash
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    // Remove trailing slash (except for root)
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    
    return path;
  }

  /**
   * Parse query string
   * 
   * @private
   */
  private parseQueryString(queryString: string): Record<string, string> {
    const params: Record<string, string> = {};
    
    if (!queryString) return params;
    
    const pairs = queryString.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key) {
        params[decodeURIComponent(key)] = decodeURIComponent(value || '');
      }
    }
    
    return params;
  }

  /**
   * Check navigation guards
   * 
   * @private
   */
  private async checkGuards(from: string, to: string): Promise<boolean> {
    for (const guard of this.guards) {
      const canNavigate = await guard({ from, to });
      if (!canNavigate) {
        return false;
      }
    }
    return true;
  }
}
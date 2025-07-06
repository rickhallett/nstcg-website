/**
 * @module Analytics
 * @description Analytics tracking and reporting system
 * 
 * Provides event tracking, user behavior analysis,
 * and custom metrics collection.
 */

import { EventBus } from '../EventBus/EventBus';

/**
 * Analytics event
 */
export interface AnalyticsEvent {
  id: string;
  name: string;
  category: string;
  timestamp: number;
  properties?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  metadata?: EventMetadata;
}

/**
 * Event metadata
 */
export interface EventMetadata {
  source?: string;
  version?: string;
  environment?: string;
  platform?: string;
  screen?: {
    width: number;
    height: number;
  };
  referrer?: string;
  utm?: UTMParams;
}

/**
 * UTM parameters
 */
export interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

/**
 * User properties
 */
export interface UserProperties {
  id: string;
  traits?: Record<string, any>;
  createdAt?: number;
  lastSeen?: number;
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  /**
   * Enable analytics
   */
  enabled?: boolean;
  
  /**
   * Analytics provider adapters
   */
  providers?: AnalyticsProvider[];
  
  /**
   * Default event properties
   */
  defaultProperties?: Record<string, any>;
  
  /**
   * Session timeout (ms)
   */
  sessionTimeout?: number;
  
  /**
   * Track page views automatically
   */
  autoTrackPageViews?: boolean;
  
  /**
   * Track errors automatically
   */
  autoTrackErrors?: boolean;
  
  /**
   * Event validators
   */
  validators?: EventValidator[];
  
  /**
   * Event transformers
   */
  transformers?: EventTransformer[];
  
  /**
   * Batch events
   */
  batchEvents?: boolean;
  
  /**
   * Batch size
   */
  batchSize?: number;
  
  /**
   * Batch interval (ms)
   */
  batchInterval?: number;
}

/**
 * Analytics provider interface
 */
export interface AnalyticsProvider {
  name: string;
  track(event: AnalyticsEvent): void | Promise<void>;
  identify?(user: UserProperties): void | Promise<void>;
  page?(properties: Record<string, any>): void | Promise<void>;
  flush?(): void | Promise<void>;
}

/**
 * Event validator
 */
export interface EventValidator {
  test: (event: AnalyticsEvent) => boolean;
  validate: (event: AnalyticsEvent) => boolean | string;
}

/**
 * Event transformer
 */
export interface EventTransformer {
  test: (event: AnalyticsEvent) => boolean;
  transform: (event: AnalyticsEvent) => AnalyticsEvent;
}

/**
 * Analytics report
 */
export interface AnalyticsReport {
  timestamp: number;
  events: {
    total: number;
    byCategory: Record<string, number>;
    byName: Record<string, number>;
    topEvents: Array<{ name: string; count: number }>;
  };
  users: {
    total: number;
    active: number;
    new: number;
  };
  sessions: {
    total: number;
    avgDuration: number;
    bounceRate: number;
  };
}

/**
 * Session data
 */
interface SessionData {
  id: string;
  startTime: number;
  lastActivity: number;
  eventCount: number;
  pageViews: number;
}

/**
 * Analytics class
 */
export class Analytics {
  private static instance: Analytics | null = null;
  
  private enabled: boolean;
  private providers: AnalyticsProvider[];
  private defaultProperties: Record<string, any>;
  private sessionTimeout: number;
  private autoTrackPageViews: boolean;
  private autoTrackErrors: boolean;
  private validators: EventValidator[];
  private transformers: EventTransformer[];
  private batchEvents: boolean;
  private batchSize: number;
  private batchInterval: number;
  
  private eventQueue: AnalyticsEvent[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private currentUser: UserProperties | null = null;
  private currentSession: SessionData | null = null;
  private sessionTimer: NodeJS.Timeout | null = null;
  private eventCounts: Map<string, number> = new Map();
  private users: Set<string> = new Set();
  
  private constructor(config: AnalyticsConfig = {}) {
    this.enabled = config.enabled ?? true;
    this.providers = config.providers ?? [];
    this.defaultProperties = config.defaultProperties ?? {};
    this.sessionTimeout = config.sessionTimeout ?? 1800000; // 30 minutes
    this.autoTrackPageViews = config.autoTrackPageViews ?? true;
    this.autoTrackErrors = config.autoTrackErrors ?? true;
    this.validators = config.validators ?? [];
    this.transformers = config.transformers ?? [];
    this.batchEvents = config.batchEvents ?? true;
    this.batchSize = config.batchSize ?? 100;
    this.batchInterval = config.batchInterval ?? 5000; // 5 seconds
    
    if (this.enabled) {
      this.initialize();
    }
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(config?: AnalyticsConfig): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics(config);
    }
    return Analytics.instance;
  }
  
  /**
   * Reset instance (for testing)
   */
  public static resetInstance(): void {
    if (Analytics.instance) {
      Analytics.instance.destroy();
      Analytics.instance = null;
    }
  }
  
  /**
   * Track an event
   */
  public track(
    name: string,
    properties?: Record<string, any>,
    category: string = 'custom'
  ): void {
    if (!this.enabled) return;
    
    const event: AnalyticsEvent = {
      id: this.generateId(),
      name,
      category,
      timestamp: Date.now(),
      properties: {
        ...this.defaultProperties,
        ...properties
      },
      userId: this.currentUser?.id,
      sessionId: this.currentSession?.id,
      metadata: this.getMetadata()
    };
    
    // Validate event
    const validation = this.validateEvent(event);
    if (validation !== true) {
      console.warn(`[Analytics] Event validation failed: ${validation}`);
      return;
    }
    
    // Transform event
    const transformed = this.transformEvent(event);
    
    // Update counts
    this.updateEventCounts(transformed);
    
    // Update session
    this.updateSession();
    
    // Queue or send event
    if (this.batchEvents) {
      this.queueEvent(transformed);
    } else {
      this.sendEvent(transformed);
    }
    
    // Emit event
    EventBus.getInstance().emit('analytics:track', transformed);
  }
  
  /**
   * Track page view
   */
  public page(properties?: Record<string, any>): void {
    if (!this.enabled) return;
    
    const pageProps = {
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      title: typeof document !== 'undefined' ? document.title : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      ...properties
    };
    
    this.track('Page View', pageProps, 'page');
    
    // Update session page views
    if (this.currentSession) {
      this.currentSession.pageViews++;
    }
    
    // Call provider page methods
    for (const provider of this.providers) {
      if (provider.page) {
        try {
          provider.page(pageProps);
        } catch (error) {
          console.error(`[Analytics] Provider ${provider.name} page error:`, error);
        }
      }
    }
  }
  
  /**
   * Identify user
   */
  public identify(userId: string, traits?: Record<string, any>): void {
    if (!this.enabled) return;
    
    this.currentUser = {
      id: userId,
      traits,
      createdAt: this.currentUser?.createdAt ?? Date.now(),
      lastSeen: Date.now()
    };
    
    // Track new users
    if (!this.users.has(userId)) {
      this.users.add(userId);
      this.track('User Signup', traits, 'user');
    }
    
    // Call provider identify methods
    for (const provider of this.providers) {
      if (provider.identify) {
        try {
          provider.identify(this.currentUser);
        } catch (error) {
          console.error(`[Analytics] Provider ${provider.name} identify error:`, error);
        }
      }
    }
    
    EventBus.getInstance().emit('analytics:identify', this.currentUser);
  }
  
  /**
   * Track custom metric
   */
  public metric(name: string, value: number, unit?: string): void {
    this.track('Metric', { name, value, unit }, 'metric');
  }
  
  /**
   * Track timing
   */
  public timing(category: string, variable: string, value: number): void {
    this.track('Timing', { category, variable, value }, 'timing');
  }
  
  /**
   * Track error
   */
  public trackError(error: Error | string, fatal: boolean = false): void {
    const errorData = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      fatal
    };
    
    this.track('Error', errorData, 'error');
  }
  
  /**
   * Get analytics report
   */
  public getReport(): AnalyticsReport {
    const events = Array.from(this.eventCounts.entries());
    const totalEvents = events.reduce((sum, [, count]) => sum + count, 0);
    
    // Group by category and name
    const byCategory: Record<string, number> = {};
    const byName: Record<string, number> = {};
    
    for (const [key, count] of events) {
      const [category, name] = key.split(':');
      byCategory[category] = (byCategory[category] || 0) + count;
      byName[name] = (byName[name] || 0) + count;
    }
    
    // Get top events
    const topEvents = Object.entries(byName)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
    
    return {
      timestamp: Date.now(),
      events: {
        total: totalEvents,
        byCategory,
        byName,
        topEvents
      },
      users: {
        total: this.users.size,
        active: this.currentUser ? 1 : 0,
        new: 0 // Would need time-based tracking
      },
      sessions: {
        total: 1, // Would need persistent tracking
        avgDuration: this.currentSession ? 
          Date.now() - this.currentSession.startTime : 0,
        bounceRate: 0 // Would need more sophisticated tracking
      }
    };
  }
  
  /**
   * Flush event queue
   */
  public flush(): void {
    if (this.eventQueue.length > 0) {
      this.sendBatch();
    }
    
    // Call provider flush methods
    for (const provider of this.providers) {
      if (provider.flush) {
        try {
          provider.flush();
        } catch (error) {
          console.error(`[Analytics] Provider ${provider.name} flush error:`, error);
        }
      }
    }
  }
  
  /**
   * Reset analytics
   */
  public reset(): void {
    this.currentUser = null;
    this.currentSession = null;
    this.eventQueue = [];
    this.eventCounts.clear();
    
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
  }
  
  /**
   * Set enabled state
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    if (!enabled) {
      this.flush();
      this.reset();
    } else {
      this.initialize();
    }
  }
  
  /**
   * Add provider
   */
  public addProvider(provider: AnalyticsProvider): void {
    this.providers.push(provider);
  }
  
  /**
   * Remove provider
   */
  public removeProvider(name: string): void {
    this.providers = this.providers.filter(p => p.name !== name);
  }
  
  /**
   * Initialize analytics
   */
  private initialize(): void {
    this.startSession();
    this.setupBatching();
    this.setupAutoTracking();
    this.parseUTMParams();
  }
  
  /**
   * Start session
   */
  private startSession(): void {
    this.currentSession = {
      id: this.generateId(),
      startTime: Date.now(),
      lastActivity: Date.now(),
      eventCount: 0,
      pageViews: 0
    };
    
    this.resetSessionTimer();
    
    EventBus.getInstance().emit('analytics:session-start', this.currentSession);
  }
  
  /**
   * Update session
   */
  private updateSession(): void {
    if (!this.currentSession) {
      this.startSession();
      return;
    }
    
    this.currentSession.lastActivity = Date.now();
    this.currentSession.eventCount++;
    
    this.resetSessionTimer();
  }
  
  /**
   * Reset session timer
   */
  private resetSessionTimer(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }
    
    this.sessionTimer = setTimeout(() => {
      this.endSession();
    }, this.sessionTimeout);
  }
  
  /**
   * End session
   */
  private endSession(): void {
    if (this.currentSession) {
      const duration = Date.now() - this.currentSession.startTime;
      
      this.track('Session End', {
        duration,
        eventCount: this.currentSession.eventCount,
        pageViews: this.currentSession.pageViews
      }, 'session');
      
      EventBus.getInstance().emit('analytics:session-end', this.currentSession);
    }
    
    this.currentSession = null;
  }
  
  /**
   * Setup batching
   */
  private setupBatching(): void {
    if (!this.batchEvents) return;
    
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    
    this.batchTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.sendBatch();
      }
    }, this.batchInterval);
  }
  
  /**
   * Setup auto tracking
   */
  private setupAutoTracking(): void {
    if (this.autoTrackPageViews && typeof window !== 'undefined') {
      // Track initial page view
      this.page();
      
      // Track route changes (for SPAs)
      window.addEventListener('popstate', () => this.page());
    }
    
    if (this.autoTrackErrors) {
      EventBus.getInstance().on('error:tracked', (error: any) => {
        this.trackError(error.message, error.severity === 'critical');
      });
    }
  }
  
  /**
   * Parse UTM parameters
   */
  private parseUTMParams(): void {
    if (typeof window === 'undefined') return;
    
    const params = new URLSearchParams(window.location.search);
    const utm: UTMParams = {};
    
    ['source', 'medium', 'campaign', 'term', 'content'].forEach(param => {
      const value = params.get(`utm_${param}`);
      if (value) {
        utm[param as keyof UTMParams] = value;
      }
    });
    
    if (Object.keys(utm).length > 0) {
      this.defaultProperties.utm = utm;
    }
  }
  
  /**
   * Get metadata
   */
  private getMetadata(): EventMetadata {
    const metadata: EventMetadata = {
      source: 'web',
      version: '1.0.0',
      environment: 'production'
    };
    
    if (typeof window !== 'undefined') {
      metadata.platform = window.navigator.platform;
      metadata.screen = {
        width: window.screen.width,
        height: window.screen.height
      };
      
      if (document.referrer) {
        metadata.referrer = document.referrer;
      }
    }
    
    return metadata;
  }
  
  /**
   * Validate event
   */
  private validateEvent(event: AnalyticsEvent): boolean | string {
    for (const validator of this.validators) {
      if (validator.test(event)) {
        const result = validator.validate(event);
        if (result !== true) {
          return result;
        }
      }
    }
    
    return true;
  }
  
  /**
   * Transform event
   */
  private transformEvent(event: AnalyticsEvent): AnalyticsEvent {
    let transformed = event;
    
    for (const transformer of this.transformers) {
      if (transformer.test(transformed)) {
        transformed = transformer.transform(transformed);
      }
    }
    
    return transformed;
  }
  
  /**
   * Update event counts
   */
  private updateEventCounts(event: AnalyticsEvent): void {
    const key = `${event.category}:${event.name}`;
    const count = this.eventCounts.get(key) || 0;
    this.eventCounts.set(key, count + 1);
  }
  
  /**
   * Queue event
   */
  private queueEvent(event: AnalyticsEvent): void {
    this.eventQueue.push(event);
    
    if (this.eventQueue.length >= this.batchSize) {
      this.sendBatch();
    }
  }
  
  /**
   * Send event
   */
  private sendEvent(event: AnalyticsEvent): void {
    for (const provider of this.providers) {
      try {
        provider.track(event);
      } catch (error) {
        console.error(`[Analytics] Provider ${provider.name} error:`, error);
      }
    }
  }
  
  /**
   * Send batch
   */
  private sendBatch(): void {
    const batch = [...this.eventQueue];
    this.eventQueue = [];
    
    for (const event of batch) {
      this.sendEvent(event);
    }
  }
  
  /**
   * Generate ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Destroy analytics
   */
  private destroy(): void {
    this.flush();
    
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
    
    this.reset();
  }
}

/**
 * Global analytics functions
 */
export function track(name: string, properties?: Record<string, any>): void {
  Analytics.getInstance().track(name, properties);
}

export function identify(userId: string, traits?: Record<string, any>): void {
  Analytics.getInstance().identify(userId, traits);
}

export function page(properties?: Record<string, any>): void {
  Analytics.getInstance().page(properties);
}
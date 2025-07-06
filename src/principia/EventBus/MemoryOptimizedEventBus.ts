/**
 * @module MemoryOptimizedEventBus
 * @description EventBus with advanced memory leak prevention and optimization
 * 
 * Extends ManagedEventBus with additional memory management features:
 * - Handler count limits per event and globally
 * - Stale handler cleanup based on last call time
 * - Event TTL (time-to-live) support
 * - Memory pressure handling
 * - Automatic cleanup scheduling
 * - Memory leak detection
 * - Handler deduplication
 */

import { ManagedEventBus } from './ManagedEventBus';
import { EventHandler, EventName } from './EventBus';
import { LoggerService } from '../LoggerService';

/**
 * Handler metadata for tracking
 */
interface HandlerMetadata {
  handler: EventHandler;
  owner?: object;
  addedAt: number;
  lastCalled: number;
  callCount: number;
  ttl?: number;
  onExpire?: (eventName: string, handler: EventHandler) => void;
}

/**
 * Memory configuration options
 */
export interface MemoryConfig {
  maxHandlersPerEvent: number;
  maxTotalHandlers: number;
  staleHandlerTimeout: number;
  autoCleanupInterval: number;
  enableDeduplication: boolean;
  enableMemoryWarnings: boolean;
  memoryWarningThreshold: number;
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  totalHandlers: number;
  eventCount: number;
  oldestHandler: number;
  newestHandler: number;
  warningLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Memory warning event
 */
export interface MemoryWarning {
  type: 'handler-limit-exceeded' | 'memory-threshold' | 'potential-leak';
  eventName?: string;
  limit?: number;
  actual?: number;
  message?: string;
}

/**
 * Potential memory leak info
 */
export interface PotentialLeak {
  eventName: string;
  handlerCount: number;
  oldestHandlerAge: number;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Handler options
 */
export interface HandlerOptions {
  ttl?: number;
  owner?: object;
  onExpire?: (eventName: string, handler: EventHandler) => void;
}

/**
 * MemoryOptimizedEventBus - Advanced memory management for events
 */
export class MemoryOptimizedEventBus extends ManagedEventBus {
  private static optimizedInstance: MemoryOptimizedEventBus | null = null;
  private handlerMetadata: Map<EventName, HandlerMetadata[]> = new Map();
  private config: MemoryConfig = {
    maxHandlersPerEvent: 100,
    maxTotalHandlers: 1000,
    staleHandlerTimeout: 3600000, // 1 hour
    autoCleanupInterval: 300000, // 5 minutes
    enableDeduplication: true,
    enableMemoryWarnings: true,
    memoryWarningThreshold: 0.8
  };
  private cleanupTimer: any = null;
  private memoryWarningCallbacks: Set<(warning: MemoryWarning) => void> = new Set();
  private logger: LoggerService;
  
  private constructor() {
    super();
    this.logger = LoggerService.getInstance();
  }
  
  public static getInstance(): MemoryOptimizedEventBus {
    if (!MemoryOptimizedEventBus.optimizedInstance) {
      MemoryOptimizedEventBus.optimizedInstance = new MemoryOptimizedEventBus();
    }
    return MemoryOptimizedEventBus.optimizedInstance;
  }
  
  public static _resetInstance(): void {
    if (MemoryOptimizedEventBus.optimizedInstance) {
      MemoryOptimizedEventBus.optimizedInstance.stopAutoCleanup();
    }
    MemoryOptimizedEventBus.optimizedInstance = null;
    ManagedEventBus._resetInstance();
  }
  
  /**
   * Subscribe to an event with memory optimization
   */
  public on(eventName: EventName, handler: EventHandler, ownerOrOptions?: object | HandlerOptions): () => void {
    // Parse options
    let owner: object | undefined;
    let options: HandlerOptions = {};
    
    if (ownerOrOptions) {
      if ('ttl' in ownerOrOptions || 'owner' in ownerOrOptions || 'onExpire' in ownerOrOptions) {
        options = ownerOrOptions as HandlerOptions;
        owner = options.owner;
      } else {
        owner = ownerOrOptions as object;
      }
    }
    
    // Check limits
    if (!this.checkLimits(eventName)) {
      return () => {}; // Return no-op unsubscribe
    }
    
    // Deduplicate if enabled
    if (this.config.enableDeduplication && this.isDuplicateHandler(eventName, handler)) {
      return () => {}; // Return no-op unsubscribe
    }
    
    // Create metadata
    const metadata: HandlerMetadata = {
      handler,
      owner,
      addedAt: Date.now(),
      lastCalled: 0,
      callCount: 0,
      ttl: options.ttl,
      onExpire: options.onExpire
    };
    
    // Store metadata
    if (!this.handlerMetadata.has(eventName)) {
      this.handlerMetadata.set(eventName, []);
    }
    this.handlerMetadata.get(eventName)!.push(metadata);
    
    // Schedule TTL cleanup if needed
    if (options.ttl) {
      setTimeout(() => this.removeExpiredHandler(eventName, handler, options.onExpire), options.ttl);
    }
    
    // Call parent implementation
    const unsubscribe = super.on(eventName, handler, owner);
    
    // Wrap unsubscribe to also remove metadata
    return () => {
      unsubscribe();
      this.removeHandlerMetadata(eventName, handler);
    };
  }
  
  /**
   * Emit event and track handler calls
   */
  public emit(eventName: EventName, payload?: any): void {
    const now = Date.now();
    const metadataList = this.handlerMetadata.get(eventName);
    
    if (metadataList) {
      metadataList.forEach(metadata => {
        metadata.lastCalled = now;
        metadata.callCount++;
      });
    }
    
    super.emit(eventName, payload);
  }
  
  /**
   * Get memory configuration
   */
  public getMemoryConfig(): MemoryConfig {
    return { ...this.config };
  }
  
  /**
   * Set memory configuration
   */
  public setMemoryConfig(config: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Get memory statistics
   */
  public getMemoryStats(): MemoryStats {
    let totalHandlers = 0;
    let oldestHandler = Infinity;
    let newestHandler = 0;
    
    for (const metadataList of this.handlerMetadata.values()) {
      totalHandlers += metadataList.length;
      for (const metadata of metadataList) {
        oldestHandler = Math.min(oldestHandler, metadata.addedAt);
        newestHandler = Math.max(newestHandler, metadata.addedAt);
      }
    }
    
    const usage = totalHandlers / this.config.maxTotalHandlers;
    let warningLevel: MemoryStats['warningLevel'] = 'low';
    if (usage > 0.9) warningLevel = 'critical';
    else if (usage > 0.8) warningLevel = 'high';
    else if (usage > 0.6) warningLevel = 'medium';
    
    return {
      totalHandlers,
      eventCount: this.handlerMetadata.size,
      oldestHandler: oldestHandler === Infinity ? 0 : oldestHandler,
      newestHandler,
      warningLevel
    };
  }
  
  /**
   * Get handler statistics for an event
   */
  public getHandlerStats(eventName: EventName): {
    handlers: Array<{
      addedAt: number;
      lastCalled: number;
      callCount: number;
    }>;
  } {
    const metadataList = this.handlerMetadata.get(eventName) || [];
    return {
      handlers: metadataList.map(m => ({
        addedAt: m.addedAt,
        lastCalled: m.lastCalled,
        callCount: m.callCount
      }))
    };
  }
  
  /**
   * Clean up stale handlers
   */
  public cleanStaleHandlers(): number {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [eventName, metadataList] of this.handlerMetadata.entries()) {
      const toRemove: HandlerMetadata[] = [];
      
      for (const metadata of metadataList) {
        // Never called or stale
        if (metadata.callCount === 0 && 
            (now - metadata.addedAt) > this.config.staleHandlerTimeout) {
          toRemove.push(metadata);
        } else if (metadata.lastCalled > 0 && 
                   (now - metadata.lastCalled) > this.config.staleHandlerTimeout) {
          toRemove.push(metadata);
        }
      }
      
      // Remove stale handlers
      for (const metadata of toRemove) {
        this.off(eventName, metadata.handler);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }
  
  /**
   * Handle memory pressure
   */
  public handleMemoryPressure(level: 'low' | 'medium' | 'high' | 'critical'): void {
    const stats = this.getMemoryStats();
    let targetReduction = 0;
    
    switch (level) {
      case 'critical':
        targetReduction = 0.5; // Remove 50%
        break;
      case 'high':
        targetReduction = 0.3; // Remove 30%
        break;
      case 'medium':
        targetReduction = 0.1; // Remove 10%
        break;
      default:
        return; // No action for low
    }
    
    const targetCount = Math.floor(stats.totalHandlers * (1 - targetReduction));
    this.reduceHandlersTo(targetCount);
  }
  
  /**
   * Start automatic cleanup
   */
  public startAutoCleanup(): void {
    if (this.cleanupTimer) return;
    
    this.cleanupTimer = setInterval(() => {
      this.cleanStaleHandlers();
      this.cleanExpiredHandlers();
      
      // Check for memory warnings
      const stats = this.getMemoryStats();
      const usage = stats.totalHandlers / this.config.maxTotalHandlers;
      
      if (usage > this.config.memoryWarningThreshold) {
        this.emitMemoryWarning({
          type: 'memory-threshold',
          message: `Memory usage at ${Math.round(usage * 100)}%`
        });
      }
    }, this.config.autoCleanupInterval);
  }
  
  /**
   * Stop automatic cleanup
   */
  public stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
  
  /**
   * Register memory warning callback
   */
  public onMemoryWarning(callback: (warning: MemoryWarning) => void): () => void {
    this.memoryWarningCallbacks.add(callback);
    return () => this.memoryWarningCallbacks.delete(callback);
  }
  
  /**
   * Detect potential memory leaks
   */
  public detectPotentialLeaks(): PotentialLeak[] {
    const leaks: PotentialLeak[] = [];
    const now = Date.now();
    
    for (const [eventName, metadataList] of this.handlerMetadata.entries()) {
      if (metadataList.length > 20) { // Suspicious number of handlers
        const oldestAge = now - Math.min(...metadataList.map(m => m.addedAt));
        let severity: PotentialLeak['severity'] = 'low';
        
        if (metadataList.length >= 100) severity = 'high';
        else if (metadataList.length >= 50) severity = 'medium';
        
        leaks.push({
          eventName,
          handlerCount: metadataList.length,
          oldestHandlerAge: oldestAge,
          severity
        });
      }
    }
    
    return leaks;
  }
  
  /**
   * Get detailed memory report
   */
  public getDetailedMemoryReport() {
    const events: Record<string, any> = {};
    
    for (const [eventName, metadataList] of this.handlerMetadata.entries()) {
      events[eventName] = {
        handlerCount: metadataList.length,
        totalCalls: metadataList.reduce((sum, m) => sum + m.callCount, 0),
        averageCallsPerHandler: metadataList.length > 0 
          ? metadataList.reduce((sum, m) => sum + m.callCount, 0) / metadataList.length 
          : 0
      };
    }
    
    const stats = this.getMemoryStats();
    
    return {
      summary: {
        totalEvents: stats.eventCount,
        totalHandlers: stats.totalHandlers,
        averageHandlersPerEvent: stats.eventCount > 0 
          ? stats.totalHandlers / stats.eventCount 
          : 0,
        memoryWarningLevel: stats.warningLevel
      },
      events
    };
  }
  
  /**
   * Check if adding a handler would exceed limits
   */
  private checkLimits(eventName: EventName): boolean {
    const eventHandlers = this.handlerMetadata.get(eventName)?.length || 0;
    const stats = this.getMemoryStats();
    
    // Check per-event limit
    if (eventHandlers >= this.config.maxHandlersPerEvent) {
      this.emitMemoryWarning({
        type: 'handler-limit-exceeded',
        eventName,
        limit: this.config.maxHandlersPerEvent,
        actual: eventHandlers + 1
      });
      return false;
    }
    
    // Check total limit
    if (stats.totalHandlers >= this.config.maxTotalHandlers) {
      this.emitMemoryWarning({
        type: 'handler-limit-exceeded',
        limit: this.config.maxTotalHandlers,
        actual: stats.totalHandlers + 1
      });
      return false;
    }
    
    return true;
  }
  
  /**
   * Check if handler is duplicate
   */
  private isDuplicateHandler(eventName: EventName, handler: EventHandler): boolean {
    const metadataList = this.handlerMetadata.get(eventName);
    if (!metadataList) return false;
    
    return metadataList.some(m => m.handler === handler);
  }
  
  /**
   * Remove expired handler
   */
  private removeExpiredHandler(eventName: EventName, handler: EventHandler, onExpire?: Function): void {
    this.off(eventName, handler);
    if (onExpire) {
      onExpire(eventName, handler);
    }
  }
  
  /**
   * Remove handler metadata
   */
  private removeHandlerMetadata(eventName: EventName, handler: EventHandler): void {
    const metadataList = this.handlerMetadata.get(eventName);
    if (!metadataList) return;
    
    const index = metadataList.findIndex(m => m.handler === handler);
    if (index !== -1) {
      metadataList.splice(index, 1);
    }
    
    if (metadataList.length === 0) {
      this.handlerMetadata.delete(eventName);
    }
  }
  
  /**
   * Clean expired handlers
   */
  private cleanExpiredHandlers(): void {
    const now = Date.now();
    
    for (const [eventName, metadataList] of this.handlerMetadata.entries()) {
      const toRemove: HandlerMetadata[] = [];
      
      for (const metadata of metadataList) {
        if (metadata.ttl && (now - metadata.addedAt) > metadata.ttl) {
          toRemove.push(metadata);
        }
      }
      
      for (const metadata of toRemove) {
        this.removeExpiredHandler(eventName, metadata.handler, metadata.onExpire);
      }
    }
  }
  
  /**
   * Reduce handlers to target count
   */
  private reduceHandlersTo(targetCount: number): void {
    const allHandlers: Array<{ eventName: string; metadata: HandlerMetadata }> = [];
    
    // Collect all handlers
    for (const [eventName, metadataList] of this.handlerMetadata.entries()) {
      for (const metadata of metadataList) {
        allHandlers.push({ eventName, metadata });
      }
    }
    
    // Sort by priority (least recently called first)
    allHandlers.sort((a, b) => {
      // Never called handlers first
      if (a.metadata.callCount === 0 && b.metadata.callCount > 0) return -1;
      if (b.metadata.callCount === 0 && a.metadata.callCount > 0) return 1;
      
      // Then by last called time
      return a.metadata.lastCalled - b.metadata.lastCalled;
    });
    
    // Remove lowest priority handlers
    const toRemove = allHandlers.slice(0, allHandlers.length - targetCount);
    for (const { eventName, metadata } of toRemove) {
      this.off(eventName, metadata.handler);
      this.removeHandlerMetadata(eventName, metadata.handler);
    }
  }
  
  /**
   * Emit memory warning
   */
  private emitMemoryWarning(warning: MemoryWarning): void {
    if (!this.config.enableMemoryWarnings) return;
    
    this.logger.warn('EventBus memory warning:', warning);
    this.memoryWarningCallbacks.forEach(callback => callback(warning));
  }
}
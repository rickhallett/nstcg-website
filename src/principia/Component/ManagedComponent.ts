/**
 * @module ManagedComponent
 * @description Enhanced component base class with automatic event cleanup
 * 
 * Extends the base Component class to integrate with ManagedEventBus,
 * providing automatic cleanup of event subscriptions when components
 * are destroyed. This prevents memory leaks from orphaned event handlers.
 * 
 * Follows Principia.js architectural canon:
 * - Components are Dumb Artisans
 * - The State is Singular
 * - Events are the Messengers
 */

import { Component } from './Component';
import { ManagedEventBus } from '../EventBus/ManagedEventBus';
import type { EventName, EventHandler } from '../EventBus';

/**
 * Enhanced component with automatic event cleanup
 * 
 * @abstract
 * @class ManagedComponent
 * @extends Component
 */
export abstract class ManagedComponent extends Component {
  /**
   * ManagedEventBus instance for automatic cleanup
   */
  protected managedEventBus: ManagedEventBus;
  
  /**
   * Track event subscriptions made through this component
   */
  private eventSubscriptions: Array<() => void> = [];
  
  /**
   * Create a new managed component instance
   * 
   * @param host The host element where the component will be rendered
   * @param props Initial props for the component
   */
  constructor(host: HTMLElement, props: any = {}) {
    super(host, props);
    
    // Get ManagedEventBus instance
    this.managedEventBus = ManagedEventBus.getInstance();
  }
  
  /**
   * Subscribe to an event with automatic cleanup
   * When the component is destroyed, all subscriptions are automatically removed
   * 
   * @param eventName The name of the event to subscribe to
   * @param handler The handler function to call when the event is emitted
   * @returns Unsubscribe function (can be called early if needed)
   * 
   * @example
   * this.on('user:login', (userData) => {
   *   console.log('User logged in:', userData);
   * });
   */
  protected on(eventName: EventName, handler: EventHandler): () => void {
    // Subscribe with this component as owner
    const unsubscribe = this.managedEventBus.on(eventName, handler, this);
    
    // Track the subscription
    this.eventSubscriptions.push(unsubscribe);
    
    // Return unsubscribe function that also removes from tracking
    return () => {
      unsubscribe();
      const index = this.eventSubscriptions.indexOf(unsubscribe);
      if (index > -1) {
        this.eventSubscriptions.splice(index, 1);
      }
    };
  }
  
  /**
   * Subscribe to an event and automatically remove after first emission
   * 
   * @param eventName The name of the event to subscribe to
   * @param handler The handler function to call when the event is emitted
   * @returns Unsubscribe function
   */
  protected once(eventName: EventName, handler: EventHandler): () => void {
    const wrappedHandler = (payload?: any) => {
      handler(payload);
      unsubscribe();
    };
    
    const unsubscribe = this.on(eventName, wrappedHandler);
    return unsubscribe;
  }
  
  /**
   * Emit an event through the ManagedEventBus
   * Overrides base class emit to use ManagedEventBus
   * 
   * @param eventName The name of the event to emit
   * @param payload Optional data to include with the event
   */
  protected emit(eventName: string, payload?: any): void {
    this.managedEventBus.emit(eventName, payload);
  }
  
  /**
   * Destroy the component and clean up all event subscriptions
   * Extends base destroy to include automatic event cleanup
   */
  public destroy(): void {
    // Clean up all event subscriptions through ManagedEventBus
    this.managedEventBus.cleanupOwner(this);
    
    // Clear local tracking
    this.eventSubscriptions = [];
    
    // Call parent destroy
    super.destroy();
  }
  
  /**
   * Get debug information about this component's event subscriptions
   * Useful for development and debugging memory leaks
   * 
   * @returns Object containing subscription information
   */
  public getSubscriptionInfo(): {
    eventCount: number;
    events: string[];
    subscriptionCount: number;
  } {
    const ownerInfo = this.managedEventBus.getOwnerInfo(this);
    return {
      ...ownerInfo,
      subscriptionCount: this.eventSubscriptions.length
    };
  }
}

/**
 * Type guard to check if a component is a ManagedComponent
 * 
 * @param component The component to check
 * @returns True if the component is a ManagedComponent
 */
export function isManagedComponent(component: any): component is ManagedComponent {
  return component instanceof ManagedComponent;
}

/**
 * Mixin to add managed event capabilities to existing components
 * Useful for gradually migrating legacy components
 * 
 * @param BaseClass The component class to enhance
 * @returns Enhanced component class with managed events
 * 
 * @example
 * class LegacyComponent extends Component { ... }
 * const ManagedLegacyComponent = withManagedEvents(LegacyComponent);
 */
export function withManagedEvents<T extends typeof Component>(
  BaseClass: T
): T & typeof ManagedComponent {
  return class extends BaseClass {
    protected managedEventBus: ManagedEventBus;
    private eventSubscriptions: Array<() => void> = [];
    
    constructor(...args: any[]) {
      super(...args);
      this.managedEventBus = ManagedEventBus.getInstance();
    }
    
    protected on(eventName: EventName, handler: EventHandler): () => void {
      const unsubscribe = this.managedEventBus.on(eventName, handler, this);
      this.eventSubscriptions.push(unsubscribe);
      
      return () => {
        unsubscribe();
        const index = this.eventSubscriptions.indexOf(unsubscribe);
        if (index > -1) {
          this.eventSubscriptions.splice(index, 1);
        }
      };
    }
    
    protected once(eventName: EventName, handler: EventHandler): () => void {
      const wrappedHandler = (payload?: any) => {
        handler(payload);
        unsubscribe();
      };
      
      const unsubscribe = this.on(eventName, wrappedHandler);
      return unsubscribe;
    }
    
    protected emit(eventName: string, payload?: any): void {
      this.managedEventBus.emit(eventName, payload);
    }
    
    public destroy(): void {
      this.managedEventBus.cleanupOwner(this);
      this.eventSubscriptions = [];
      super.destroy();
    }
    
    public getSubscriptionInfo() {
      const ownerInfo = this.managedEventBus.getOwnerInfo(this);
      return {
        ...ownerInfo,
        subscriptionCount: this.eventSubscriptions.length
      };
    }
  } as any;
}
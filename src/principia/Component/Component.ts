/**
 * @module Component
 * @description Base class for all UI components in Principia.js
 * 
 * Components are "dumb artisans" - they only render state and emit events.
 * They contain no business logic. All state comes from StateManager and
 * all communication happens through EventBus.
 * 
 * Follows Principia.js architectural canon:
 * - Components are Dumb Artisans
 * - The State is Singular
 * - Events are the Messengers
 */

import { StateManager } from '../StateManager';
import { EventBus } from '../EventBus';
import { diff, patch } from '../dom-diff';

/**
 * Abstract base class for all UI components
 * 
 * @abstract
 * @class Component
 */
export abstract class Component {
  /**
   * The host element where this component will be rendered
   */
  protected host: HTMLElement;
  
  /**
   * Props passed to the component
   */
  public props: any;
  
  /**
   * Internal component state (for UI state only, not business data)
   */
  public state: any = {};
  
  /**
   * Reference to the current rendered DOM
   */
  protected currentDOM: Element | null = null;
  
  /**
   * StateManager instance
   */
  protected stateManager: StateManager;
  
  /**
   * EventBus instance
   */
  protected eventBus: EventBus;
  
  /**
   * Array of unsubscribe functions
   */
  private unsubscribers: Array<() => void> = [];
  
  /**
   * Flag to track if component is attached
   */
  private isAttached: boolean = false;

  /**
   * Create a new component instance
   * 
   * @param host The host element where the component will be rendered
   * @param props Initial props for the component
   */
  constructor(host: HTMLElement, props: any = {}) {
    this.host = host;
    this.props = props;
    
    // Get singleton instances
    this.stateManager = StateManager.getInstance();
    this.eventBus = EventBus.getInstance();
  }

  /**
   * Abstract method that must be implemented by subclasses
   * Returns the DOM structure for this component
   * 
   * @abstract
   * @returns The rendered DOM element
   */
  abstract render(): HTMLElement;

  /**
   * Attach the component to the DOM and set up subscriptions
   * This is called when the component should be displayed
   */
  public attach(): void {
    // Prevent duplicate attachments
    if (this.isAttached) {
      return;
    }
    
    try {
      // Initial render
      const newDOM = this.render();
      
      if (this.currentDOM) {
        // If we already have DOM, use diff/patch
        const patches = diff(this.currentDOM as Element, newDOM);
        patch(patches);
      } else {
        // First render, just append
        this.host.appendChild(newDOM);
        this.currentDOM = newDOM;
      }
      
      this.isAttached = true;
    } catch (error) {
      console.error('Error during component attach:', error);
    }
  }

  /**
   * Update the component by re-rendering and patching the DOM
   * This is called when component state or props change
   */
  public update(): void {
    if (!this.isAttached || !this.currentDOM) {
      return;
    }
    
    try {
      // Re-render
      const newDOM = this.render();
      
      // Diff and patch
      const patches = diff(this.currentDOM as Element, newDOM);
      patch(patches);
      
      // Update reference
      this.currentDOM = this.host.firstElementChild;
    } catch (error) {
      console.error('Error during component update:', error);
    }
  }

  /**
   * Destroy the component and clean up
   * This is called when the component should be removed
   */
  public destroy(): void {
    // Remove from DOM
    if (this.currentDOM && this.currentDOM.parentNode) {
      this.currentDOM.parentNode.removeChild(this.currentDOM);
    }
    
    // Clean up subscriptions
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
    
    // Clear references
    this.currentDOM = null;
    this.isAttached = false;
  }

  /**
   * Subscribe to state changes at a specific path
   * When the state at this path changes, the component will re-render
   * 
   * @param path Dot-notation path to subscribe to
   */
  protected subscribeToState(path: string): void {
    const unsubscribe = this.stateManager.subscribe(path, () => {
      if (this.isAttached) {
        this.update();
      }
    });
    
    this.unsubscribers.push(unsubscribe);
  }

  /**
   * Get state value at a specific path
   * 
   * @param path Optional dot-notation path. If not provided, returns entire state
   * @returns The state value at the path
   */
  protected getState(path?: string): any {
    return this.stateManager.get(path);
  }

  /**
   * Emit an event through the EventBus
   * 
   * @param eventName The name of the event to emit
   * @param payload Optional data to include with the event
   */
  protected emit(eventName: string, payload?: any): void {
    this.eventBus.emit(eventName, payload);
  }
}
/**
 * @module OptimizedComponent
 * @description Enhanced Component with key-based reconciliation for better performance
 * 
 * Extends the base Component class with:
 * - Key-based DOM reconciliation for efficient list updates
 * - Component instance tracking for proper lifecycle management
 * - Configurable diff options for fine-tuned performance
 * - Support for both 'key' and 'data-key' attributes
 */

import { Component } from './Component';
import { KeyedDomDiff, DiffOptions, EnhancedPatch } from '../dom-diff/KeyedDomDiff';
import { StateManager } from '../StateManager/StateManager';
import { ManagedEventBus } from '../EventBus/ManagedEventBus';
import { EventBus } from '../EventBus/EventBus';

/**
 * Component configuration options
 */
export interface OptimizedComponentOptions {
  props?: any;
  diffOptions?: Partial<DiffOptions>;
  enableBatching?: boolean;
  trackMoves?: boolean;
  keyAttributes?: string | string[];
  trackRenders?: boolean;
}

/**
 * Child component tracking
 */
interface ChildComponent {
  instance: OptimizedComponent;
  key?: string;
}

/**
 * OptimizedComponent - Enhanced component with key-based reconciliation
 */
export abstract class OptimizedComponent extends Component {
  /**
   * KeyedDomDiff instance for this component
   */
  private differ: KeyedDomDiff;
  
  /**
   * Map of DOM elements to component instances
   */
  private componentMap: WeakMap<Element, OptimizedComponent> = new WeakMap();
  
  /**
   * Child components tracked by this component
   */
  private childComponents: Map<string, ChildComponent> = new Map();
  
  /**
   * Component-specific diff options
   */
  private diffOptions: DiffOptions;
  
  /**
   * Managed event bus for automatic cleanup
   */
  protected managedEventBus: ManagedEventBus;
  
  /**
   * Render tracking
   */
  protected renderCount: number = 0;
  protected trackRenders: boolean = false;
  
  /**
   * Create a new optimized component
   */
  constructor(host: HTMLElement, options: OptimizedComponentOptions = {}) {
    super(host, options.props);
    
    // Set up managed event bus
    this.managedEventBus = ManagedEventBus.getInstance();
    
    // Set up render tracking
    this.trackRenders = options.trackRenders ?? false;
    
    // Configure diff options
    this.diffOptions = {
      keyAttribute: options.keyAttributes || ['key', 'data-key'],
      batchOperations: options.enableBatching ?? true,
      trackMoves: options.trackMoves ?? false,
      componentMap: this.componentMap,
      ...options.diffOptions
    };
    
    // Create differ instance
    this.differ = new KeyedDomDiff(this.diffOptions);
  }
  
  /**
   * Override attach to track initial render
   */
  public attach(): void {
    super.attach();
    
    // Track initial render
    if (this.trackRenders) {
      this.renderCount++;
    }
  }
  
  /**
   * Enhanced update method with key-based reconciliation
   */
  public update(): void {
    if (!this.isAttached || !this.currentDOM) {
      return;
    }
    
    try {
      // Track render
      if (this.trackRenders) {
        this.renderCount++;
      }
      
      // Re-render
      const newDOM = this.render();
      
      // Track component instances in new DOM
      this.trackComponentInstances(newDOM);
      
      // Use KeyedDomDiff for efficient updates
      const patches = this.differ.diff(this.currentDOM as Element, newDOM);
      
      // Apply patches with lifecycle hooks
      this.applyPatchesWithLifecycle(patches);
      
      // Update reference
      this.currentDOM = this.host.firstElementChild;
      
      // Clean up orphaned child components
      this.cleanupOrphanedChildren();
    } catch (error) {
      console.error('Error during optimized component update:', error);
    }
  }
  
  /**
   * Track component instances in the DOM tree
   */
  private trackComponentInstances(element: Element): void {
    // Check if this element has a component key
    const key = this.getComponentKey(element);
    if (key) {
      const childComponent = this.childComponents.get(key);
      if (childComponent) {
        this.componentMap.set(element, childComponent.instance);
      }
    }
    
    // Recursively track children
    Array.from(element.children).forEach(child => {
      this.trackComponentInstances(child);
    });
  }
  
  /**
   * Get component key from element
   */
  private getComponentKey(element: Element): string | null {
    const keyAttrs = Array.isArray(this.diffOptions.keyAttribute)
      ? this.diffOptions.keyAttribute
      : [this.diffOptions.keyAttribute || 'key'];
    
    for (const attr of keyAttrs) {
      const key = element.getAttribute(attr);
      if (key && element.hasAttribute('data-component')) {
        return key;
      }
    }
    
    return null;
  }
  
  /**
   * Apply patches with component lifecycle management
   */
  private applyPatchesWithLifecycle(patches: EnhancedPatch[]): void {
    patches.forEach(patch => {
      // Handle component lifecycle for remove patches
      if (patch.type === 'REMOVE' && patch.node) {
        const component = this.componentMap.get(patch.node as Element);
        if (component) {
          component.destroy();
          this.componentMap.delete(patch.node as Element);
        }
      }
      
      // Handle component lifecycle for replace patches
      if (patch.type === 'REPLACE' && patch.node) {
        const oldComponent = this.componentMap.get(patch.node as Element);
        if (oldComponent) {
          oldComponent.destroy();
          this.componentMap.delete(patch.node as Element);
        }
      }
    });
    
    // Apply patches
    this.differ.patch(patches);
    
    // Initialize new components after patches are applied
    patches.forEach(patch => {
      if (patch.type === 'ADD' && 'node' in patch) {
        this.initializeNewComponent(patch.node as Element);
      }
    });
  }
  
  /**
   * Initialize a new component if needed
   */
  private initializeNewComponent(element: Element): void {
    const key = this.getComponentKey(element);
    if (key) {
      const childComponent = this.childComponents.get(key);
      if (childComponent && !childComponent.instance.isAttached) {
        childComponent.instance.attach();
      }
    }
  }
  
  /**
   * Register a child component
   */
  protected registerChild(key: string, component: OptimizedComponent): void {
    this.childComponents.set(key, { instance: component, key });
  }
  
  /**
   * Unregister a child component
   */
  protected unregisterChild(key: string): void {
    const child = this.childComponents.get(key);
    if (child) {
      child.instance.destroy();
      this.childComponents.delete(key);
    }
  }
  
  /**
   * Get a registered child component
   */
  protected getChild(key: string): OptimizedComponent | undefined {
    return this.childComponents.get(key)?.instance;
  }
  
  /**
   * Clean up orphaned child components
   */
  private cleanupOrphanedChildren(): void {
    const activeKeys = new Set<string>();
    
    // Find all active component keys in current DOM
    if (this.currentDOM) {
      this.findActiveComponentKeys(this.currentDOM as Element, activeKeys);
    }
    
    // Remove components that are no longer in DOM
    for (const [key, child] of this.childComponents) {
      if (!activeKeys.has(key)) {
        child.instance.destroy();
        this.childComponents.delete(key);
      }
    }
  }
  
  /**
   * Find active component keys in DOM tree
   */
  private findActiveComponentKeys(element: Element, keys: Set<string>): void {
    const key = this.getComponentKey(element);
    if (key) {
      keys.add(key);
    }
    
    Array.from(element.children).forEach(child => {
      this.findActiveComponentKeys(child, keys);
    });
  }
  
  /**
   * Subscribe to events with automatic cleanup
   */
  protected on(event: string, handler: (payload?: any) => void): void {
    const boundHandler = handler.bind(this);
    const unsubscribe = this.managedEventBus.on(event, boundHandler, this);
    this.unsubscribers.push(unsubscribe);
  }
  
  /**
   * Enhanced destroy with child cleanup
   */
  public destroy(): void {
    // Destroy all child components
    for (const child of this.childComponents.values()) {
      child.instance.destroy();
    }
    this.childComponents.clear();
    
    // Clean up event subscriptions
    this.managedEventBus.cleanupOwner(this);
    
    // Reset differ
    this.differ.reset();
    
    // Call parent destroy
    super.destroy();
  }
  
  /**
   * Get move operations from last update (useful for animations)
   */
  public getLastMoveOperations() {
    return this.differ.getMoveOperations();
  }
  
  /**
   * Get render count (for testing/debugging)
   */
  public getRenderCount(): number {
    return this.renderCount;
  }
  
  /**
   * Create a keyed list of elements (helper method)
   */
  protected createKeyedList<T>(
    items: T[],
    keyFn: (item: T, index: number) => string,
    renderFn: (item: T, index: number) => HTMLElement
  ): HTMLElement[] {
    return items.map((item, index) => {
      const element = renderFn(item, index);
      const key = keyFn(item, index);
      element.setAttribute(this.diffOptions.keyAttribute?.[0] || 'key', key);
      return element;
    });
  }
  
  /**
   * Create a component element with key (helper method)
   */
  protected createComponentElement(
    tagName: string,
    key: string,
    componentClass: typeof OptimizedComponent,
    props?: any
  ): HTMLElement {
    const element = document.createElement(tagName);
    element.setAttribute(this.diffOptions.keyAttribute?.[0] || 'key', key);
    element.setAttribute('data-component', componentClass.name);
    
    // Create and register child component if not exists
    if (!this.childComponents.has(key)) {
      const component = new (componentClass as any)(element, { props });
      this.registerChild(key, component);
      // Attach the component immediately
      component.attach();
    } else {
      // Update existing component props
      const existing = this.getChild(key);
      if (existing) {
        existing.props = props;
        existing.update();
      }
    }
    
    return element;
  }
}

/**
 * Mixin for list components with built-in optimization
 */
export function ListComponentMixin<T extends new (...args: any[]) => OptimizedComponent>(Base: T) {
  return class extends Base {
    /**
     * Render a list with automatic keying
     */
    protected renderList<ItemType>(
      containerId: string,
      items: ItemType[],
      itemKeyFn: (item: ItemType, index: number) => string,
      itemRenderFn: (item: ItemType, index: number) => HTMLElement
    ): HTMLElement {
      const container = document.createElement('ul');
      container.id = containerId;
      
      const elements = this.createKeyedList(items, itemKeyFn, itemRenderFn);
      elements.forEach(el => container.appendChild(el));
      
      return container;
    }
    
    /**
     * Render a component list
     */
    protected renderComponentList<ItemType>(
      containerId: string,
      items: ItemType[],
      itemKeyFn: (item: ItemType, index: number) => string,
      componentClass: typeof OptimizedComponent,
      propsFn: (item: ItemType, index: number) => any
    ): HTMLElement {
      const container = document.createElement('div');
      container.id = containerId;
      
      items.forEach((item, index) => {
        const key = itemKeyFn(item, index);
        const props = propsFn(item, index);
        const element = this.createComponentElement('div', key, componentClass, props);
        container.appendChild(element);
      });
      
      return container;
    }
  };
}
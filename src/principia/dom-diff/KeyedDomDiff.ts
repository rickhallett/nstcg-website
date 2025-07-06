/**
 * @module KeyedDomDiff
 * @description Enhanced DOM diffing with optimized key-based reconciliation
 * 
 * Improvements over basic dom-diff:
 * - More efficient keyed child reconciliation algorithm
 * - Support for both 'key' and 'data-key' attributes
 * - Batched DOM operations for better performance
 * - Component-aware diffing with lifecycle hooks
 * - Memory-efficient patch application
 */

import { Patch, PatchType } from './dom-diff';

/**
 * Enhanced patch with additional metadata
 */
export interface EnhancedPatch extends Patch {
  priority?: number; // For batch optimization
  component?: any; // Associated component instance
}

/**
 * Options for enhanced diffing
 */
export interface DiffOptions {
  keyAttribute?: string | string[]; // Attribute(s) to use for keys
  componentMap?: WeakMap<Element, any>; // Map of elements to components
  batchOperations?: boolean; // Enable DOM operation batching
  trackMoves?: boolean; // Track element moves for animations
}

/**
 * Result of keyed child analysis
 */
interface KeyedChildAnalysis {
  oldKeyed: Map<string, Element>;
  newKeyed: Map<string, Element>;
  oldKeyList: string[];
  newKeyList: string[];
  oldFree: Element[]; // Elements without keys
  newFree: Element[]; // Elements without keys
}

/**
 * Movement operation for optimization
 */
interface MoveOperation {
  element: Element;
  from: number;
  to: number;
  key: string;
}

/**
 * Enhanced DOM diffing with optimized key-based reconciliation
 */
export class KeyedDomDiff {
  private options: DiffOptions;
  private patchQueue: EnhancedPatch[] = [];
  private moveOperations: MoveOperation[] = [];
  
  constructor(options: DiffOptions = {}) {
    this.options = {
      keyAttribute: ['key', 'data-key'],
      batchOperations: true,
      trackMoves: true,
      ...options
    };
  }
  
  /**
   * Compare two DOM trees and return optimized patches
   */
  diff(oldNode: Element | null, newNode: Element | null): EnhancedPatch[] {
    this.patchQueue = [];
    this.moveOperations = [];
    
    if (!oldNode && !newNode) {
      return [];
    }
    
    if (!oldNode && newNode) {
      return [];
    }
    
    if (oldNode && !newNode) {
      return [{ type: 'REMOVE', node: oldNode }];
    }
    
    this.diffNode(oldNode!, newNode!);
    
    // Optimize patches if batching is enabled
    if (this.options.batchOperations) {
      return this.optimizePatches(this.patchQueue);
    }
    
    return this.patchQueue;
  }
  
  /**
   * Apply patches with optimizations
   */
  patch(patches: EnhancedPatch[]): void {
    if (!patches || patches.length === 0) {
      return;
    }
    
    if (this.options.batchOperations) {
      this.batchedPatch(patches);
    } else {
      patches.forEach(patch => this.applyPatch(patch));
    }
  }
  
  /**
   * Compare two nodes and generate patches
   */
  private diffNode(oldNode: Element, newNode: Element): void {
    // Check for component instances
    const oldComponent = this.options.componentMap?.get(oldNode);
    const newComponent = this.options.componentMap?.get(newNode);
    
    // If node types differ, replace entire node
    if (oldNode.tagName !== newNode.tagName) {
      this.addPatch({
        type: 'REPLACE',
        node: oldNode,
        newNode: newNode.cloneNode(true) as Element,
        component: oldComponent
      });
      return;
    }
    
    // Diff attributes
    this.diffAttributes(oldNode, newNode);
    
    // Diff children with optimized algorithm
    this.diffChildren(oldNode, newNode);
  }
  
  /**
   * Compare attributes between elements
   */
  private diffAttributes(oldNode: Element, newNode: Element): void {
    const oldAttrs = Array.from(oldNode.attributes);
    const newAttrs = Array.from(newNode.attributes);
    const newAttrMap = new Map(newAttrs.map(attr => [attr.name, attr.value]));
    
    // Check for changed or removed attributes
    for (const attr of oldAttrs) {
      const newValue = newAttrMap.get(attr.name);
      if (newValue === undefined) {
        this.addPatch({
          type: 'REMOVE_ATTRIBUTE',
          node: oldNode,
          name: attr.name
        });
      } else if (newValue !== attr.value) {
        this.addPatch({
          type: 'ATTRIBUTE',
          node: oldNode,
          name: attr.name,
          value: newValue
        });
      }
      newAttrMap.delete(attr.name);
    }
    
    // Check for new attributes
    for (const [name, value] of newAttrMap) {
      this.addPatch({
        type: 'ATTRIBUTE',
        node: oldNode,
        name,
        value
      });
    }
  }
  
  /**
   * Optimized children diffing with key support
   */
  private diffChildren(oldParent: Element, newParent: Element): void {
    const oldChildren = Array.from(oldParent.childNodes);
    const newChildren = Array.from(newParent.childNodes);
    
    // Fast path for text content
    if (this.isSimpleTextContent(oldChildren, newChildren)) {
      this.diffTextContent(oldParent, oldChildren[0] as Text, newChildren[0] as Text);
      return;
    }
    
    // Handle empty to text content
    if (oldChildren.length === 0 && newChildren.length > 0) {
      // Check if new content is just text
      const hasOnlyText = newChildren.every(n => n.nodeType === Node.TEXT_NODE);
      if (hasOnlyText) {
        const textContent = newChildren.map(n => n.textContent).join('');
        this.addPatch({
          type: 'TEXT',
          node: oldParent,
          content: textContent
        });
        return;
      }
    }
    
    // Handle element with different text content
    if (oldChildren.length === 0 && newChildren.length === 0) {
      // Both empty, but check textContent directly
      if (oldParent.textContent !== newParent.textContent) {
        this.addPatch({
          type: 'TEXT',
          node: oldParent,
          content: newParent.textContent || ''
        });
        return;
      }
    }
    
    // Analyze keyed and unkeyed children
    const analysis = this.analyzeKeyedChildren(oldChildren, newChildren);
    
    if (analysis.oldKeyed.size > 0 || analysis.newKeyed.size > 0) {
      // Use optimized keyed algorithm
      this.diffKeyedChildrenOptimized(oldParent, analysis);
    } else {
      // Fall back to simple index-based diff
      this.diffUnkeyedChildren(oldParent, oldChildren, newChildren);
    }
  }
  
  /**
   * Check if children are simple text nodes
   */
  private isSimpleTextContent(oldChildren: Node[], newChildren: Node[]): boolean {
    return oldChildren.length === 1 && 
           newChildren.length === 1 &&
           oldChildren[0].nodeType === Node.TEXT_NODE &&
           newChildren[0].nodeType === Node.TEXT_NODE;
  }
  
  /**
   * Diff text content
   */
  private diffTextContent(parent: Element, oldText: Text, newText: Text): void {
    if (oldText.textContent !== newText.textContent) {
      this.addPatch({
        type: 'TEXT',
        node: parent,
        content: newText.textContent || ''
      });
    }
  }
  
  /**
   * Analyze children for keyed reconciliation
   */
  private analyzeKeyedChildren(oldChildren: Node[], newChildren: Node[]): KeyedChildAnalysis {
    const oldKeyed = new Map<string, Element>();
    const newKeyed = new Map<string, Element>();
    const oldKeyList: string[] = [];
    const newKeyList: string[] = [];
    const oldFree: Element[] = [];
    const newFree: Element[] = [];
    
    // Categorize old children
    for (const child of oldChildren) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as Element;
        const key = this.getKey(element);
        if (key) {
          oldKeyed.set(key, element);
          oldKeyList.push(key);
        } else {
          oldFree.push(element);
        }
      }
    }
    
    // Categorize new children
    for (const child of newChildren) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as Element;
        const key = this.getKey(element);
        if (key) {
          newKeyed.set(key, element);
          newKeyList.push(key);
        } else {
          newFree.push(element);
        }
      }
    }
    
    return { oldKeyed, newKeyed, oldKeyList, newKeyList, oldFree, newFree };
  }
  
  /**
   * Get key from element using configured attributes
   */
  private getKey(element: Element): string | null {
    const keyAttrs = Array.isArray(this.options.keyAttribute) 
      ? this.options.keyAttribute 
      : [this.options.keyAttribute || 'key'];
    
    for (const attr of keyAttrs) {
      const key = element.getAttribute(attr);
      if (key) return key;
    }
    
    return null;
  }
  
  /**
   * Optimized keyed children diffing using LCS algorithm
   */
  private diffKeyedChildrenOptimized(parent: Element, analysis: KeyedChildAnalysis): void {
    const { oldKeyed, newKeyed, oldKeyList, newKeyList, oldFree, newFree } = analysis;
    
    // Find longest common subsequence of keys
    const lcs = this.longestCommonSubsequence(oldKeyList, newKeyList);
    const lcsSet = new Set(lcs);
    
    // Phase 1: Remove elements not in new list
    for (const [key, element] of oldKeyed) {
      if (!newKeyed.has(key)) {
        this.addPatch({
          type: 'REMOVE',
          node: element,
          priority: 1
        });
      }
    }
    
    // Phase 2: Process elements in LCS (stable elements)
    for (const key of lcs) {
      const oldElement = oldKeyed.get(key)!;
      const newElement = newKeyed.get(key)!;
      this.diffNode(oldElement, newElement);
    }
    
    // Phase 3: Insert/move elements not in LCS
    let insertIndex = 0;
    for (let i = 0; i < newKeyList.length; i++) {
      const key = newKeyList[i];
      const newElement = newKeyed.get(key)!;
      
      if (!lcsSet.has(key)) {
        if (oldKeyed.has(key)) {
          // Element exists but needs to move
          const oldElement = oldKeyed.get(key)!;
          const currentIndex = Array.from(parent.children).indexOf(oldElement);
          
          if (currentIndex !== insertIndex) {
            this.addPatch({
              type: 'MOVE',
              node: oldElement,
              parent: parent,
              index: insertIndex,
              priority: 3
            });
            
            if (this.options.trackMoves) {
              this.moveOperations.push({
                element: oldElement,
                from: currentIndex,
                to: insertIndex,
                key
              });
            }
          }
          
          // Diff the moved element
          this.diffNode(oldElement, newElement);
        } else {
          // New element needs to be added
          this.addPatch({
            type: 'ADD',
            parent: parent,
            node: newElement.cloneNode(true) as Element,
            index: insertIndex,
            priority: 2
          });
        }
      }
      
      insertIndex++;
    }
    
    // Phase 4: Handle unkeyed elements
    this.diffUnkeyedChildren(parent, oldFree, newFree);
  }
  
  /**
   * Longest common subsequence algorithm for finding stable elements
   */
  private longestCommonSubsequence(arr1: string[], arr2: string[]): string[] {
    const m = arr1.length;
    const n = arr2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    // Build LCS matrix
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (arr1[i - 1] === arr2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    
    // Reconstruct LCS
    const lcs: string[] = [];
    let i = m, j = n;
    
    while (i > 0 && j > 0) {
      if (arr1[i - 1] === arr2[j - 1]) {
        lcs.unshift(arr1[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }
    
    return lcs;
  }
  
  /**
   * Simple diffing for unkeyed children
   */
  private diffUnkeyedChildren(parent: Element, oldChildren: Node[], newChildren: Node[]): void {
    const maxLength = Math.max(oldChildren.length, newChildren.length);
    
    for (let i = 0; i < maxLength; i++) {
      const oldChild = oldChildren[i];
      const newChild = newChildren[i];
      
      if (!oldChild && newChild) {
        if (newChild.nodeType === Node.ELEMENT_NODE) {
          this.addPatch({
            type: 'ADD',
            parent: parent,
            node: (newChild as Element).cloneNode(true) as Element,
            index: i
          });
        }
      } else if (oldChild && !newChild) {
        this.addPatch({
          type: 'REMOVE',
          node: oldChild as Element
        });
      } else if (oldChild && newChild) {
        if (oldChild.nodeType === Node.ELEMENT_NODE && 
            newChild.nodeType === Node.ELEMENT_NODE) {
          this.diffNode(oldChild as Element, newChild as Element);
        }
      }
    }
  }
  
  /**
   * Add patch to queue
   */
  private addPatch(patch: EnhancedPatch): void {
    this.patchQueue.push(patch);
  }
  
  /**
   * Optimize patches for better performance
   */
  private optimizePatches(patches: EnhancedPatch[]): EnhancedPatch[] {
    // Sort by priority (removes first, then moves, then adds)
    return patches.sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }
  
  /**
   * Apply patches in batches for better performance
   */
  private batchedPatch(patches: EnhancedPatch[]): void {
    // Group patches by type for batching
    const groups = new Map<PatchType, EnhancedPatch[]>();
    
    for (const patch of patches) {
      const group = groups.get(patch.type) || [];
      group.push(patch);
      groups.set(patch.type, group);
    }
    
    // Apply in optimal order
    const order: PatchType[] = ['REMOVE', 'MOVE', 'ADD', 'REPLACE', 'ATTRIBUTE', 'REMOVE_ATTRIBUTE', 'TEXT'];
    
    for (const type of order) {
      const group = groups.get(type);
      if (group) {
        // Use requestAnimationFrame for large batches
        if (group.length > 50) {
          requestAnimationFrame(() => {
            group.forEach(patch => this.applyPatch(patch));
          });
        } else {
          group.forEach(patch => this.applyPatch(patch));
        }
      }
    }
  }
  
  /**
   * Apply a single patch
   */
  private applyPatch(patch: EnhancedPatch): void {
    switch (patch.type) {
      case 'TEXT':
        if (patch.node) {
          patch.node.textContent = patch.content;
        }
        break;
        
      case 'ATTRIBUTE':
        if (patch.node) {
          (patch.node as Element).setAttribute(patch.name, patch.value);
        }
        break;
        
      case 'REMOVE_ATTRIBUTE':
        if (patch.node) {
          (patch.node as Element).removeAttribute(patch.name);
        }
        break;
        
      case 'REPLACE':
        if (patch.node && patch.node.parentNode && 'newNode' in patch) {
          patch.node.parentNode.replaceChild(patch.newNode, patch.node);
        }
        break;
        
      case 'ADD':
        if ('parent' in patch && patch.parent && 'node' in patch) {
          if (patch.index >= patch.parent.children.length) {
            patch.parent.appendChild(patch.node);
          } else {
            patch.parent.insertBefore(patch.node, patch.parent.children[patch.index]);
          }
        }
        break;
        
      case 'REMOVE':
        if (patch.node && patch.node.parentNode) {
          patch.node.parentNode.removeChild(patch.node);
        }
        break;
        
      case 'MOVE':
        if (patch.node && 'parent' in patch && patch.parent) {
          if (patch.node.parentNode) {
            patch.node.parentNode.removeChild(patch.node);
          }
          if (patch.index >= patch.parent.children.length) {
            patch.parent.appendChild(patch.node);
          } else {
            patch.parent.insertBefore(patch.node, patch.parent.children[patch.index]);
          }
        }
        break;
    }
  }
  
  /**
   * Get move operations for animation purposes
   */
  getMoveOperations(): MoveOperation[] {
    return [...this.moveOperations];
  }
  
  /**
   * Clear internal state
   */
  reset(): void {
    this.patchQueue = [];
    this.moveOperations = [];
  }
}

/**
 * Factory function for creating a KeyedDomDiff instance
 */
export function createKeyedDomDiff(options?: DiffOptions): KeyedDomDiff {
  return new KeyedDomDiff(options);
}

/**
 * Convenience functions for direct usage
 */
export function keyedDiff(oldNode: Element | null, newNode: Element | null, options?: DiffOptions): EnhancedPatch[] {
  const differ = new KeyedDomDiff(options);
  return differ.diff(oldNode, newNode);
}

export function keyedPatch(patches: EnhancedPatch[], options?: DiffOptions): void {
  const differ = new KeyedDomDiff(options);
  differ.patch(patches);
}
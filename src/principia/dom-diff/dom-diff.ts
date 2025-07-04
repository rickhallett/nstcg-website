/**
 * @module dom-diff
 * @description Efficient DOM diffing and patching utility for Principia.js
 * 
 * This module provides a virtual DOM diffing algorithm that calculates
 * the minimal set of changes needed to transform one DOM tree into another.
 * It's designed to work with the Component system for efficient UI updates.
 */

/**
 * Patch types that can be applied to the DOM
 */
export type PatchType = 
  | 'TEXT'
  | 'ATTRIBUTE'
  | 'REMOVE_ATTRIBUTE'
  | 'REPLACE'
  | 'ADD'
  | 'REMOVE'
  | 'MOVE';

/**
 * Base patch interface
 */
interface BasePatch {
  type: PatchType;
  node?: Element | Text;
}

/**
 * Text content update patch
 */
interface TextPatch extends BasePatch {
  type: 'TEXT';
  content: string;
}

/**
 * Attribute update patch
 */
interface AttributePatch extends BasePatch {
  type: 'ATTRIBUTE';
  name: string;
  value: string;
}

/**
 * Attribute removal patch
 */
interface RemoveAttributePatch extends BasePatch {
  type: 'REMOVE_ATTRIBUTE';
  name: string;
}

/**
 * Element replacement patch
 */
interface ReplacePatch extends BasePatch {
  type: 'REPLACE';
  newNode: Element;
}

/**
 * Child addition patch
 */
interface AddPatch extends BasePatch {
  type: 'ADD';
  parent: Element;
  node: Element;
  index: number;
}

/**
 * Element removal patch
 */
interface RemovePatch extends BasePatch {
  type: 'REMOVE';
}

/**
 * Element move patch
 */
interface MovePatch extends BasePatch {
  type: 'MOVE';
  parent: Element;
  index: number;
}

/**
 * Union type for all patch types
 */
export type Patch = 
  | TextPatch
  | AttributePatch
  | RemoveAttributePatch
  | ReplacePatch
  | AddPatch
  | RemovePatch
  | MovePatch;

/**
 * Compare two DOM trees and return the patches needed to transform oldNode into newNode
 * 
 * @param oldNode The current DOM node
 * @param newNode The desired DOM node structure
 * @returns Array of patches to apply
 */
export function diff(oldNode: Element | null, newNode: Element | null): Patch[] {
  const patches: Patch[] = [];
  
  // Handle null cases
  if (!oldNode && !newNode) {
    return patches;
  }
  
  if (!oldNode && newNode) {
    // This shouldn't happen in normal usage, but handle gracefully
    return patches;
  }
  
  if (oldNode && !newNode) {
    patches.push({ type: 'REMOVE', node: oldNode });
    return patches;
  }
  
  // Both nodes exist, compare them
  diffNode(oldNode!, newNode!, patches);
  
  return patches;
}

/**
 * Compare two nodes and add patches to the array
 * @private
 */
function diffNode(oldNode: Element, newNode: Element, patches: Patch[]): void {
  // If node types are different, replace the entire node
  if (oldNode.tagName !== newNode.tagName) {
    patches.push({
      type: 'REPLACE',
      node: oldNode,
      newNode: newNode.cloneNode(true) as Element
    });
    return;
  }
  
  // Compare attributes
  diffAttributes(oldNode, newNode, patches);
  
  // Compare children
  diffChildren(oldNode, newNode, patches);
}

/**
 * Compare attributes between two elements
 * @private
 */
function diffAttributes(oldNode: Element, newNode: Element, patches: Patch[]): void {
  const oldAttrs = oldNode.attributes;
  const newAttrs = newNode.attributes;
  
  // Check for new or changed attributes
  for (let i = 0; i < newAttrs.length; i++) {
    const attr = newAttrs[i];
    const oldValue = oldNode.getAttribute(attr.name);
    
    if (oldValue !== attr.value) {
      patches.push({
        type: 'ATTRIBUTE',
        node: oldNode,
        name: attr.name,
        value: attr.value
      });
    }
  }
  
  // Check for removed attributes
  for (let i = 0; i < oldAttrs.length; i++) {
    const attr = oldAttrs[i];
    if (!newNode.hasAttribute(attr.name)) {
      patches.push({
        type: 'REMOVE_ATTRIBUTE',
        node: oldNode,
        name: attr.name
      });
    }
  }
}

/**
 * Compare children between two elements
 * @private
 */
function diffChildren(oldParent: Element, newParent: Element, patches: Patch[]): void {
  const oldChildren = Array.from(oldParent.childNodes);
  const newChildren = Array.from(newParent.childNodes);
  
  // Handle text nodes specially
  if (oldChildren.length === 1 && newChildren.length === 1 &&
      oldChildren[0].nodeType === Node.TEXT_NODE &&
      newChildren[0].nodeType === Node.TEXT_NODE) {
    const oldText = oldChildren[0] as Text;
    const newText = newChildren[0] as Text;
    if (oldText.textContent !== newText.textContent) {
      patches.push({
        type: 'TEXT',
        node: oldParent,
        content: newText.textContent || ''
      });
    }
    return;
  }
  
  // Handle empty text content
  if (oldChildren.length === 0 && newChildren.length === 1 &&
      newChildren[0].nodeType === Node.TEXT_NODE) {
    patches.push({
      type: 'TEXT',
      node: oldParent,
      content: (newChildren[0] as Text).textContent || ''
    });
    return;
  }
  
  // Use keyed algorithm if children have keys
  const oldKeyed = getKeyedChildren(oldChildren);
  const newKeyed = getKeyedChildren(newChildren);
  
  if (oldKeyed.size > 0 || newKeyed.size > 0) {
    diffKeyedChildren(oldParent, oldChildren, newChildren, oldKeyed, newKeyed, patches);
  } else {
    diffUnkeyedChildren(oldParent, oldChildren, newChildren, patches);
  }
}

/**
 * Get a map of keyed children
 * @private
 */
function getKeyedChildren(children: Node[]): Map<string, Element> {
  const keyed = new Map<string, Element>();
  
  children.forEach(child => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const element = child as Element;
      const key = element.getAttribute('key');
      if (key) {
        keyed.set(key, element);
      }
    }
  });
  
  return keyed;
}

/**
 * Diff children with key attributes for efficient reordering
 * @private
 */
function diffKeyedChildren(
  oldParent: Element,
  oldChildren: Node[],
  newChildren: Node[],
  oldKeyed: Map<string, Element>,
  newKeyed: Map<string, Element>,
  patches: Patch[]
): void {
  const oldElements = oldChildren.filter(n => n.nodeType === Node.ELEMENT_NODE) as Element[];
  const newElements = newChildren.filter(n => n.nodeType === Node.ELEMENT_NODE) as Element[];
  
  // Track which old elements are still needed
  const stillNeeded = new Set<Element>();
  
  // First pass: identify moves and updates
  newElements.forEach((newChild, newIndex) => {
    const key = newChild.getAttribute('key');
    
    if (key && oldKeyed.has(key)) {
      const oldChild = oldKeyed.get(key)!;
      stillNeeded.add(oldChild);
      
      // Check if it needs to move
      const oldIndex = oldElements.indexOf(oldChild);
      if (oldIndex !== newIndex) {
        patches.push({
          type: 'MOVE',
          node: oldChild,
          parent: oldParent,
          index: newIndex
        });
      }
      
      // Recursively diff the matched elements
      diffNode(oldChild, newChild, patches);
    } else {
      // New element needs to be added
      patches.push({
        type: 'ADD',
        parent: oldParent,
        node: newChild.cloneNode(true) as Element,
        index: newIndex
      });
    }
  });
  
  // Second pass: remove elements that are no longer needed
  oldElements.forEach(oldChild => {
    if (!stillNeeded.has(oldChild)) {
      patches.push({
        type: 'REMOVE',
        node: oldChild
      });
    }
  });
}

/**
 * Diff children without keys using simple index-based comparison
 * @private
 */
function diffUnkeyedChildren(
  oldParent: Element,
  oldChildren: Node[],
  newChildren: Node[],
  patches: Patch[]
): void {
  const maxLength = Math.max(oldChildren.length, newChildren.length);
  
  for (let i = 0; i < maxLength; i++) {
    const oldChild = oldChildren[i];
    const newChild = newChildren[i];
    
    if (!oldChild && newChild) {
      // Add new child
      if (newChild.nodeType === Node.ELEMENT_NODE) {
        patches.push({
          type: 'ADD',
          parent: oldParent,
          node: (newChild as Element).cloneNode(true) as Element,
          index: i
        });
      }
    } else if (oldChild && !newChild) {
      // Remove old child
      patches.push({
        type: 'REMOVE',
        node: oldChild as Element
      });
    } else if (oldChild && newChild) {
      // Both exist, compare them
      if (oldChild.nodeType === Node.ELEMENT_NODE && 
          newChild.nodeType === Node.ELEMENT_NODE) {
        diffNode(oldChild as Element, newChild as Element, patches);
      } else if (oldChild.nodeType === Node.TEXT_NODE && 
                 newChild.nodeType === Node.TEXT_NODE) {
        const oldText = oldChild as Text;
        const newText = newChild as Text;
        if (oldText.textContent !== newText.textContent) {
          patches.push({
            type: 'TEXT',
            node: oldText,
            content: newText.textContent || ''
          });
        }
      }
    }
  }
}

/**
 * Apply an array of patches to the DOM
 * 
 * @param patches Array of patches to apply
 */
export function patch(patches: Patch[]): void {
  if (!patches || !Array.isArray(patches)) {
    return;
  }
  
  patches.forEach(patch => {
    applyPatch(patch);
  });
}

/**
 * Apply a single patch to the DOM
 * @private
 */
function applyPatch(patch: Patch): void {
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
      if (patch.node && patch.node.parentNode) {
        patch.node.parentNode.replaceChild(patch.newNode, patch.node);
      }
      break;
      
    case 'ADD':
      if (patch.parent && patch.node) {
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
      if (patch.node && patch.parent) {
        // Remove from current position
        if (patch.node.parentNode) {
          patch.node.parentNode.removeChild(patch.node);
        }
        // Insert at new position
        if (patch.index >= patch.parent.children.length) {
          patch.parent.appendChild(patch.node);
        } else {
          patch.parent.insertBefore(patch.node, patch.parent.children[patch.index]);
        }
      }
      break;
  }
}
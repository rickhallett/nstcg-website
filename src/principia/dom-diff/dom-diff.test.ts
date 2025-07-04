import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Window } from 'happy-dom';
import { diff, patch } from './dom-diff';

describe('dom-diff', () => {
  let window: Window;
  let document: Document;
  let container: HTMLElement;

  beforeEach(() => {
    // Set up happy-dom environment
    window = new Window();
    document = window.document;
    globalThis.document = document;
    globalThis.window = window as any;
    globalThis.HTMLElement = window.HTMLElement as any;
    globalThis.Element = window.Element as any;
    globalThis.Node = window.Node as any;
    globalThis.Text = window.Text as any;
    
    // Set up a fresh container for each test
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Clean up after each test
    if (container.parentNode) {
      document.body.removeChild(container);
    }
    window.close();
  });

  describe('diff', () => {
    it('should return no patches for identical elements', () => {
      const oldEl = document.createElement('div');
      oldEl.textContent = 'Hello';
      
      const newEl = document.createElement('div');
      newEl.textContent = 'Hello';
      
      const patches = diff(oldEl, newEl);
      expect(patches).toEqual([]);
    });

    it('should detect text content changes', () => {
      const oldEl = document.createElement('div');
      oldEl.textContent = 'Hello';
      
      const newEl = document.createElement('div');
      newEl.textContent = 'World';
      
      const patches = diff(oldEl, newEl);
      expect(patches).toHaveLength(1);
      expect(patches[0]).toMatchObject({
        type: 'TEXT',
        node: oldEl,
        content: 'World'
      });
    });

    it('should detect attribute additions', () => {
      const oldEl = document.createElement('div');
      const newEl = document.createElement('div');
      newEl.setAttribute('class', 'active');
      
      const patches = diff(oldEl, newEl);
      expect(patches).toHaveLength(1);
      expect(patches[0]).toMatchObject({
        type: 'ATTRIBUTE',
        node: oldEl,
        name: 'class',
        value: 'active'
      });
    });

    it('should detect attribute removals', () => {
      const oldEl = document.createElement('div');
      oldEl.setAttribute('class', 'active');
      const newEl = document.createElement('div');
      
      const patches = diff(oldEl, newEl);
      expect(patches).toHaveLength(1);
      expect(patches[0]).toMatchObject({
        type: 'REMOVE_ATTRIBUTE',
        node: oldEl,
        name: 'class'
      });
    });

    it('should detect attribute changes', () => {
      const oldEl = document.createElement('div');
      oldEl.setAttribute('class', 'active');
      
      const newEl = document.createElement('div');
      newEl.setAttribute('class', 'inactive');
      
      const patches = diff(oldEl, newEl);
      expect(patches).toHaveLength(1);
      expect(patches[0]).toMatchObject({
        type: 'ATTRIBUTE',
        node: oldEl,
        name: 'class',
        value: 'inactive'
      });
    });

    it('should handle element type changes', () => {
      const oldEl = document.createElement('div');
      oldEl.textContent = 'Hello';
      
      const newEl = document.createElement('span');
      newEl.textContent = 'Hello';
      
      const patches = diff(oldEl, newEl);
      expect(patches).toHaveLength(1);
      expect(patches[0]).toMatchObject({
        type: 'REPLACE',
        node: oldEl,
        newNode: expect.any(HTMLElement)
      });
    });

    it('should detect child additions', () => {
      const oldEl = document.createElement('div');
      const newEl = document.createElement('div');
      const child = document.createElement('span');
      child.textContent = 'New child';
      newEl.appendChild(child);
      
      const patches = diff(oldEl, newEl);
      expect(patches).toHaveLength(1);
      expect(patches[0]).toMatchObject({
        type: 'ADD',
        parent: oldEl,
        node: expect.any(HTMLElement),
        index: 0
      });
    });

    it('should detect child removals', () => {
      const oldEl = document.createElement('div');
      const child = document.createElement('span');
      child.textContent = 'Old child';
      oldEl.appendChild(child);
      
      const newEl = document.createElement('div');
      
      const patches = diff(oldEl, newEl);
      expect(patches).toHaveLength(1);
      expect(patches[0]).toMatchObject({
        type: 'REMOVE',
        node: child
      });
    });

    it('should handle reordering of children', () => {
      const oldEl = document.createElement('div');
      const child1 = document.createElement('span');
      child1.textContent = 'A';
      child1.setAttribute('key', '1');
      const child2 = document.createElement('span');
      child2.textContent = 'B';
      child2.setAttribute('key', '2');
      oldEl.appendChild(child1);
      oldEl.appendChild(child2);
      
      const newEl = document.createElement('div');
      const newChild1 = document.createElement('span');
      newChild1.textContent = 'B';
      newChild1.setAttribute('key', '2');
      const newChild2 = document.createElement('span');
      newChild2.textContent = 'A';
      newChild2.setAttribute('key', '1');
      newEl.appendChild(newChild1);
      newEl.appendChild(newChild2);
      
      const patches = diff(oldEl, newEl);
      // Should detect move operations
      expect(patches.some(p => p.type === 'MOVE')).toBe(true);
    });

    it('should handle nested structure changes', () => {
      const oldEl = document.createElement('div');
      const oldChild = document.createElement('div');
      const oldGrandchild = document.createElement('span');
      oldGrandchild.textContent = 'Hello';
      oldChild.appendChild(oldGrandchild);
      oldEl.appendChild(oldChild);
      
      const newEl = document.createElement('div');
      const newChild = document.createElement('div');
      const newGrandchild = document.createElement('span');
      newGrandchild.textContent = 'World';
      newChild.appendChild(newGrandchild);
      newEl.appendChild(newChild);
      
      const patches = diff(oldEl, newEl);
      expect(patches).toHaveLength(1);
      expect(patches[0]).toMatchObject({
        type: 'TEXT',
        content: 'World'
      });
    });

    it('should handle null or undefined inputs gracefully', () => {
      const el = document.createElement('div');
      
      expect(() => diff(null as any, el)).not.toThrow();
      expect(() => diff(el, null as any)).not.toThrow();
      expect(() => diff(null as any, null as any)).not.toThrow();
    });

    it('should optimize for keyed elements', () => {
      const oldEl = document.createElement('ul');
      for (let i = 0; i < 5; i++) {
        const li = document.createElement('li');
        li.setAttribute('key', `item-${i}`);
        li.textContent = `Item ${i}`;
        oldEl.appendChild(li);
      }
      
      const newEl = document.createElement('ul');
      // Same items but with item 2 removed
      for (let i = 0; i < 5; i++) {
        if (i !== 2) {
          const li = document.createElement('li');
          li.setAttribute('key', `item-${i}`);
          li.textContent = `Item ${i}`;
          newEl.appendChild(li);
        }
      }
      
      const patches = diff(oldEl, newEl);
      // Should only remove one item, not recreate all
      const removePatches = patches.filter(p => p.type === 'REMOVE');
      expect(removePatches).toHaveLength(1);
    });
  });

  describe('patch', () => {
    it('should apply text content changes', () => {
      const el = document.createElement('div');
      el.textContent = 'Hello';
      container.appendChild(el);
      
      const patches = [{
        type: 'TEXT' as const,
        node: el,
        content: 'World'
      }];
      
      patch(patches);
      expect(el.textContent).toBe('World');
    });

    it('should apply attribute changes', () => {
      const el = document.createElement('div');
      container.appendChild(el);
      
      const patches = [{
        type: 'ATTRIBUTE' as const,
        node: el,
        name: 'class',
        value: 'active'
      }];
      
      patch(patches);
      expect(el.getAttribute('class')).toBe('active');
    });

    it('should remove attributes', () => {
      const el = document.createElement('div');
      el.setAttribute('class', 'active');
      container.appendChild(el);
      
      const patches = [{
        type: 'REMOVE_ATTRIBUTE' as const,
        node: el,
        name: 'class'
      }];
      
      patch(patches);
      expect(el.hasAttribute('class')).toBe(false);
    });

    it('should replace elements', () => {
      const el = document.createElement('div');
      el.textContent = 'Old';
      container.appendChild(el);
      
      const newEl = document.createElement('span');
      newEl.textContent = 'New';
      
      const patches = [{
        type: 'REPLACE' as const,
        node: el,
        newNode: newEl
      }];
      
      patch(patches);
      expect(container.contains(el)).toBe(false);
      expect(container.contains(newEl)).toBe(true);
    });

    it('should add child elements', () => {
      const parent = document.createElement('div');
      container.appendChild(parent);
      
      const child = document.createElement('span');
      child.textContent = 'Child';
      
      const patches = [{
        type: 'ADD' as const,
        parent: parent,
        node: child,
        index: 0
      }];
      
      patch(patches);
      expect(parent.children).toHaveLength(1);
      expect(parent.children[0]).toBe(child);
    });

    it('should remove elements', () => {
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      container.appendChild(parent);
      
      const patches = [{
        type: 'REMOVE' as const,
        node: child
      }];
      
      patch(patches);
      expect(parent.children).toHaveLength(0);
    });

    it('should move elements', () => {
      const parent = document.createElement('div');
      const child1 = document.createElement('span');
      child1.textContent = '1';
      const child2 = document.createElement('span');
      child2.textContent = '2';
      parent.appendChild(child1);
      parent.appendChild(child2);
      container.appendChild(parent);
      
      const patches = [{
        type: 'MOVE' as const,
        node: child2,
        parent: parent,
        index: 0
      }];
      
      patch(patches);
      expect(parent.children[0]).toBe(child2);
      expect(parent.children[1]).toBe(child1);
    });

    it('should handle empty patch arrays', () => {
      const el = document.createElement('div');
      container.appendChild(el);
      
      expect(() => patch([])).not.toThrow();
    });

    it('should handle null patches gracefully', () => {
      expect(() => patch(null as any)).not.toThrow();
      expect(() => patch(undefined as any)).not.toThrow();
    });
  });

  describe('integration', () => {
    it('should handle complex DOM updates efficiently', () => {
      // Create a complex initial structure
      const oldRoot = document.createElement('div');
      oldRoot.className = 'container';
      
      const header = document.createElement('header');
      header.textContent = 'Title';
      oldRoot.appendChild(header);
      
      const list = document.createElement('ul');
      for (let i = 0; i < 3; i++) {
        const item = document.createElement('li');
        item.setAttribute('key', `item-${i}`);
        item.textContent = `Item ${i}`;
        list.appendChild(item);
      }
      oldRoot.appendChild(list);
      
      container.appendChild(oldRoot);
      
      // Create new structure with changes
      const newRoot = document.createElement('div');
      newRoot.className = 'container active';
      
      const newHeader = document.createElement('header');
      newHeader.textContent = 'New Title';
      newRoot.appendChild(newHeader);
      
      const newList = document.createElement('ul');
      // Reorder and modify items
      const newItem2 = document.createElement('li');
      newItem2.setAttribute('key', 'item-2');
      newItem2.textContent = 'Item 2 (modified)';
      newList.appendChild(newItem2);
      
      const newItem0 = document.createElement('li');
      newItem0.setAttribute('key', 'item-0');
      newItem0.textContent = 'Item 0';
      newList.appendChild(newItem0);
      
      // Add new item
      const newItem3 = document.createElement('li');
      newItem3.setAttribute('key', 'item-3');
      newItem3.textContent = 'Item 3 (new)';
      newList.appendChild(newItem3);
      
      newRoot.appendChild(newList);
      
      // Diff and patch
      const patches = diff(oldRoot, newRoot);
      patch(patches);
      
      // Verify changes
      expect(oldRoot.className).toBe('container active');
      expect(header.textContent).toBe('New Title');
      expect(list.children).toHaveLength(3);
      expect(list.children[0].textContent).toBe('Item 2 (modified)');
      expect(list.children[1].textContent).toBe('Item 0');
      expect(list.children[2].textContent).toBe('Item 3 (new)');
    });
  });
});
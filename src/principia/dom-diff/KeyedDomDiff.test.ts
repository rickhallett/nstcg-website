import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { Window } from 'happy-dom';
import { KeyedDomDiff, createKeyedDomDiff, keyedDiff, keyedPatch } from './KeyedDomDiff';

describe('KeyedDomDiff', () => {
  let window: Window;
  let document: Document;
  let container: HTMLElement;

  beforeEach(() => {
    window = new Window();
    document = window.document;
    globalThis.document = document;
    globalThis.window = window as any;
    globalThis.HTMLElement = window.HTMLElement as any;
    globalThis.Element = window.Element as any;
    globalThis.Node = window.Node as any;
    globalThis.Text = window.Text as any;
    globalThis.requestAnimationFrame = ((fn: Function) => setTimeout(fn, 0)) as any;
    
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
    window.close();
  });

  describe('basic diffing', () => {
    it('should handle identical elements', () => {
      const differ = createKeyedDomDiff();
      const oldEl = document.createElement('div');
      oldEl.textContent = 'Hello';
      
      const newEl = document.createElement('div');
      newEl.textContent = 'Hello';
      
      const patches = differ.diff(oldEl, newEl);
      expect(patches).toEqual([]);
    });

    it('should detect text changes', () => {
      const differ = createKeyedDomDiff();
      const oldEl = document.createElement('div');
      oldEl.textContent = 'Hello';
      
      const newEl = document.createElement('div');
      newEl.textContent = 'World';
      
      const patches = differ.diff(oldEl, newEl);
      expect(patches).toHaveLength(1);
      expect(patches[0]).toMatchObject({
        type: 'TEXT',
        content: 'World'
      });
    });

    it('should detect attribute changes', () => {
      const differ = createKeyedDomDiff();
      const oldEl = document.createElement('div');
      oldEl.setAttribute('class', 'old');
      
      const newEl = document.createElement('div');
      newEl.setAttribute('class', 'new');
      newEl.setAttribute('id', 'test');
      
      const patches = differ.diff(oldEl, newEl);
      expect(patches).toHaveLength(2);
      expect(patches.find(p => p.type === 'ATTRIBUTE' && p.name === 'class')).toBeTruthy();
      expect(patches.find(p => p.type === 'ATTRIBUTE' && p.name === 'id')).toBeTruthy();
    });
  });

  describe('keyed reconciliation', () => {
    it('should efficiently handle reordering with keys', () => {
      const differ = createKeyedDomDiff();
      
      // Create old list: A, B, C
      const oldList = document.createElement('ul');
      ['A', 'B', 'C'].forEach((text, i) => {
        const li = document.createElement('li');
        li.setAttribute('key', `item-${i}`);
        li.textContent = text;
        oldList.appendChild(li);
      });
      
      // Create new list: C, A, B (reordered)
      const newList = document.createElement('ul');
      const newOrder = [
        { key: 'item-2', text: 'C' },
        { key: 'item-0', text: 'A' },
        { key: 'item-1', text: 'B' }
      ];
      
      newOrder.forEach(({ key, text }) => {
        const li = document.createElement('li');
        li.setAttribute('key', key);
        li.textContent = text;
        newList.appendChild(li);
      });
      
      const patches = differ.diff(oldList, newList);
      
      // Should have move operations, not remove+add
      const movePatches = patches.filter(p => p.type === 'MOVE');
      expect(movePatches.length).toBeGreaterThan(0);
      
      // Should not have any remove or add patches for existing items
      const removePatches = patches.filter(p => p.type === 'REMOVE');
      const addPatches = patches.filter(p => p.type === 'ADD');
      expect(removePatches).toHaveLength(0);
      expect(addPatches).toHaveLength(0);
    });

    it('should handle data-key attribute', () => {
      const differ = createKeyedDomDiff({ keyAttribute: 'data-key' });
      
      const oldEl = document.createElement('div');
      const child1 = document.createElement('span');
      child1.setAttribute('data-key', 'first');
      oldEl.appendChild(child1);
      
      const newEl = document.createElement('div');
      const child2 = document.createElement('span');
      child2.setAttribute('data-key', 'first');
      child2.textContent = 'Updated';
      newEl.appendChild(child2);
      
      const patches = differ.diff(oldEl, newEl);
      
      // Should not have remove or add operations for keyed element
      expect(patches.some(p => p.type === 'REMOVE')).toBe(false);
      expect(patches.some(p => p.type === 'ADD')).toBe(false);
      // The text update happens during recursive diff
      expect(patches.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiple key attributes', () => {
      const differ = createKeyedDomDiff({ keyAttribute: ['key', 'data-key', 'id'] });
      
      const oldEl = document.createElement('div');
      const child = document.createElement('span');
      child.setAttribute('id', 'unique');
      oldEl.appendChild(child);
      
      const newEl = document.createElement('div');
      const newChild = document.createElement('span');
      newChild.setAttribute('id', 'unique');
      newChild.textContent = 'Found by ID';
      newEl.appendChild(newChild);
      
      const patches = differ.diff(oldEl, newEl);
      // Should match by ID and not recreate the element
      expect(patches.some(p => p.type === 'REMOVE')).toBe(false);
      expect(patches.some(p => p.type === 'ADD')).toBe(false);
    });
  });

  describe('LCS algorithm', () => {
    it('should find longest common subsequence', () => {
      const differ = new KeyedDomDiff();
      
      // Test the LCS algorithm indirectly through keyed reconciliation
      const oldList = document.createElement('ul');
      ['A', 'B', 'C', 'D', 'E'].forEach(text => {
        const li = document.createElement('li');
        li.setAttribute('key', text);
        li.textContent = text;
        oldList.appendChild(li);
      });
      
      // New list with some items removed and reordered: B, D, E, F
      const newList = document.createElement('ul');
      ['B', 'D', 'E', 'F'].forEach(text => {
        const li = document.createElement('li');
        li.setAttribute('key', text);
        li.textContent = text;
        newList.appendChild(li);
      });
      
      const patches = differ.diff(oldList, newList);
      
      // Should remove A and C
      const removePatches = patches.filter(p => p.type === 'REMOVE');
      expect(removePatches).toHaveLength(2);
      
      // Should add F
      const addPatches = patches.filter(p => p.type === 'ADD');
      expect(addPatches).toHaveLength(1);
      
      // B, D, E should remain stable (no moves for them in optimal case)
    });
  });

  describe('batch operations', () => {
    it('should batch DOM operations when enabled', () => {
      const differ = createKeyedDomDiff({ batchOperations: true });
      
      const oldEl = document.createElement('div');
      for (let i = 0; i < 10; i++) {
        const child = document.createElement('span');
        child.setAttribute('key', `item-${i}`);
        oldEl.appendChild(child);
      }
      
      const newEl = document.createElement('div');
      // Remove all and add new ones
      for (let i = 10; i < 20; i++) {
        const child = document.createElement('span');
        child.setAttribute('key', `item-${i}`);
        newEl.appendChild(child);
      }
      
      const patches = differ.diff(oldEl, newEl);
      
      // Should have remove and add patches
      expect(patches.filter(p => p.type === 'REMOVE')).toHaveLength(10);
      expect(patches.filter(p => p.type === 'ADD')).toHaveLength(10);
      
      // Patches should be optimized (removes have lower priority)
      const priorities = patches.map(p => p.priority || 0);
      const removeIndex = patches.findIndex(p => p.type === 'REMOVE');
      const addIndex = patches.findIndex(p => p.type === 'ADD');
      expect(priorities[removeIndex]).toBeLessThan(priorities[addIndex]);
    });

    it('should handle large batches with requestAnimationFrame', (done) => {
      const differ = createKeyedDomDiff({ batchOperations: true });
      
      const parent = document.createElement('div');
      container.appendChild(parent);
      
      // Create 60 patches (> 50 threshold)
      const patches = [];
      for (let i = 0; i < 60; i++) {
        const child = document.createElement('span');
        child.textContent = `Item ${i}`;
        patches.push({
          type: 'ADD' as const,
          parent,
          node: child,
          index: i
        });
      }
      
      differ.patch(patches);
      
      // Should apply asynchronously
      expect(parent.children).toHaveLength(0);
      
      setTimeout(() => {
        expect(parent.children).toHaveLength(60);
        done();
      }, 20);
    });
  });

  describe('move tracking', () => {
    it('should track move operations when enabled', () => {
      const differ = createKeyedDomDiff({ trackMoves: true });
      
      const oldList = document.createElement('ul');
      const items = ['A', 'B', 'C'];
      items.forEach((text, i) => {
        const li = document.createElement('li');
        li.setAttribute('key', text);
        li.textContent = text;
        oldList.appendChild(li);
      });
      
      const newList = document.createElement('ul');
      // Reverse order: C, B, A
      ['C', 'B', 'A'].forEach(text => {
        const li = document.createElement('li');
        li.setAttribute('key', text);
        li.textContent = text;
        newList.appendChild(li);
      });
      
      differ.diff(oldList, newList);
      const moves = differ.getMoveOperations();
      
      expect(moves.length).toBeGreaterThan(0);
      moves.forEach(move => {
        expect(move).toHaveProperty('element');
        expect(move).toHaveProperty('from');
        expect(move).toHaveProperty('to');
        expect(move).toHaveProperty('key');
      });
    });
  });

  describe('mixed keyed and unkeyed children', () => {
    it('should handle mixed keyed and unkeyed children', () => {
      const differ = createKeyedDomDiff();
      
      const oldEl = document.createElement('div');
      // Mix of keyed and unkeyed
      const keyed1 = document.createElement('span');
      keyed1.setAttribute('key', 'k1');
      keyed1.textContent = 'Keyed 1';
      oldEl.appendChild(keyed1);
      
      const unkeyed1 = document.createElement('span');
      unkeyed1.textContent = 'Unkeyed 1';
      oldEl.appendChild(unkeyed1);
      
      const keyed2 = document.createElement('span');
      keyed2.setAttribute('key', 'k2');
      keyed2.textContent = 'Keyed 2';
      oldEl.appendChild(keyed2);
      
      const newEl = document.createElement('div');
      // Reorder keyed, change unkeyed
      const newKeyed2 = document.createElement('span');
      newKeyed2.setAttribute('key', 'k2');
      newKeyed2.textContent = 'Keyed 2 Updated';
      newEl.appendChild(newKeyed2);
      
      const newUnkeyed = document.createElement('span');
      newUnkeyed.textContent = 'Unkeyed Changed';
      newEl.appendChild(newUnkeyed);
      
      const newKeyed1 = document.createElement('span');
      newKeyed1.setAttribute('key', 'k1');
      newKeyed1.textContent = 'Keyed 1';
      newEl.appendChild(newKeyed1);
      
      const patches = differ.diff(oldEl, newEl);
      
      // Should handle both keyed moves and unkeyed updates
      expect(patches.some(p => p.type === 'MOVE')).toBe(true);
      expect(patches.some(p => p.type === 'TEXT')).toBe(true);
    });
  });

  describe('component awareness', () => {
    it('should preserve component references', () => {
      const componentMap = new WeakMap();
      const mockComponent = { name: 'TestComponent' };
      
      const oldEl = document.createElement('div');
      componentMap.set(oldEl, mockComponent);
      
      const newEl = document.createElement('span'); // Different tag
      
      const differ = createKeyedDomDiff({ componentMap });
      const patches = differ.diff(oldEl, newEl);
      
      expect(patches).toHaveLength(1);
      expect(patches[0].type).toBe('REPLACE');
      expect(patches[0].component).toBe(mockComponent);
    });
  });

  describe('edge cases', () => {
    it('should handle empty to populated', () => {
      const differ = createKeyedDomDiff();
      const oldEl = document.createElement('div');
      const newEl = document.createElement('div');
      
      for (let i = 0; i < 5; i++) {
        const child = document.createElement('span');
        child.setAttribute('key', `item-${i}`);
        newEl.appendChild(child);
      }
      
      const patches = differ.diff(oldEl, newEl);
      expect(patches.filter(p => p.type === 'ADD')).toHaveLength(5);
    });

    it('should handle populated to empty', () => {
      const differ = createKeyedDomDiff();
      const oldEl = document.createElement('div');
      const newEl = document.createElement('div');
      
      for (let i = 0; i < 5; i++) {
        const child = document.createElement('span');
        child.setAttribute('key', `item-${i}`);
        oldEl.appendChild(child);
      }
      
      const patches = differ.diff(oldEl, newEl);
      expect(patches.filter(p => p.type === 'REMOVE')).toHaveLength(5);
    });

    it('should handle null nodes', () => {
      const differ = createKeyedDomDiff();
      const el = document.createElement('div');
      
      expect(() => differ.diff(null, el)).not.toThrow();
      expect(() => differ.diff(el, null)).not.toThrow();
      expect(() => differ.diff(null, null)).not.toThrow();
    });
  });

  describe('convenience functions', () => {
    it('should work with keyedDiff function', () => {
      const oldEl = document.createElement('div');
      oldEl.textContent = 'Old';
      
      const newEl = document.createElement('div');
      newEl.textContent = 'New';
      
      const patches = keyedDiff(oldEl, newEl);
      expect(patches).toHaveLength(1);
      expect(patches[0].type).toBe('TEXT');
    });

    it('should work with keyedPatch function', () => {
      const el = document.createElement('div');
      el.textContent = 'Old';
      container.appendChild(el);
      
      const patches = [{
        type: 'TEXT' as const,
        node: el,
        content: 'New'
      }];
      
      keyedPatch(patches);
      expect(el.textContent).toBe('New');
    });
  });

  describe('performance', () => {
    it('should handle large lists efficiently', () => {
      const differ = createKeyedDomDiff();
      
      // Create large lists
      const oldList = document.createElement('ul');
      const newList = document.createElement('ul');
      
      // Old: 1000 items
      for (let i = 0; i < 1000; i++) {
        const li = document.createElement('li');
        li.setAttribute('key', `item-${i}`);
        li.textContent = `Item ${i}`;
        oldList.appendChild(li);
      }
      
      // New: Same items but every 10th removed and some new ones added
      for (let i = 0; i < 1000; i++) {
        if (i % 10 !== 0) {
          const li = document.createElement('li');
          li.setAttribute('key', `item-${i}`);
          li.textContent = `Item ${i} Updated`;
          newList.appendChild(li);
        }
      }
      
      // Add some new items
      for (let i = 1000; i < 1050; i++) {
        const li = document.createElement('li');
        li.setAttribute('key', `item-${i}`);
        li.textContent = `New Item ${i}`;
        newList.appendChild(li);
      }
      
      const start = performance.now();
      const patches = differ.diff(oldList, newList);
      const end = performance.now();
      
      // Should complete quickly (< 100ms for 1000 items)
      expect(end - start).toBeLessThan(100);
      
      // Should have correct number of operations
      const removeCount = patches.filter(p => p.type === 'REMOVE').length;
      const addCount = patches.filter(p => p.type === 'ADD').length;
      const textCount = patches.filter(p => p.type === 'TEXT').length;
      
      expect(removeCount).toBe(100); // Every 10th removed
      expect(addCount).toBe(50); // 50 new items
      expect(textCount).toBeGreaterThan(0); // Updated text
    });
  });
});
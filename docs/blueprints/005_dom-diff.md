[<- Back to Index](./000_master_blueprint.md)

# Blueprint: dom-diff.js

**Objective:** To create a lightweight utility for diffing and patching the DOM.

**Test Specification:** `tests/core/dom-diff.test.js`

```javascript
import { diff } from '../../js/core/dom-diff.js';
import { expect } from '../../js/testing/expect.js';
import { describe, it, beforeEach } from '../../js/testing/veritas.js';

// Helper to create a DOM element from an HTML string
const fromHTML = (html) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.firstElementChild;
};

describe('DOM Diffing Utility', () => {
  let host;

  beforeEach(() => {
    document.body.innerHTML = '<div id="host"></div>';
    host = document.getElementById('host');
  });

  // == Text Node Operations ==
  describe('Text Node Updates', () => {
    it('should correctly update the text content of a text node', () => {
      const oldNode = document.createTextNode('Hello');
      host.appendChild(oldNode);
      const newNode = document.createTextNode('World');
      diff(host, newNode, oldNode);
      expect(host.textContent).toBe('World');
    });

    it('should not touch the node if the text content is the same', () => {
      const oldNode = document.createTextNode('Same');
      host.appendChild(oldNode);
      const originalRef = host.firstChild;
      const newNode = document.createTextNode('Same');
      diff(host, newNode, oldNode);
      expect(host.firstChild).toBe(originalRef); // Should be the exact same node
    });
  });

  // == Element Node & Attribute Operations ==
  describe('Element and Attribute Updates', () => {
    it('should replace a node if the tag name changes', () => {
      const oldNode = fromHTML('<div>Old</div>');
      host.appendChild(oldNode);
      const newNode = fromHTML('<span>New</span>');
      diff(host, newNode, oldNode);
      expect(host.firstElementChild.tagName).toBe('SPAN');
      expect(host.textContent).toBe('New');
    });

    it('should add a new attribute', () => {
      const oldNode = fromHTML('<div></div>');
      host.appendChild(oldNode);
      const newNode = fromHTML('<div class="new-class"></div>');
      diff(host.firstElementChild, newNode, oldNode);
      expect(host.firstElementChild.getAttribute('class')).toBe('new-class');
    });

    it('should update an existing attribute', () => {
      const oldNode = fromHTML('<div class="old-class"></div>');
      host.appendChild(oldNode);
      const newNode = fromHTML('<div class="new-class"></div>');
      diff(host.firstElementChild, newNode, oldNode);
      expect(host.firstElementChild.getAttribute('class')).toBe('new-class');
    });

    it('should remove an attribute that no longer exists', () => {
      const oldNode = fromHTML('<div id="unique" class="old-class"></div>');
      host.appendChild(oldNode);
      const newNode = fromHTML('<div id="unique"></div>');
      diff(host.firstElementChild, newNode, oldNode);
      expect(host.firstElementChild.hasAttribute('class')).toBe(false);
    });

    it('should not touch attributes that are unchanged', () => {
      const oldNode = fromHTML('<div class="same"></div>');
      host.appendChild(oldNode);
      // Set a property on the real DOM node to see if it gets destroyed
      host.firstElementChild.myProp = 'preserved';
      const newNode = fromHTML('<div class="same"></div>');
      diff(host.firstElementChild, newNode, oldNode);
      expect(host.firstElementChild.myProp).toBe('preserved');
    });
  });

  // == Child Node Operations ==
  describe('Child Node Updates', () => {
    it('should add new child nodes to an element', () => {
      const oldNode = fromHTML('<div></div>');
      host.appendChild(oldNode);
      const newNode = fromHTML('<div><p>Hello</p><span>World</span></div>');
      diff(host.firstElementChild, newNode, oldNode);
      expect(host.firstElementChild.children.length).toBe(2);
      expect(host.firstElementChild.children[0].tagName).toBe('P');
    });

    it('should remove surplus child nodes from an element', () => {
      const oldNode = fromHTML('<div><p>Hello</p><span>World</span></div>');
      host.appendChild(oldNode);
      const newNode = fromHTML('<div><p>Hello</p></div>');
      diff(host.firstElementChild, newNode, oldNode);
      expect(host.firstElementChild.children.length).toBe(1);
    });

    it('should recursively diff nested child nodes', () => {
      const oldNode = fromHTML('<div><p>Old Text</p></div>');
      host.appendChild(oldNode);
      const newNode = fromHTML('<div><p>New Text</p></div>');
      diff(host.firstElementChild, newNode, oldNode);
      expect(host.querySelector('p').textContent).toBe('New Text');
    });
  });
});
```

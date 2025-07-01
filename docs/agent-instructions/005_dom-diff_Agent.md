# dom-diff Implementation Instructions (Blueprint 005)

## Your Mission
You are responsible for implementing the dom-diff utility - a pure function that enables efficient UI updates by calculating and applying minimal DOM changes. This is the heart of the Principia.js rendering system.

## Setup Instructions

1. Create a new git worktree:
```bash
git worktree add ../principia-005 -b feature/blueprint-005
cd ../principia-005
```

2. Your implementation files:
- Main implementation: `src/dom-diff.ts`
- Test file: `test/dom-diff.test.ts`
- Integration: Update `src/index.ts` to export your module

## Blueprint Specification

### Core Requirements
1. **Pure Function**: No side effects except DOM manipulation
2. **Minimal Updates**: Only change what's different
3. **Node Comparison**: Compare elements, text, attributes
4. **Child Reconciliation**: Handle node additions, removals, reordering
5. **Attribute Diffing**: Efficiently update changed attributes
6. **Event Listeners**: Preserve existing event listeners

### Required Functions

```typescript
// Main diff function
export function diff(oldNode: Node, newNode: Node): void;

// Helper functions (internal, but test separately)
function diffAttributes(oldEl: Element, newEl: Element): void;
function diffChildren(oldEl: Element, newEl: Element): void;
function replaceNode(oldNode: Node, newNode: Node): void;
```

## Test-Driven Development Process

Follow this EXACT order - write one test at a time, make it pass, then commit:

### Test 1: Text Content Changes
```typescript
it('should update text content when it changes')
// Compare two text nodes with different content
```

### Test 2: Attribute Updates
```typescript
it('should update changed attributes')
// Test adding, removing, and modifying attributes
```

### Test 3: Class List Management
```typescript
it('should efficiently update class lists')
// Special handling for className changes
```

### Test 4: Node Type Changes
```typescript
it('should replace nodes when types differ')
// e.g., <div> to <span>
```

### Test 5: Child Node Addition
```typescript
it('should append new child nodes')
// Test adding nodes at the end
```

### Test 6: Child Node Removal
```typescript
it('should remove extra child nodes')
// Test removing nodes from the end
```

### Test 7: Child Node Reordering
```typescript
it('should reorder child nodes efficiently')
// Test using data-key attributes
```

### Test 8: Preserve Event Listeners
```typescript
it('should preserve event listeners on unchanged elements')
// Verify listeners aren't lost during updates
```

### Test 9: Style Updates
```typescript
it('should update inline styles efficiently')
// Test style property changes
```

### Test 10: Complex Tree Updates
```typescript
it('should handle complex nested updates')
// Test deep tree modifications
```

## Implementation Guidelines

### Main Diff Algorithm
```typescript
export function diff(oldNode: Node, newNode: Node): void {
  // Handle null cases
  if (!oldNode || !newNode) return;
  
  // If different node types, replace entirely
  if (oldNode.nodeType !== newNode.nodeType || 
      oldNode.nodeName !== newNode.nodeName) {
    replaceNode(oldNode, newNode);
    return;
  }
  
  // Handle text nodes
  if (oldNode.nodeType === Node.TEXT_NODE) {
    if (oldNode.textContent !== newNode.textContent) {
      oldNode.textContent = newNode.textContent;
    }
    return;
  }
  
  // Handle element nodes
  if (oldNode.nodeType === Node.ELEMENT_NODE) {
    diffAttributes(oldNode as Element, newNode as Element);
    diffChildren(oldNode as Element, newNode as Element);
  }
}
```

### Attribute Diffing
```typescript
function diffAttributes(oldEl: Element, newEl: Element): void {
  // Remove attributes not in new element
  const oldAttrs = oldEl.attributes;
  for (let i = oldAttrs.length - 1; i >= 0; i--) {
    const attr = oldAttrs[i];
    if (!newEl.hasAttribute(attr.name)) {
      oldEl.removeAttribute(attr.name);
    }
  }
  
  // Set new or changed attributes
  const newAttrs = newEl.attributes;
  for (let i = 0; i < newAttrs.length; i++) {
    const attr = newAttrs[i];
    if (oldEl.getAttribute(attr.name) !== attr.value) {
      oldEl.setAttribute(attr.name, attr.value);
    }
  }
}
```

### Child Reconciliation
```typescript
function diffChildren(oldEl: Element, newEl: Element): void {
  const oldChildren = Array.from(oldEl.childNodes);
  const newChildren = Array.from(newEl.childNodes);
  
  const maxLength = Math.max(oldChildren.length, newChildren.length);
  
  for (let i = 0; i < maxLength; i++) {
    const oldChild = oldChildren[i];
    const newChild = newChildren[i];
    
    if (!oldChild) {
      // Append new child
      oldEl.appendChild(newChild.cloneNode(true));
    } else if (!newChild) {
      // Remove extra child
      oldEl.removeChild(oldChild);
    } else {
      // Recursively diff existing children
      diff(oldChild, newChild);
    }
  }
}
```

### Efficient Keyed Updates (Advanced)
```typescript
// For lists with data-key attributes
function diffKeyedChildren(oldEl: Element, newEl: Element): void {
  const oldKeyed = new Map<string, Element>();
  const newKeyed = new Map<string, Element>();
  
  // Build key maps
  Array.from(oldEl.children).forEach(child => {
    const key = child.getAttribute('data-key');
    if (key) oldKeyed.set(key, child);
  });
  
  Array.from(newEl.children).forEach(child => {
    const key = child.getAttribute('data-key');
    if (key) newKeyed.set(key, child);
  });
  
  // Reorder based on keys
  // ... implementation details
}
```

## Performance Considerations

1. **Minimize DOM Access**: Batch reads and writes
2. **Avoid Reflows**: Update all attributes before modifying children
3. **Clone Wisely**: Only clone when inserting new nodes
4. **Preserve References**: Don't recreate nodes unnecessarily

## Testing Utilities

Create helper functions for tests:
```typescript
function createElement(html: string): Element {
  const div = document.createElement('div');
  div.innerHTML = html.trim();
  return div.firstElementChild!;
}

function createTextNode(text: string): Text {
  return document.createTextNode(text);
}
```

## Commit Process

After EACH test passes:
```bash
git add -A
git commit -m "feat(dom-diff): <specific feature implemented>"
```

Example commits:
- `feat(dom-diff): implement text content updates`
- `feat(dom-diff): add attribute diffing algorithm`
- `feat(dom-diff): implement child node reconciliation`

## Final Steps

1. After all tests pass, update `src/index.ts`:
```typescript
export { diff } from './dom-diff';
```

2. Run all tests to ensure no regressions:
```bash
bun test
```

3. Create PR:
```bash
gh pr create --title "feat(dom-diff): Implement Blueprint 005 - DOM Diffing Algorithm" \
  --body "Implements efficient DOM diffing for minimal UI updates with full test coverage"
```

## Architecture Notes

- dom-diff is a PURE utility - no side effects except DOM updates
- It does NOT know about Components or state
- It simply compares two DOM trees and patches differences
- Components will use this to efficiently update their UI
- Performance is critical - this runs on every render

## Success Criteria

✅ All 10 tests passing
✅ 100% test coverage
✅ Efficient algorithm with minimal DOM touches
✅ Preserves event listeners and element references
✅ Handles all edge cases (null nodes, different types, etc.)
✅ Well-documented complex algorithms
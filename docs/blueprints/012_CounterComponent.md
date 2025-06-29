[<- Back to Index](./000_master_blueprint.md)

# Blueprint: CounterComponent.js

**Objective:** To create a simple, state-driven UI component to display a count.

**Test Specification:** `tests/components/Counter/CounterComponent.test.js`

```javascript
import { CounterComponent } from '../../js/components/Counter/CounterComponent.js';
import { StateManager } from '../../js/core/StateManager.js';
import { expect } from '../../js/testing/expect.js';
import { describe, it, beforeEach } from '../../js/testing/veritas.js';

describe('CounterComponent', () => {
  let host;
  let stateManager;

  beforeEach(() => {
    document.body.innerHTML = '<div id="host"></div>';
    host = document.getElementById('host');
    StateManager._resetInstance();
    stateManager = StateManager.getInstance();
    stateManager.initialize({ stats: { participantCount: 100 } });
  });

  it('should render the initial count from props on attach()', () => {
    const counter = new CounterComponent(host, { count: 50 });
    counter.attach();
    expect(host.textContent).toBe('50');
  });

  it('should render the initial count from StateManager if no props are provided', () => {
    // This component will subscribe to 'stats.participantCount'
    const counter = new CounterComponent(host, {});
    counter.attach();
    expect(host.textContent).toBe('100');
  });

  it('should reactively update when the subscribed state changes', () => {
    const counter = new CounterComponent(host, {});
    counter.attach(); // Renders "100"
    
    stateManager.set('stats.participantCount', 250);
    
    expect(host.textContent).toBe('250');
  });

  it('should use a label from props if provided', () => {
    const counter = new CounterComponent(host, { count: 10, label: 'Participants' });
    counter.attach();
    expect(host.innerHTML).toContain('<span class="label">Participants</span>');
  });

  // This tests the intelligent diffing.
  it('should update only the number text node, not the entire component, on change', () => {
    const counter = new CounterComponent(host, { count: 10, label: 'Participants' });
    counter.attach();
    
    const labelElement = host.querySelector('.label');
    const numberElement = host.querySelector('.number');
    
    stateManager.set('stats.participantCount', 250); // Will trigger an update
    
    expect(host.querySelector('.label')).toBe(labelElement); // The label element should be the same object
    expect(host.querySelector('.number')).not.toBe(numberElement); // The number node may be new
    expect(host.querySelector('.number').textContent).toBe('250');
  });
});
```

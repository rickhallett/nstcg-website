[<- Back to Index](./000_master_blueprint.md)

# Blueprint: NotificationComponent.js

**Objective:** To display small, temporary, non-blocking messages to the user.

**Test Specification:** `tests/components/Notification/NotificationComponent.test.js`

```javascript
import { NotificationComponent } from '../../js/components/Notification/NotificationComponent.js';
import { EventBus } from '../../js/core/EventBus.js';
import { expect } from '../../js/testing/expect.js';
import { describe, it, beforeEach, mockFn } from '../../js/testing/veritas.js';

jest.mock('../../js/core/EventBus.js');

describe('NotificationComponent', () => {
  let host;
  let notificationComponent;
  let mockEventBus;

  beforeEach(() => {
    document.body.innerHTML = '<div id="notification-host"></div>';
    host = document.getElementById('notification-host');
    EventBus._resetInstance();
    mockEventBus = EventBus.getInstance();
    
    // The component subscribes to the event bus on its own
    notificationComponent = new NotificationComponent(host, {});
    notificationComponent.attach();
  });

  it('should subscribe to the "ui:show:notification" event upon initialization', () => {
    expect(mockEventBus.on).toHaveBeenCalledWith('ui:show:notification', expect.any(Function));
  });

  it('should not be visible initially', () => {
    expect(host.innerHTML).toBe('');
  });

  it('should display a notification when a "ui:show:notification" event is emitted', () => {
    const handler = mockEventBus.on.mock.calls[0][1];
    handler({ message: 'Test message', type: 'success' });
    
    const notificationEl = host.querySelector('.notification');
    expect(notificationEl).not.toBeNull();
    expect(notificationEl.textContent).toContain('Test message');
    expect(notificationEl.classList.contains('notification-success')).toBe(true);
  });
  
  it('should automatically hide the notification after a specified duration', async () => {
    jest.useFakeTimers(); // Veritas will need a mock timer utility
    const handler = mockEventBus.on.mock.calls[0][1];
    handler({ message: 'Test', duration: 3000 });
    
    expect(host.querySelector('.notification')).not.toBeNull();
    
    jest.advanceTimersByTime(3000);
    await Promise.resolve(); // Allow DOM updates to process
    
    expect(host.querySelector('.notification')).toBeNull();
    jest.useRealTimers();
  });
});
```

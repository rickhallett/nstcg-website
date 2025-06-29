type EventHandler<T = any> = (payload: T) => void;

class EventBus {
  private static instance: EventBus | null;
  private events: { [key: string]: EventHandler[] } = {};

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public static _resetInstance(): void {
    EventBus.instance = null;
  }

  public on<T>(event: string, callback: EventHandler<T>): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    return () => {
      this.off(event, callback);
    };
  }

  public off<T>(event: string, callback: EventHandler<T>): void {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }

  public emit<T>(event: string, data?: T): void {
    if (this.events[event]) {
      this.events[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }
}

export { EventBus, EventHandler };


/**
 * Frontend Debug Logger
 * Sends logs to backend API and stores in localStorage as backup
 */

class DebugLogger {
  constructor(component = 'general') {
    this.component = component;
    this.logBuffer = [];
    this.bufferSize = 50; // Buffer up to 50 logs before sending
    this.flushInterval = 5000; // Flush every 5 seconds
    this.storageKey = 'nstcg_debug_logs';
    
    // Load any unsent logs from localStorage
    this.loadStoredLogs();
    
    // Set up periodic flush
    this.startFlushTimer();
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flush());
  }

  loadStoredLogs() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const logs = JSON.parse(stored);
        this.logBuffer = [...logs, ...this.logBuffer];
        localStorage.removeItem(this.storageKey);
      }
    } catch (error) {
      console.error('Failed to load stored logs:', error);
    }
  }

  startFlushTimer() {
    this.flushTimer = setInterval(() => {
      if (this.logBuffer.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  createLogEntry(level, message, data = null) {
    return {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      url: window.location.href,
      userAgent: navigator.userAgent,
      message,
      data,
      sessionId: this.getSessionId(),
      userId: localStorage.getItem('nstcg_user_id') || null,
      email: localStorage.getItem('nstcg_email') || null
    };
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('nstcg_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('nstcg_session_id', sessionId);
    }
    return sessionId;
  }

  log(level, message, data) {
    const entry = this.createLogEntry(level, message, data);
    
    // Also log to console for development
    const consoleMethod = level.toLowerCase() === 'error' ? 'error' : 'log';
    console[consoleMethod](`[${this.component}] ${message}`, data || '');
    
    // Add to buffer
    this.logBuffer.push(entry);
    
    // Flush if buffer is full
    if (this.logBuffer.length >= this.bufferSize) {
      this.flush();
    }
  }

  async flush() {
    if (this.logBuffer.length === 0) return;
    
    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];
    
    try {
      // Store in localStorage first (in case send fails)
      const existingLogs = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      localStorage.setItem(this.storageKey, JSON.stringify([...existingLogs, ...logsToSend]));
      
      // Send to backend
      const response = await fetch('/api/debug-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ logs: logsToSend })
      });
      
      if (response.ok) {
        // Clear from localStorage on success
        localStorage.removeItem(this.storageKey);
      } else {
        // Keep in localStorage for retry
        console.error('Failed to send logs to server:', response.status);
      }
    } catch (error) {
      console.error('Error sending logs:', error);
      // Logs remain in localStorage for next attempt
    }
  }

  // Convenience methods
  error(message, data) {
    this.log('ERROR', message, data);
  }

  warn(message, data) {
    this.log('WARN', message, data);
  }

  info(message, data) {
    this.log('INFO', message, data);
  }

  debug(message, data) {
    this.log('DEBUG', message, data);
  }

  // Track specific events
  trackEvent(eventName, eventData) {
    this.info(`Event: ${eventName}`, eventData);
  }

  // Track API calls
  trackAPI(method, endpoint, data, response) {
    this.info('API Call', {
      method,
      endpoint,
      requestData: data,
      responseStatus: response?.status,
      responseData: response?.data
    });
  }

  // Clean up
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Export for use in modules
export default DebugLogger;

// Also make available globally for inline scripts
window.DebugLogger = DebugLogger;
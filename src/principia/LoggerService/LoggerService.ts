/**
 * LoggerService - Singleton service for logging application events and errors
 * Follows Principia.js architectural canon: The State is Singular
 */
export class LoggerService {
  private static instance: LoggerService | null = null;

  /**
   * Log level constants in order of severity
   */
  static readonly LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  } as const;

  /**
   * Current minimum log level threshold
   */
  private currentLevel: number = LoggerService.LOG_LEVELS.INFO;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    if (LoggerService.instance) {
      throw new Error('Use getInstance() instead');
    }
  }

  /**
   * Get the singleton instance of LoggerService
   * @returns The singleton instance
   */
  static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  /**
   * Reset the singleton instance (for testing purposes only)
   * @private
   */
  static _resetInstance(): void {
    LoggerService.instance = null;
  }

  /**
   * Set the minimum log level threshold
   * @param level The log level (string or number)
   */
  setLevel(level: string | number): void {
    if (typeof level === 'string') {
      const upperLevel = level.toUpperCase() as keyof typeof LoggerService.LOG_LEVELS;
      if (upperLevel in LoggerService.LOG_LEVELS) {
        this.currentLevel = LoggerService.LOG_LEVELS[upperLevel];
      }
    } else if (typeof level === 'number' && level >= 0 && level <= 3) {
      this.currentLevel = level;
    }
  }

  /**
   * Get the current log level threshold
   * @returns The current log level
   */
  getCurrentLevel(): number {
    return this.currentLevel;
  }

  /**
   * Check if a message should be logged based on the current level
   * @param level The level to check
   * @returns True if the message should be logged
   * @private
   */
  private shouldLog(level: number): boolean {
    return level >= this.currentLevel;
  }

  /**
   * Log an informational message
   * @param message The message to log
   * @param metadata Optional metadata to include
   */
  info(message: string, metadata?: any): void {
    if (this.shouldLog(LoggerService.LOG_LEVELS.INFO)) {
      this.processLog('INFO', message, metadata);
    }
  }

  /**
   * Log a warning message
   * @param message The message to log
   * @param metadata Optional metadata to include
   */
  warn(message: string, metadata?: any): void {
    if (this.shouldLog(LoggerService.LOG_LEVELS.WARN)) {
      this.processLog('WARN', message, metadata);
    }
  }

  /**
   * Log an error message
   * @param message The message to log
   * @param metadata Optional metadata to include
   */
  error(message: string, metadata?: any): void {
    if (this.shouldLog(LoggerService.LOG_LEVELS.ERROR)) {
      this.processLog('ERROR', message, metadata);
    }
  }

  /**
   * Log a debug message
   * @param message The message to log
   * @param metadata Optional metadata to include
   */
  debug(message: string, metadata?: any): void {
    if (this.shouldLog(LoggerService.LOG_LEVELS.DEBUG)) {
      this.processLog('DEBUG', message, metadata);
    }
  }

  /**
   * Process a log message (placeholder for now)
   * @param level The log level
   * @param message The message to log
   * @param metadata Optional metadata
   * @private
   */
  private processLog(level: string, message: string, metadata?: any): void {
    // For now, just output to console - will be enhanced later
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${level}: ${message}`, metadata || {});
  }
}
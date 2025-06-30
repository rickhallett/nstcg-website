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
}
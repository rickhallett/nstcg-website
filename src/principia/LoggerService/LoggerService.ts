/**
 * LoggerService - Singleton service for logging application events and errors
 * Follows Principia.js architectural canon: The State is Singular
 */
export class LoggerService {
  private static instance: LoggerService | null = null;

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
}
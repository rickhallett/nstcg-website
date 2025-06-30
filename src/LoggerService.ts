class LoggerService {
  private static instance: LoggerService | null;

  private constructor() {}

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  public static _resetInstance(): void {
    LoggerService.instance = null;
  }

  public error(message: string, data: any): void {
    console.error(message, data);
  }
}

export { LoggerService };

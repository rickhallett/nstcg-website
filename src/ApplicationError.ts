class ApplicationError extends Error {
  public userMessage: string;
  public context: any;

  constructor(message: string, userMessage: string, context: any = {}) {
    super(message);
    this.name = this.constructor.name;
    this.userMessage = userMessage;
    this.context = context;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

class APIError extends ApplicationError {
  public statusCode: number;

  constructor(message: string, userMessage: string, apiDetails: any = {}) {
    super(message, userMessage, { api: apiDetails });
    this.statusCode = apiDetails.statusCode;
  }
}

class ValidationError extends ApplicationError {
  public validationErrors: any[];

  constructor(message: string, userMessage: string, validationErrors: any[] = []) {
    super(message, userMessage, { validationErrors });
    this.validationErrors = validationErrors;
  }
}

export { ApplicationError, APIError, ValidationError };

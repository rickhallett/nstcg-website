/**
 * Type definitions for ApplicationError module
 */

export interface ApplicationErrorContext {
  [key: string]: any;
}

export interface APIErrorDetails {
  statusCode?: number;
  method?: string;
  url?: string;
  responseBody?: any;
  requestBody?: any;
  headers?: Record<string, string>;
}
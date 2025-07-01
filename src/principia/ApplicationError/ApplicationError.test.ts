import { describe, it, expect } from 'bun:test';
import { ApplicationError, APIError, ValidationError } from './ApplicationError';

describe('Custom Application Errors', () => {
  describe('ApplicationError', () => {
    it('should correctly set properties', () => {
      const error = new ApplicationError('Technical message', 'User message', { custom: 'context' });
      expect(error.message).toBe('Technical message');
      expect(error.userMessage).toBe('User message');
      expect(error.context).toEqual({ custom: 'context' });
      expect(error.name).toBe('ApplicationError');
    });
  });

  describe('APIError', () => {
    it('should correctly set properties', () => {
      const error = new APIError('API failed', 'Could not connect', { statusCode: 500 });
      expect(error.message).toBe('API failed');
      expect(error.userMessage).toBe('Could not connect');
      expect(error.statusCode).toBe(500);
      expect(error.context).toEqual({ api: { statusCode: 500 } });
      expect(error.name).toBe('APIError');
    });
  });

  describe('ValidationError', () => {
    it('should correctly set properties', () => {
      const errors = [{ field: 'email', message: 'Invalid email' }];
      const error = new ValidationError('Validation failed', 'Please check your input', errors);
      expect(error.message).toBe('Validation failed');
      expect(error.userMessage).toBe('Please check your input');
      expect(error.validationErrors).toEqual(errors);
      expect(error.context).toEqual({ validationErrors: errors });
      expect(error.name).toBe('ValidationError');
    });
  });
});
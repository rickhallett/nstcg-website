/**
 * File-based Logger for API endpoints
 * Provides persistent logging that survives across requests in serverless environment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log levels
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

class Logger {
  constructor(endpoint) {
    this.endpoint = endpoint;
    // Use /tmp directory in Vercel serverless environment
    this.logsDir = process.env.VERCEL 
      ? `/tmp/logs/api`
      : path.join(__dirname, '../../logs/api');
    
    // Ensure logs directory exists
    this.ensureLogsDirectory();
  }

  ensureLogsDirectory() {
    try {
      if (!fs.existsSync(this.logsDir)) {
        fs.mkdirSync(this.logsDir, { recursive: true });
      }
    } catch (error) {
      // In serverless, directory creation might fail - that's ok
      if (process.env.VERCEL) {
        this.logsDir = '/tmp'; // Fallback to /tmp root
      } else {
        console.error('Failed to create logs directory:', error);
      }
    }
  }

  getLogFilePath() {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logsDir, `${this.endpoint}-${date}.log`);
  }

  formatLogEntry(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      endpoint: this.endpoint,
      message,
      ...(data && { data })
    };
    
    return JSON.stringify(logEntry) + '\n';
  }

  writeLog(level, message, data) {
    try {
      const logPath = this.getLogFilePath();
      const logEntry = this.formatLogEntry(level, message, data);
      
      // Append to log file
      try {
        fs.appendFileSync(logPath, logEntry, 'utf8');
      } catch (writeError) {
        // If file write fails in serverless, just log to console
        if (process.env.VERCEL) {
          console.log('Log entry:', logEntry);
        } else {
          throw writeError;
        }
      }
      
      // Also log to console for development
      console.log(`[${level}] ${message}`, data || '');
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  error(message, data) {
    this.writeLog(LOG_LEVELS.ERROR, message, data);
  }

  warn(message, data) {
    this.writeLog(LOG_LEVELS.WARN, message, data);
  }

  info(message, data) {
    this.writeLog(LOG_LEVELS.INFO, message, data);
  }

  debug(message, data) {
    this.writeLog(LOG_LEVELS.DEBUG, message, data);
  }

  // Log API request
  logRequest(req) {
    const { method, url, headers, body, query } = req;
    this.info('API Request received', {
      method,
      url,
      query,
      body: body || {},
      userAgent: headers['user-agent'],
      ip: headers['x-forwarded-for'] || req.connection?.remoteAddress
    });
  }

  // Log API response
  logResponse(statusCode, responseData) {
    this.info('API Response sent', {
      statusCode,
      response: responseData
    });
  }

  // Log database operation
  logDatabaseOp(operation, database, query, result) {
    this.debug(`Database ${operation}`, {
      database,
      query,
      resultCount: Array.isArray(result) ? result.length : 1,
      success: !!result
    });
  }
}

export default Logger;
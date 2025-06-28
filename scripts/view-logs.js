#!/usr/bin/env node

/**
 * Log Viewer Tool
 * View and analyze logs from the activation flow
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LogViewer {
  constructor() {
    this.logsDir = path.join(__dirname, '../logs');
  }

  // Get today's log files
  getTodaysLogFiles() {
    const date = new Date().toISOString().split('T')[0];
    const files = [];
    
    // Check API logs
    const apiLogPath = path.join(this.logsDir, 'api', `activate-user-${date}.log`);
    if (fs.existsSync(apiLogPath)) {
      files.push({ type: 'api', path: apiLogPath });
    }
    
    // Check frontend logs
    const frontendLogPath = path.join(this.logsDir, 'frontend', `activation-flow-${date}.log`);
    if (fs.existsSync(frontendLogPath)) {
      files.push({ type: 'frontend', path: frontendLogPath });
    }
    
    return files;
  }

  // Parse log line
  parseLogLine(line) {
    try {
      return JSON.parse(line);
    } catch (error) {
      return null;
    }
  }

  // Format log entry for display
  formatLogEntry(entry, type) {
    const levelColors = {
      ERROR: colors.red,
      WARN: colors.yellow,
      INFO: colors.green,
      DEBUG: colors.cyan
    };
    
    const levelColor = levelColors[entry.level] || colors.reset;
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    
    let output = `[${colors.bright}${timestamp}${colors.reset}] `;
    output += `${levelColor}${entry.level.padEnd(5)}${colors.reset} `;
    output += `[${colors.magenta}${type}${colors.reset}] `;
    output += entry.message;
    
    if (entry.data) {
      output += '\n' + colors.cyan + JSON.stringify(entry.data, null, 2) + colors.reset;
    }
    
    return output;
  }

  // View logs in real-time (tail -f)
  async tailLogs() {
    console.log(colors.bright + '📋 Tailing activation logs...' + colors.reset);
    console.log(colors.yellow + 'Press Ctrl+C to stop\n' + colors.reset);
    
    const files = this.getTodaysLogFiles();
    
    if (files.length === 0) {
      console.log(colors.red + 'No log files found for today' + colors.reset);
      return;
    }
    
    // Set up watchers for each file
    const watchers = files.map(({ type, path }) => {
      let size = fs.existsSync(path) ? fs.statSync(path).size : 0;
      
      console.log(`Watching ${type} logs: ${path}`);
      
      // Read existing content
      if (fs.existsSync(path)) {
        const content = fs.readFileSync(path, 'utf8');
        const lines = content.split('\n').filter(Boolean);
        lines.slice(-10).forEach(line => {
          const entry = this.parseLogLine(line);
          if (entry) {
            console.log(this.formatLogEntry(entry, type));
          }
        });
      }
      
      // Watch for changes
      return fs.watch(path, (eventType) => {
        if (eventType === 'change') {
          const newSize = fs.statSync(path).size;
          if (newSize > size) {
            const buffer = Buffer.alloc(newSize - size);
            const fd = fs.openSync(path, 'r');
            fs.readSync(fd, buffer, 0, newSize - size, size);
            fs.closeSync(fd);
            
            const newContent = buffer.toString('utf8');
            const lines = newContent.split('\n').filter(Boolean);
            
            lines.forEach(line => {
              const entry = this.parseLogLine(line);
              if (entry) {
                console.log(this.formatLogEntry(entry, type));
              }
            });
            
            size = newSize;
          }
        }
      });
    });
    
    // Keep process running
    process.on('SIGINT', () => {
      console.log('\n' + colors.yellow + 'Stopping log tail...' + colors.reset);
      watchers.forEach(watcher => watcher.close());
      process.exit(0);
    });
  }

  // View specific session logs
  async viewSession(sessionId) {
    console.log(colors.bright + `📋 Viewing logs for session: ${sessionId}` + colors.reset + '\n');
    
    const files = this.getTodaysLogFiles();
    const logs = [];
    
    // Collect all logs
    for (const { type, path } of files) {
      if (fs.existsSync(path)) {
        const content = fs.readFileSync(path, 'utf8');
        const lines = content.split('\n').filter(Boolean);
        
        lines.forEach(line => {
          const entry = this.parseLogLine(line);
          if (entry && (entry.sessionId === sessionId || entry.data?.sessionId === sessionId)) {
            logs.push({ ...entry, logType: type });
          }
        });
      }
    }
    
    // Sort by timestamp
    logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Display logs
    if (logs.length === 0) {
      console.log(colors.red + 'No logs found for this session' + colors.reset);
    } else {
      logs.forEach(log => {
        console.log(this.formatLogEntry(log, log.logType));
      });
    }
  }

  // Search logs
  async searchLogs(pattern) {
    console.log(colors.bright + `🔍 Searching for: ${pattern}` + colors.reset + '\n');
    
    const files = this.getTodaysLogFiles();
    const regex = new RegExp(pattern, 'i');
    let found = 0;
    
    for (const { type, path } of files) {
      if (fs.existsSync(path)) {
        const content = fs.readFileSync(path, 'utf8');
        const lines = content.split('\n').filter(Boolean);
        
        lines.forEach(line => {
          const entry = this.parseLogLine(line);
          if (entry) {
            const fullText = JSON.stringify(entry);
            if (regex.test(fullText)) {
              console.log(this.formatLogEntry(entry, type));
              found++;
            }
          }
        });
      }
    }
    
    console.log(`\n${colors.yellow}Found ${found} matching entries${colors.reset}`);
  }

  // Show log summary
  async showSummary() {
    console.log(colors.bright + '📊 Log Summary' + colors.reset + '\n');
    
    const files = this.getTodaysLogFiles();
    const stats = {
      total: 0,
      byLevel: {},
      byComponent: {},
      errors: []
    };
    
    for (const { type, path } of files) {
      if (fs.existsSync(path)) {
        const content = fs.readFileSync(path, 'utf8');
        const lines = content.split('\n').filter(Boolean);
        
        lines.forEach(line => {
          const entry = this.parseLogLine(line);
          if (entry) {
            stats.total++;
            stats.byLevel[entry.level] = (stats.byLevel[entry.level] || 0) + 1;
            
            const component = entry.component || entry.endpoint || type;
            stats.byComponent[component] = (stats.byComponent[component] || 0) + 1;
            
            if (entry.level === 'ERROR') {
              stats.errors.push({
                time: new Date(entry.timestamp).toLocaleTimeString(),
                message: entry.message,
                type
              });
            }
          }
        });
      }
    }
    
    // Display summary
    console.log(`Total log entries: ${stats.total}`);
    console.log('\nBy Level:');
    Object.entries(stats.byLevel).forEach(([level, count]) => {
      console.log(`  ${level}: ${count}`);
    });
    
    console.log('\nBy Component:');
    Object.entries(stats.byComponent).forEach(([component, count]) => {
      console.log(`  ${component}: ${count}`);
    });
    
    if (stats.errors.length > 0) {
      console.log(`\n${colors.red}Errors Found:${colors.reset}`);
      stats.errors.forEach(error => {
        console.log(`  [${error.time}] ${error.type}: ${error.message}`);
      });
    }
  }
}

// Main CLI
async function main() {
  const viewer = new LogViewer();
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'tail') {
    await viewer.tailLogs();
  } else if (args[0] === 'session' && args[1]) {
    await viewer.viewSession(args[1]);
  } else if (args[0] === 'search' && args[1]) {
    await viewer.searchLogs(args[1]);
  } else if (args[0] === 'summary') {
    await viewer.showSummary();
  } else {
    console.log(`
${colors.bright}Log Viewer Usage:${colors.reset}

  node scripts/view-logs.js [command] [options]

${colors.bright}Commands:${colors.reset}
  tail                    - Watch logs in real-time (default)
  session <sessionId>     - View all logs for a specific session
  search <pattern>        - Search logs for a pattern
  summary                 - Show log summary and statistics

${colors.bright}Examples:${colors.reset}
  node scripts/view-logs.js                              # Tail logs
  node scripts/view-logs.js session session_1234_abc     # View session
  node scripts/view-logs.js search "activation failed"   # Search logs
  node scripts/view-logs.js summary                      # Show summary
    `);
  }
}

main().catch(console.error);
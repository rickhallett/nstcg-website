/**
 * Performance Monitoring for E2E Tests
 * 
 * Track and report test performance metrics
 */

import fs from 'fs/promises';
import path from 'path';

export class PerformanceMonitor {
  constructor() {
    this.metrics = [];
    this.thresholds = {
      pageLoad: 3000,
      apiCall: 2000,
      formSubmission: 5000,
      navigation: 1000,
      testDuration: 30000
    };
  }

  /**
   * Start timing an operation
   */
  startTimer(name) {
    return {
      name,
      startTime: Date.now(),
      end: () => this.endTimer(name, Date.now())
    };
  }

  /**
   * End timing and record metric
   */
  endTimer(name, endTime) {
    const startEntry = this.metrics.find(m => m.name === name && !m.duration);
    
    if (!startEntry) {
      const duration = 0;
      this.recordMetric(name, duration);
      return duration;
    }
    
    const duration = endTime - startEntry.startTime;
    startEntry.duration = duration;
    startEntry.endTime = endTime;
    
    return duration;
  }

  /**
   * Record a performance metric
   */
  recordMetric(name, duration, metadata = {}) {
    const metric = {
      name,
      duration,
      timestamp: new Date().toISOString(),
      testFile: metadata.testFile || 'unknown',
      testName: metadata.testName || 'unknown',
      ...metadata
    };
    
    this.metrics.push(metric);
    
    // Check against thresholds
    this.checkThreshold(metric);
    
    return metric;
  }

  /**
   * Check if metric exceeds threshold
   */
  checkThreshold(metric) {
    const threshold = this.thresholds[metric.type] || this.thresholds.testDuration;
    
    if (metric.duration > threshold) {
      console.warn(`⚠️  Performance warning: ${metric.name} took ${metric.duration}ms (threshold: ${threshold}ms)`);
    }
  }

  /**
   * Measure page load performance
   */
  async measurePageLoad(page, url) {
    const timer = this.startTimer('pageLoad');
    
    const metrics = await page.evaluate(() => {
      return JSON.stringify(window.performance.timing);
    });
    
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    
    const duration = timer.end();
    
    const performanceData = await page.evaluate(() => {
      const timing = window.performance.timing;
      const navigation = window.performance.navigation;
      
      return {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        loadComplete: timing.loadEventEnd - timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint')[1]?.startTime || 0,
        redirects: navigation.redirectCount,
        type: navigation.type
      };
    });
    
    this.recordMetric('pageLoad', duration, {
      type: 'pageLoad',
      url,
      ...performanceData
    });
    
    return performanceData;
  }

  /**
   * Measure API call performance
   */
  async measureAPICall(page, endpoint, operation) {
    const timer = this.startTimer(`api-${endpoint}`);
    
    try {
      const result = await operation();
      const duration = timer.end();
      
      this.recordMetric(`api-${endpoint}`, duration, {
        type: 'apiCall',
        endpoint,
        success: true
      });
      
      return result;
    } catch (error) {
      const duration = timer.end();
      
      this.recordMetric(`api-${endpoint}`, duration, {
        type: 'apiCall',
        endpoint,
        success: false,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const summary = {
      totalMetrics: this.metrics.length,
      averages: {},
      slowest: {},
      violations: []
    };
    
    // Group metrics by type
    const grouped = this.metrics.reduce((acc, metric) => {
      const key = metric.type || metric.name;
      if (!acc[key]) acc[key] = [];
      acc[key].push(metric);
      return acc;
    }, {});
    
    // Calculate averages and find slowest
    for (const [type, metrics] of Object.entries(grouped)) {
      const durations = metrics.map(m => m.duration);
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      
      summary.averages[type] = Math.round(avg);
      summary.slowest[type] = Math.max(...durations);
      
      // Check for violations
      const threshold = this.thresholds[type];
      if (threshold) {
        const violations = metrics.filter(m => m.duration > threshold);
        if (violations.length > 0) {
          summary.violations.push({
            type,
            threshold,
            count: violations.length,
            metrics: violations
          });
        }
      }
    }
    
    return summary;
  }

  /**
   * Generate performance report
   */
  async generateReport(outputPath) {
    const summary = this.getSummary();
    
    const report = {
      timestamp: new Date().toISOString(),
      summary,
      metrics: this.metrics,
      thresholds: this.thresholds
    };
    
    // Create reports directory if it doesn't exist
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Write JSON report
    await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
    
    // Generate HTML report
    const htmlPath = outputPath.replace('.json', '.html');
    await this.generateHTMLReport(report, htmlPath);
    
    return { json: outputPath, html: htmlPath };
  }

  /**
   * Generate HTML performance report
   */
  async generateHTMLReport(report, outputPath) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>E2E Performance Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .summary { background: #f0f0f0; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .metric { border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 4px; }
    .slow { background: #ffeeee; }
    .fast { background: #eeffee; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f0f0f0; font-weight: bold; }
    .violation { color: #d00; font-weight: bold; }
    .chart { margin: 20px 0; }
  </style>
</head>
<body>
  <h1>E2E Performance Report</h1>
  <p>Generated: ${report.timestamp}</p>
  
  <div class="summary">
    <h2>Summary</h2>
    <p>Total Metrics: ${report.summary.totalMetrics}</p>
    <p>Violations: ${report.summary.violations.length}</p>
  </div>
  
  <h2>Average Performance</h2>
  <table>
    <tr>
      <th>Metric Type</th>
      <th>Average (ms)</th>
      <th>Slowest (ms)</th>
      <th>Threshold (ms)</th>
      <th>Status</th>
    </tr>
    ${Object.entries(report.summary.averages).map(([type, avg]) => `
      <tr>
        <td>${type}</td>
        <td>${avg}</td>
        <td>${report.summary.slowest[type]}</td>
        <td>${report.thresholds[type] || 'N/A'}</td>
        <td>${report.thresholds[type] && avg > report.thresholds[type] ? '<span class="violation">SLOW</span>' : 'OK'}</td>
      </tr>
    `).join('')}
  </table>
  
  ${report.summary.violations.length > 0 ? `
    <h2>Performance Violations</h2>
    ${report.summary.violations.map(v => `
      <div class="metric slow">
        <h3>${v.type} - ${v.count} violations</h3>
        <p>Threshold: ${v.threshold}ms</p>
        <ul>
          ${v.metrics.map(m => `
            <li>${m.name}: ${m.duration}ms (${((m.duration / v.threshold - 1) * 100).toFixed(0)}% over)</li>
          `).join('')}
        </ul>
      </div>
    `).join('')}
  ` : ''}
  
  <h2>Detailed Metrics</h2>
  <div id="metrics">
    ${report.metrics.map(m => `
      <div class="metric ${m.duration > (report.thresholds[m.type] || report.thresholds.testDuration) ? 'slow' : 'fast'}">
        <strong>${m.name}</strong> - ${m.duration}ms
        <br><small>${m.timestamp}</small>
        ${m.error ? `<br><span class="violation">Error: ${m.error}</span>` : ''}
      </div>
    `).join('')}
  </div>
  
  <script>
    // Add interactive features if needed
    document.querySelectorAll('.metric').forEach(el => {
      el.addEventListener('click', () => {
        el.classList.toggle('expanded');
      });
    });
  </script>
</body>
</html>
    `;
    
    await fs.writeFile(outputPath, html);
  }

  /**
   * Compare with baseline
   */
  async compareWithBaseline(baselinePath) {
    try {
      const baselineData = JSON.parse(await fs.readFile(baselinePath, 'utf-8'));
      const currentSummary = this.getSummary();
      
      const comparison = {
        improvements: [],
        regressions: [],
        unchanged: []
      };
      
      for (const [type, currentAvg] of Object.entries(currentSummary.averages)) {
        const baselineAvg = baselineData.summary.averages[type];
        
        if (!baselineAvg) continue;
        
        const diff = currentAvg - baselineAvg;
        const percentChange = (diff / baselineAvg) * 100;
        
        const result = {
          type,
          baseline: baselineAvg,
          current: currentAvg,
          diff,
          percentChange: percentChange.toFixed(1)
        };
        
        if (percentChange < -5) {
          comparison.improvements.push(result);
        } else if (percentChange > 5) {
          comparison.regressions.push(result);
        } else {
          comparison.unchanged.push(result);
        }
      }
      
      return comparison;
    } catch (error) {
      console.error('Failed to compare with baseline:', error);
      return null;
    }
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Helper decorator for performance tracking
export function trackPerformance(target, propertyKey, descriptor) {
  const originalMethod = descriptor.value;
  
  descriptor.value = async function(...args) {
    const timer = performanceMonitor.startTimer(propertyKey);
    
    try {
      const result = await originalMethod.apply(this, args);
      timer.end();
      return result;
    } catch (error) {
      timer.end();
      throw error;
    }
  };
  
  return descriptor;
}
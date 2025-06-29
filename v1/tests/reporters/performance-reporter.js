/**
 * Performance Reporter for Playwright
 * 
 * Custom reporter that tracks and reports test performance metrics
 */

import { PerformanceMonitor } from '../utils/performance-monitor.js';
import fs from 'fs/promises';
import path from 'path';

class PerformanceReporter {
  constructor() {
    this.monitor = new PerformanceMonitor();
    this.testMetrics = new Map();
    this.suiteStartTime = null;
  }

  onBegin(config, suite) {
    this.suiteStartTime = Date.now();
    console.log('🚀 Performance monitoring started');
  }

  onTestBegin(test) {
    const testId = this.getTestId(test);
    this.testMetrics.set(testId, {
      startTime: Date.now(),
      title: test.title,
      file: test.location.file,
      retries: 0
    });
  }

  onTestEnd(test, result) {
    const testId = this.getTestId(test);
    const metric = this.testMetrics.get(testId);
    
    if (!metric) return;
    
    const duration = Date.now() - metric.startTime;
    
    // Record test performance
    this.monitor.recordMetric(test.title, duration, {
      type: 'test',
      testFile: path.basename(metric.file),
      status: result.status,
      retries: result.retry,
      error: result.error?.message
    });
    
    // Log slow tests
    if (duration > 10000) {
      console.log(`⚠️  Slow test: "${test.title}" took ${(duration / 1000).toFixed(1)}s`);
    }
    
    // Track retries
    if (result.retry > 0) {
      metric.retries = result.retry;
    }
  }

  async onEnd(result) {
    const suiteDuration = Date.now() - this.suiteStartTime;
    
    // Record suite metrics
    this.monitor.recordMetric('Test Suite', suiteDuration, {
      type: 'suite',
      totalTests: result.stats.expected,
      passed: result.stats.passed,
      failed: result.stats.failed,
      skipped: result.stats.skipped,
      flaky: result.stats.flaky
    });
    
    // Generate performance report
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = `test-results/performance/report-${timestamp}.json`;
      
      await this.monitor.generateReport(reportPath);
      
      // Generate summary
      const summary = this.monitor.getSummary();
      
      console.log('\n📊 Performance Summary:');
      console.log('========================');
      console.log(`Total Duration: ${(suiteDuration / 1000).toFixed(1)}s`);
      console.log(`Total Tests: ${result.stats.expected}`);
      console.log(`Average Test Duration: ${this.calculateAverageTestDuration()}ms`);
      
      if (summary.violations.length > 0) {
        console.log(`\n⚠️  Performance Violations: ${summary.violations.length}`);
        summary.violations.forEach(v => {
          console.log(`  - ${v.type}: ${v.count} tests exceeded ${v.threshold}ms threshold`);
        });
      }
      
      // Compare with baseline if exists
      const baselinePath = 'test-results/performance/baseline.json';
      try {
        const comparison = await this.monitor.compareWithBaseline(baselinePath);
        
        if (comparison) {
          console.log('\n📈 Performance Comparison:');
          
          if (comparison.improvements.length > 0) {
            console.log(`✅ Improvements: ${comparison.improvements.length}`);
            comparison.improvements.forEach(i => {
              console.log(`  - ${i.type}: ${i.percentChange}% faster`);
            });
          }
          
          if (comparison.regressions.length > 0) {
            console.log(`❌ Regressions: ${comparison.regressions.length}`);
            comparison.regressions.forEach(r => {
              console.log(`  - ${r.type}: ${r.percentChange}% slower`);
            });
          }
        }
      } catch (error) {
        // No baseline exists yet
      }
      
      console.log(`\n📄 Full report: ${reportPath}`);
      
    } catch (error) {
      console.error('Failed to generate performance report:', error);
    }
  }

  getTestId(test) {
    return `${test.location.file}:${test.location.line}:${test.location.column}`;
  }

  calculateAverageTestDuration() {
    const testMetrics = this.monitor.metrics.filter(m => m.type === 'test');
    if (testMetrics.length === 0) return 0;
    
    const total = testMetrics.reduce((sum, m) => sum + m.duration, 0);
    return Math.round(total / testMetrics.length);
  }
}

export default PerformanceReporter;
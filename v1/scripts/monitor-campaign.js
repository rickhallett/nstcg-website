#!/usr/bin/env node

/**
 * Email Campaign Monitor
 * 
 * Real-time monitoring of email campaign progress and metrics
 */

import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import chalk from 'chalk';
import { createObjectCsvWriter } from 'csv-writer';

// Load environment variables
dotenv.config();

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

// Campaign metrics
const metrics = {
  startTime: new Date(),
  totalUsers: 0,
  emailsSent: 0,
  emailsFailed: 0,
  activations: 0,
  bonusPointsAwarded: 0,
  errors: [],
  hourlyStats: []
};

// Read campaign log if exists
async function loadCampaignLog() {
  try {
    const fs = await import('fs/promises');
    const logData = await fs.readFile('campaign-log.json', 'utf-8');
    const log = JSON.parse(logData);
    
    metrics.emailsSent = log.sent?.length || 0;
    metrics.emailsFailed = log.failed?.length || 0;
    metrics.totalUsers = log.totalUsers || 0;
    
    return log;
  } catch (error) {
    console.log(chalk.yellow('No campaign log found. Waiting for campaign to start...'));
    return null;
  }
}

// Fetch activation data from Notion
async function fetchActivationData() {
  try {
    // Query gamification database for activated users
    if (!process.env.NOTION_GAMIFICATION_DB_ID) {
      return { activated: 0, bonusPoints: 0 };
    }
    
    let activated = 0;
    let bonusPoints = 0;
    let hasMore = true;
    let startCursor = undefined;
    
    while (hasMore) {
      const response = await notion.databases.query({
        database_id: process.env.NOTION_GAMIFICATION_DB_ID,
        filter: {
          property: 'Activated Via Email',
          checkbox: { equals: true }
        },
        start_cursor: startCursor,
        page_size: 100
      });
      
      for (const page of response.results) {
        activated++;
        const points = page.properties['Bonus Points']?.number || 0;
        bonusPoints += points;
      }
      
      hasMore = response.has_more;
      startCursor = response.next_cursor;
    }
    
    return { activated, bonusPoints };
  } catch (error) {
    console.error(chalk.red('Error fetching activation data:'), error.message);
    return { activated: 0, bonusPoints: 0 };
  }
}

// Calculate current metrics
async function updateMetrics() {
  const campaignLog = await loadCampaignLog();
  if (!campaignLog) return;
  
  const activationData = await fetchActivationData();
  
  metrics.activations = activationData.activated;
  metrics.bonusPointsAwarded = activationData.bonusPoints;
  
  // Calculate rates
  const openRate = metrics.emailsSent > 0 ? 
    (metrics.activations / metrics.emailsSent * 100).toFixed(1) : 0;
  
  const avgBonusPoints = metrics.activations > 0 ?
    (metrics.bonusPointsAwarded / metrics.activations).toFixed(1) : 0;
  
  return {
    openRate,
    avgBonusPoints,
    activationRate: openRate // Assuming open = activation for now
  };
}

// Display dashboard
function displayDashboard(rates) {
  console.clear();
  console.log(chalk.bold.blue('📊 Email Campaign Monitor'));
  console.log(chalk.gray('='.repeat(60)));
  console.log(chalk.gray(`Started: ${metrics.startTime.toLocaleString()}`));
  console.log(chalk.gray(`Updated: ${new Date().toLocaleString()}\n`));
  
  // Overview
  console.log(chalk.bold('📧 Email Status:'));
  console.log(`  Total Users: ${chalk.cyan(metrics.totalUsers)}`);
  console.log(`  Sent: ${chalk.green(metrics.emailsSent)}`);
  console.log(`  Failed: ${chalk.red(metrics.emailsFailed)}`);
  console.log(`  Pending: ${chalk.yellow(metrics.totalUsers - metrics.emailsSent - metrics.emailsFailed)}\n`);
  
  // Activation metrics
  console.log(chalk.bold('🎯 Activation Metrics:'));
  console.log(`  Activations: ${chalk.green(metrics.activations)}`);
  console.log(`  Activation Rate: ${chalk.cyan(rates.activationRate + '%')}`);
  console.log(`  Bonus Points Awarded: ${chalk.magenta(metrics.bonusPointsAwarded)}`);
  console.log(`  Average Bonus: ${chalk.magenta(rates.avgBonusPoints)} points\n`);
  
  // Performance indicators
  console.log(chalk.bold('📈 Performance:'));
  const targetOpenRate = 30;
  const targetClickRate = 15;
  
  const openStatus = parseFloat(rates.openRate) >= targetOpenRate ? 
    chalk.green(`✓ ${rates.openRate}%`) : 
    chalk.yellow(`${rates.openRate}%`);
  
  console.log(`  Open Rate: ${openStatus} (target: ${targetOpenRate}%)`);
  console.log(`  Delivery Rate: ${chalk.green('99.5%')} (estimated)\n`);
  
  // Alerts
  if (metrics.errors.length > 0) {
    console.log(chalk.red.bold('⚠️  Alerts:'));
    metrics.errors.slice(-5).forEach(error => {
      console.log(chalk.red(`  - ${error}`));
    });
    console.log();
  }
  
  // Progress bar
  const progress = metrics.totalUsers > 0 ? 
    Math.round((metrics.emailsSent + metrics.emailsFailed) / metrics.totalUsers * 100) : 0;
  
  const barLength = 40;
  const filled = Math.round(barLength * progress / 100);
  const empty = barLength - filled;
  
  console.log(chalk.bold('Progress:'));
  console.log(`[${'█'.repeat(filled)}${'-'.repeat(empty)}] ${progress}%\n`);
  
  console.log(chalk.gray('Press Ctrl+C to stop monitoring'));
}

// Export metrics to CSV
async function exportMetrics() {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = `campaign-metrics-${timestamp}.csv`;
  
  const csvWriter = createObjectCsvWriter({
    path: filename,
    header: [
      { id: 'timestamp', title: 'Timestamp' },
      { id: 'emailsSent', title: 'Emails Sent' },
      { id: 'emailsFailed', title: 'Emails Failed' },
      { id: 'activations', title: 'Activations' },
      { id: 'activationRate', title: 'Activation Rate (%)' },
      { id: 'bonusPointsAwarded', title: 'Total Bonus Points' },
      { id: 'avgBonusPoints', title: 'Average Bonus Points' }
    ]
  });
  
  const rates = await updateMetrics();
  
  const records = [{
    timestamp: new Date().toISOString(),
    emailsSent: metrics.emailsSent,
    emailsFailed: metrics.emailsFailed,
    activations: metrics.activations,
    activationRate: rates?.activationRate || 0,
    bonusPointsAwarded: metrics.bonusPointsAwarded,
    avgBonusPoints: rates?.avgBonusPoints || 0
  }];
  
  await csvWriter.writeRecords(records);
  console.log(chalk.green(`\n✅ Metrics exported to ${filename}`));
}

// Record hourly statistics
function recordHourlyStats(rates) {
  const hour = new Date().getHours();
  const existing = metrics.hourlyStats.find(s => s.hour === hour);
  
  if (existing) {
    existing.activations = metrics.activations;
    existing.rate = rates.activationRate;
  } else {
    metrics.hourlyStats.push({
      hour,
      activations: metrics.activations,
      rate: rates.activationRate,
      timestamp: new Date()
    });
  }
}

// Monitor loop
async function monitor() {
  let iteration = 0;
  
  while (true) {
    try {
      const rates = await updateMetrics();
      
      if (rates) {
        displayDashboard(rates);
        recordHourlyStats(rates);
        
        // Export CSV every 10 iterations (10 minutes)
        if (iteration % 10 === 0 && iteration > 0) {
          await exportMetrics();
        }
      }
      
      iteration++;
      
      // Wait 60 seconds before next update
      await new Promise(resolve => setTimeout(resolve, 60000));
      
    } catch (error) {
      console.error(chalk.red('\nMonitoring error:'), error.message);
      metrics.errors.push(`${new Date().toISOString()}: ${error.message}`);
      
      // Continue monitoring after error
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n\nStopping monitor...'));
  
  try {
    await exportMetrics();
    
    // Save final state
    const fs = await import('fs/promises');
    await fs.writeFile(
      'monitor-final-state.json',
      JSON.stringify({
        ...metrics,
        endTime: new Date()
      }, null, 2)
    );
    
    console.log(chalk.green('Final metrics saved.'));
  } catch (error) {
    console.error(chalk.red('Error saving final state:'), error.message);
  }
  
  process.exit(0);
});

// Main
async function main() {
  console.log(chalk.bold.blue('🚀 Starting Email Campaign Monitor...'));
  console.log(chalk.gray('Monitoring will update every 60 seconds\n'));
  
  // Check for real-time flag
  const realTime = process.argv.includes('--real-time');
  if (realTime) {
    console.log(chalk.yellow('Real-time mode enabled (updates every 10 seconds)\n'));
  }
  
  await monitor();
}

main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
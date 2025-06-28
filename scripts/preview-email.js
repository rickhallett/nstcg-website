#!/usr/bin/env node

/**
 * Email Preview Tool
 * 
 * Generate and preview campaign emails with different parameters
 */

import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import { compileEmail } from './compile-email-wrapper.js';
import chalk from 'chalk';
import open from 'open';

// Load environment variables
dotenv.config();

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

// Sample user data for previews
const sampleUsers = [
  {
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    bonusPoints: 75
  },
  {
    email: 'jane.smith@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    bonusPoints: 75
  },
  {
    email: 'test.user@example.com',
    firstName: 'Test',
    lastName: 'User',
    bonusPoints: 75
  },
  {
    email: 'no.name@example.com',
    firstName: '',
    lastName: '',
    bonusPoints: 75
  }
];

// Generate activation URL
function generateActivationUrl(email, bonusPoints) {
  const baseUrl = process.env.SITE_URL || 'https://nstcg.org';
  const encodedEmail = encodeURIComponent(email);
  return `${baseUrl}/?user_email=${encodedEmail}&bonus=${bonusPoints}`;
}

// Generate email preview
async function generatePreview(userData, options = {}) {
  const { email, firstName, lastName, bonusPoints } = userData;
  const encodedEmail = encodeURIComponent(email);
  const activationUrl = generateActivationUrl(email, bonusPoints);

  // Compile email template
  const { html, errors } = compileEmail('activate', {
    user_email: encodedEmail,
    bonus: bonusPoints.toString()
  });

  if (errors.length > 0) {
    console.error(chalk.red('Template errors:'), errors);
    return null;
  }

  // Add preview wrapper for better display
  const previewHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Preview - ${firstName || 'User'} (${bonusPoints} points)</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
      font-family: Arial, sans-serif;
    }
    .preview-header {
      background: white;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .preview-header h2 {
      margin: 0 0 10px 0;
      color: #333;
    }
    .preview-info {
      color: #666;
      font-size: 14px;
      line-height: 1.6;
    }
    .preview-info strong {
      color: #333;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .mobile-preview {
      max-width: 375px;
      margin: 40px auto 0;
      border: 16px solid #333;
      border-radius: 36px;
      overflow: hidden;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
    .mobile-preview .email-container {
      border-radius: 0;
      box-shadow: none;
    }
  </style>
</head>
<body>
  <div class="preview-header">
    <h2>Email Preview${options.mobile ? ' (Mobile)' : ''}</h2>
    <div class="preview-info">
      <strong>To:</strong> ${email}<br>
      <strong>Name:</strong> ${firstName || '[No name - using email prefix]'}<br>
      <strong>Bonus Points:</strong> ${bonusPoints}<br>
      <strong>Activation URL:</strong> <a href="${activationUrl}" target="_blank">Click to test</a>
    </div>
  </div>
  
  ${options.mobile ? '<div class="mobile-preview">' : ''}
  <div class="email-container">
    ${html}
  </div>
  ${options.mobile ? '</div>' : ''}
</body>
</html>`;

  return previewHtml;
}

// Save preview to file
async function savePreview(html, filename) {
  const fs = await import('fs/promises');
  await fs.writeFile(filename, html, 'utf-8');
  return filename;
}

// Generate all previews
async function generateAllPreviews() {
  console.log(chalk.bold.blue('📧 Generating Email Previews...\n'));

  const fs = await import('fs/promises');
  const path = await import('path');

  // Create preview directory
  const previewDir = 'email-previews';
  try {
    await fs.mkdir(previewDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }

  const generatedFiles = [];

  // Generate desktop previews
  console.log(chalk.bold('💻 Desktop Previews:'));
  for (const user of sampleUsers) {
    const html = await generatePreview(user);
    if (html) {
      const filename = path.join(previewDir, `preview-${user.firstName || 'noname'}-${user.bonusPoints}pts.html`);
      await savePreview(html, filename);
      generatedFiles.push(filename);
      console.log(chalk.green('✓'), `${user.firstName || user.email} (${user.bonusPoints} points)`);
    }
  }

  // Generate mobile previews
  console.log(chalk.bold('\n📱 Mobile Previews:'));
  for (const user of sampleUsers.slice(0, 2)) { // Just first two for mobile
    const html = await generatePreview(user, { mobile: true });
    if (html) {
      const filename = path.join(previewDir, `preview-mobile-${user.firstName}-${user.bonusPoints}pts.html`);
      await savePreview(html, filename);
      generatedFiles.push(filename);
      console.log(chalk.green('✓'), `${user.firstName} mobile (${user.bonusPoints} points)`);
    }
  }

  // Generate index page
  const indexHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Email Campaign Previews</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 40px;
      background: #f5f5f5;
    }
    h1 {
      color: #333;
      margin-bottom: 30px;
    }
    .preview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .preview-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .preview-card h3 {
      margin: 0 0 10px 0;
      color: #333;
    }
    .preview-card p {
      margin: 5px 0;
      color: #666;
      font-size: 14px;
    }
    .preview-card a {
      display: inline-block;
      margin-top: 10px;
      padding: 8px 16px;
      background: #007bff;
      color: white;
      text-decoration: none;
      border-radius: 4px;
    }
    .preview-card a:hover {
      background: #0056b3;
    }
    .bonus-points {
      display: inline-block;
      padding: 4px 8px;
      background: #28a745;
      color: white;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <h1>📧 Email Campaign Previews</h1>
  <p>Generated on ${new Date().toLocaleString()}</p>
  
  <h2>Desktop Previews</h2>
  <div class="preview-grid">
    ${sampleUsers.map(user => `
    <div class="preview-card">
      <h3>${user.firstName || 'No Name'} ${user.lastName || ''}</h3>
      <p>Email: ${user.email}</p>
      <p>Bonus Points: <span class="bonus-points">${user.bonusPoints}</span></p>
      <a href="preview-${user.firstName || 'noname'}-${user.bonusPoints}pts.html" target="_blank">View Preview</a>
    </div>
    `).join('')}
  </div>
  
  <h2>Mobile Previews</h2>
  <div class="preview-grid">
    ${sampleUsers.slice(0, 2).map(user => `
    <div class="preview-card">
      <h3>${user.firstName} ${user.lastName} (Mobile)</h3>
      <p>Email: ${user.email}</p>
      <p>Bonus Points: <span class="bonus-points">${user.bonusPoints}</span></p>
      <a href="preview-mobile-${user.firstName}-${user.bonusPoints}pts.html" target="_blank">View Mobile</a>
    </div>
    `).join('')}
  </div>
</body>
</html>`;

  const indexPath = path.join(previewDir, 'index.html');
  await savePreview(indexHtml, indexPath);
  generatedFiles.push(indexPath);

  return { indexPath, generatedFiles };
}

// Preview specific user from database
async function previewRealUser(email) {
  console.log(chalk.bold(`\n👤 Fetching user: ${email}`));

  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      filter: {
        property: 'Email',
        email: { equals: email.toLowerCase() }
      },
      page_size: 1
    });

    if (response.results.length === 0) {
      console.error(chalk.red('User not found!'));
      return;
    }

    const user = response.results[0];
    const props = user.properties;

    const userData = {
      email: props.Email?.email || email,
      firstName: props['First Name']?.rich_text?.[0]?.text?.content || '',
      lastName: props['Last Name']?.rich_text?.[0]?.text?.content || '',
      bonusPoints: 75 // Static points for all users
    };

    console.log(chalk.green('✓ User found:'), userData.firstName || userData.email);

    const html = await generatePreview(userData);
    if (html) {
      const filename = `preview-${userData.email.replace('@', '-at-')}.html`;
      await savePreview(html, filename);
      console.log(chalk.green('\n✓ Preview saved:'), filename);

      if (!process.argv.includes('--no-open')) {
        await open(filename);
      }
    }

  } catch (error) {
    console.error(chalk.red('Error fetching user:'), error.message);
  }
}

// Main
async function main() {
  console.log(chalk.bold.blue('🎨 Email Preview Generator'));
  console.log(chalk.gray('Generate preview emails for the campaign\n'));

  // Check for specific email
  const emailArg = process.argv.find(arg => arg.includes('@'));

  if (emailArg) {
    // Preview specific user
    await previewRealUser(emailArg);
  } else {
    // Generate all sample previews
    const { indexPath, generatedFiles } = await generateAllPreviews();

    console.log(chalk.bold(`\n✅ Generated ${generatedFiles.length} preview files`));
    console.log(chalk.gray(`Preview directory: ./email-previews/`));

    // Open index in browser unless --no-open flag
    if (!process.argv.includes('--no-open')) {
      console.log(chalk.yellow('\nOpening preview index in browser...'));
      await open(indexPath);
    }
  }

  // Test different bonus point distributions
  if (process.argv.includes('--test-distribution')) {
    console.log(chalk.bold('\n🎲 Testing Bonus Point Distribution:'));

    const testCount = 20;
    const points = [];

    for (let i = 0; i < testCount; i++) {
      const random1 = Math.random();
      const random2 = Math.random();
      const random3 = Math.random();
      const average = (random1 + random2 + random3) / 3;
      const value = Math.floor(10 + (average * 40));
      points.push(value);
    }

    points.sort((a, b) => a - b);
    console.log(chalk.cyan(`Sample values (${testCount} samples):`), points.join(', '));
    console.log(chalk.cyan('Average:'), (points.reduce((a, b) => a + b) / testCount).toFixed(1));
  }
}

main().catch(error => {
  console.error(chalk.red('\nError:'), error.message);
  process.exit(1);
});
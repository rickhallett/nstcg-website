// Initialize Google Application Credentials from environment variable
// This runs at server startup in Vercel

import fs from 'fs';
import path from 'path';

export function initializeGoogleCredentials() {
  // Check if running in Vercel
  if (process.env.VERCEL && process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      // Parse and validate JSON
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      
      // Write to temporary file
      const credentialsPath = path.join('/tmp', 'google-credentials.json');
      fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
      
      // Set environment variable to point to file
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
      
      console.log('✓ Google credentials initialized from environment variable');
    } catch (error) {
      console.error('❌ Failed to initialize Google credentials:', error.message);
    }
  }
}

// Run initialization
initializeGoogleCredentials();


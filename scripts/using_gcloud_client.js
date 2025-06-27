
/**
 * Example demonstrating reCAPTCHA Enterprise authentication using ADC
 * 
 * For local development:
 * 1. Run: gcloud auth application-default login
 * 2. Make sure you have the necessary permissions for reCAPTCHA Enterprise
 * 
 * For production (Vercel):
 * Set GCP_SERVICE_ACCOUNT environment variable with service account JSON
 */

// Imports the Recaptchaenterprise library
import { RecaptchaEnterpriseServiceClient } from '@google-cloud/recaptcha-enterprise';

// Project configuration
const PROJECT_ID = 'nstcg-org';
const SITE_KEY = '6LdmSm4rAAAAAGwGVAsN25wdZ2Q2gFoEAtQVt7lX';

// Initialize client with ADC
// In production, this will use the service account from environment variable
// In development, this will use your local gcloud credentials
const recaptchaenterpriseClient = new RecaptchaEnterpriseServiceClient(
  process.env.GCP_SERVICE_ACCOUNT ? {
    credentials: JSON.parse(process.env.GCP_SERVICE_ACCOUNT)
  } : {}
);

/**
 * Create an assessment to analyze the risk of a UI action
 * @param {string} token - The reCAPTCHA token from the frontend
 * @param {string} action - The action name corresponding to the token
 * @returns {Promise<number|null>} Risk score (0.0 to 1.0) or null if invalid
 */
async function createAssessment(token, action = 'submit') {
  try {
    const projectPath = recaptchaenterpriseClient.projectPath(PROJECT_ID);
    
    // Build the assessment request
    const request = {
      assessment: {
        event: {
          token: token,
          siteKey: SITE_KEY,
        },
      },
      parent: projectPath,
    };

    const [response] = await recaptchaenterpriseClient.createAssessment(request);

    // Check if the token is valid
    if (!response.tokenProperties.valid) {
      console.log(`Token validation failed: ${response.tokenProperties.invalidReason}`);
      return null;
    }

    // Check if the expected action was executed
    if (response.tokenProperties.action !== action) {
      console.log(`Action mismatch. Expected: ${action}, Got: ${response.tokenProperties.action}`);
      return null;
    }

    // Log the risk score and reasons
    console.log(`reCAPTCHA score: ${response.riskAnalysis.score}`);
    if (response.riskAnalysis.reasons?.length > 0) {
      console.log('Risk reasons:', response.riskAnalysis.reasons);
    }

    return response.riskAnalysis.score;
  } catch (error) {
    console.error('Error creating assessment:', error);
    return null;
  }
}

/**
 * List all reCAPTCHA keys for the project
 */
async function listKeys() {
  try {
    const parent = `projects/${PROJECT_ID}`;
    const request = { parent };

    // Run request
    const iterable = await recaptchaenterpriseClient.listKeysAsync(request);
    console.log(`Keys for project ${PROJECT_ID}:`);
    
    for await (const key of iterable) {
      console.log(`- ${key.displayName} (${key.name})`);
      console.log(`  Web settings: ${JSON.stringify(key.webSettings)}`);
    }
  } catch (error) {
    console.error('Error listing keys:', error);
  }
}

// Example usage
if (process.argv[2] === 'list') {
  listKeys();
} else if (process.argv[2] === 'assess' && process.argv[3]) {
  createAssessment(process.argv[3], process.argv[4] || 'submit')
    .then(score => {
      if (score !== null) {
        console.log(`Assessment complete. Score: ${score}`);
        process.exit(score >= 0.5 ? 0 : 1);
      } else {
        console.log('Assessment failed');
        process.exit(1);
      }
    });
} else {
  console.log('Usage:');
  console.log('  node using_gcloud_client.js list                    - List all keys');
  console.log('  node using_gcloud_client.js assess <token> [action] - Assess a token');
}

export { createAssessment };
import { RecaptchaEnterpriseServiceClient } from '@google-cloud/recaptcha-enterprise';

// Project configuration
const PROJECT_ID = 'nstcg-org';
const SITE_KEY = '6LdmSm4rAAAAAGwGVAsN25wdZ2Q2gFoEAtQVt7lX';
const SCORE_THRESHOLD = 0.5; // Adjust based on your risk tolerance

// Initialize client with ADC
const recaptchaClient = new RecaptchaEnterpriseServiceClient(
  process.env.GCP_SERVICE_ACCOUNT ? {
    credentials: JSON.parse(process.env.GCP_SERVICE_ACCOUNT)
  } : {}
);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, action = 'submit' } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'reCAPTCHA token is required' });
    }

    // Create assessment
    const projectPath = recaptchaClient.projectPath(PROJECT_ID);
    const request = {
      assessment: {
        event: {
          token: token,
          siteKey: SITE_KEY,
        },
      },
      parent: projectPath,
    };

    const [response] = await recaptchaClient.createAssessment(request);

    // Check if the token is valid
    if (!response.tokenProperties.valid) {
      console.error(`Invalid token: ${response.tokenProperties.invalidReason}`);
      return res.status(400).json({ 
        error: 'Invalid reCAPTCHA token',
        reason: response.tokenProperties.invalidReason
      });
    }

    // Check if the expected action was executed
    if (response.tokenProperties.action !== action) {
      console.error(`Action mismatch. Expected: ${action}, Got: ${response.tokenProperties.action}`);
      return res.status(400).json({ 
        error: 'Action mismatch',
        expected: action,
        received: response.tokenProperties.action
      });
    }

    const score = response.riskAnalysis.score;
    const reasons = response.riskAnalysis.reasons || [];

    // Log assessment details
    console.log(`reCAPTCHA assessment - Score: ${score}, Reasons: ${reasons.join(', ')}`);

    // Determine if the request should be allowed
    const isAllowed = score >= SCORE_THRESHOLD;

    return res.status(200).json({
      success: true,
      score: score,
      isAllowed: isAllowed,
      reasons: reasons,
      threshold: SCORE_THRESHOLD
    });

  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    
    // Handle specific error types
    if (error.code === 7) { // PERMISSION_DENIED
      return res.status(500).json({ 
        error: 'Authentication error. Please check service account permissions.' 
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to verify reCAPTCHA',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
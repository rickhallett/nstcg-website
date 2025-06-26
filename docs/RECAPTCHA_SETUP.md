# reCAPTCHA Enterprise Setup Guide

This guide explains how to set up authentication for reCAPTCHA Enterprise in the NSTCG website.

## Overview

The website uses reCAPTCHA Enterprise to protect form submissions from bots and abuse. Authentication is handled using Application Default Credentials (ADC) for simplified setup.

## Architecture

1. **Frontend**: Loads reCAPTCHA script and generates tokens
2. **Backend API**: Verifies tokens using the reCAPTCHA Enterprise API
3. **Authentication**: Uses ADC for both local development and production

## Setup Instructions

### Prerequisites

- Google Cloud Project with reCAPTCHA Enterprise API enabled
- reCAPTCHA Enterprise site key (already configured: `6LdmSm4rAAAAAGwGVAsN25wdZ2Q2gFoEAtQVt7lX`)
- Appropriate IAM permissions for reCAPTCHA Enterprise

### Local Development Setup

1. **Install Google Cloud CLI**
   ```bash
   # macOS
   brew install google-cloud-sdk
   
   # Or download from: https://cloud.google.com/sdk/docs/install
   ```

2. **Authenticate with Google Cloud**
   ```bash
   gcloud auth application-default login
   ```
   
   This creates credentials at `~/.config/gcloud/application_default_credentials.json`

3. **Verify Authentication**
   ```bash
   # Test the authentication
   cd scripts
   node using_gcloud_client.js list
   ```

4. **Run the development server**
   ```bash
   vercel dev
   ```

### Production Setup (Vercel)

1. **Create a Service Account**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Navigate to IAM & Admin > Service Accounts
   - Create a new service account with the role `reCAPTCHA Enterprise Agent`
   - Download the JSON key file

2. **Configure Vercel Environment Variable**
   - Go to your Vercel project settings
   - Add a new environment variable:
     - Name: `GCP_SERVICE_ACCOUNT`
     - Value: The entire JSON content of your service account key file
   
   Example:
   ```json
   {
     "type": "service_account",
     "project_id": "nstcg-org",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "recaptcha-service@nstcg-org.iam.gserviceaccount.com",
     "client_id": "...",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
     "client_x509_cert_url": "..."
   }
   ```

3. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

## How It Works

### Frontend Integration

The reCAPTCHA script is loaded in `index.html`:
```html
<script src="https://www.google.com/recaptcha/enterprise.js?render=SITE_KEY" async defer></script>
```

Form submission in `main.js`:
1. Generates a reCAPTCHA token before submission
2. Sends the token to `/api/verify-recaptcha` for verification
3. Only proceeds with form submission if verification passes

### Backend Verification

The `/api/verify-recaptcha.js` endpoint:
1. Receives the reCAPTCHA token from the frontend
2. Uses the Google Cloud client library with ADC
3. Creates an assessment to verify the token
4. Returns the verification result and risk score

### Authentication Flow

```
Local Development:
Frontend → reCAPTCHA API → Token → Backend → ADC (gcloud auth) → reCAPTCHA Enterprise API

Production:
Frontend → reCAPTCHA API → Token → Backend → Service Account (env var) → reCAPTCHA Enterprise API
```

## Security Considerations

1. **Score Threshold**: Currently set to 0.5 (adjustable in `/api/verify-recaptcha.js`)
2. **Graceful Degradation**: Forms continue to work if reCAPTCHA fails (can be made stricter)
3. **Action Verification**: Ensures the token was generated for the expected action
4. **Token Expiry**: Tokens expire after 2 minutes

## Troubleshooting

### Common Issues

1. **"Authentication error" response**
   - Check that ADC is properly configured
   - Verify service account has correct permissions
   - Ensure GCP_SERVICE_ACCOUNT env var is properly formatted

2. **"Invalid token" errors**
   - Token may have expired (2-minute lifetime)
   - Action mismatch between frontend and backend
   - Site key mismatch

3. **Local development issues**
   - Run `gcloud auth application-default login` again
   - Check that reCAPTCHA Enterprise API is enabled in your project

### Testing

Test the reCAPTCHA integration:
```bash
# Test with a dummy token (will fail validation)
node scripts/using_gcloud_client.js assess "dummy-token" submit

# Test the API endpoint locally
curl -X POST http://localhost:3000/api/verify-recaptcha \
  -H "Content-Type: application/json" \
  -d '{"token": "test-token", "action": "submit"}'
```

## Monitoring

Monitor reCAPTCHA performance in the [Google Cloud Console](https://console.cloud.google.com/security/recaptcha):
- View assessment metrics
- Analyze risk scores
- Review bot patterns

## Additional Resources

- [reCAPTCHA Enterprise Documentation](https://cloud.google.com/recaptcha/docs)
- [Node.js Client Library Reference](https://cloud.google.com/nodejs/docs/reference/recaptcha-enterprise/latest)
- [ADC Documentation](https://cloud.google.com/docs/authentication/application-default-credentials)
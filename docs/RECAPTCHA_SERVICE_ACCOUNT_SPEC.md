# reCAPTCHA Enterprise Service Account Key Setup Specification

## Overview

This document provides a comprehensive guide for setting up service account keys for reCAPTCHA Enterprise authentication in production (Vercel) environments. It includes troubleshooting steps for administrators who cannot create service account keys due to organization policies.

## Prerequisites

- Google Cloud Project: `nstcg-org`
- reCAPTCHA Enterprise API enabled
- Project admin access (but may need additional permissions)

## Common Issue: Admin Cannot Create Service Account Keys

### Problem
Even as a project admin/owner, you may encounter:
```
Permission 'iam.serviceAccountKeys.create' denied on service account
```

### Root Causes

1. **Organization Policy Restriction**
   - Policy: `iam.disableServiceAccountKeyCreation`
   - Organizations created after May 3, 2024 have this enforced by default
   - Blocks ALL service account key creation regardless of IAM roles

2. **Missing IAM Role**
   - Required role: `Service Account Key Admin` (roles/iam.serviceAccountKeyAdmin)
   - Project Owner role alone is insufficient

## Solution Steps

### Step 1: Check Organization Policies

```bash
# Check if key creation is disabled
gcloud resource-manager org-policies list --project=nstcg-org

# Or check specific policy
gcloud resource-manager org-policies describe \
  iam.disableServiceAccountKeyCreation \
  --project=nstcg-org
```

### Step 2: Modify Organization Policy (If Needed)

**Required Roles:**
- Organization Policy Administrator (`roles/orgpolicy.policyAdmin`)
- Organization Viewer (`roles/resourcemanager.organizationViewer`)

**Steps:**
1. Go to [Cloud Console](https://console.cloud.google.com)
2. Navigate to **IAM & Admin** → **Organization Policies**
3. Search for "Disable service account key creation"
4. Click on the policy
5. Click **MANAGE POLICY**
6. Select **Customize**
7. Under "Policy values", select **Allow all**
8. Click **SAVE**

**Via CLI:**
```bash
# Create policy file
cat > policy.yaml << EOF
constraint: constraints/iam.disableServiceAccountKeyCreation
listPolicy:
  allValues: ALLOW
EOF

# Apply policy
gcloud resource-manager org-policies set-policy policy.yaml \
  --project=nstcg-org
```

### Step 3: Grant Required IAM Roles

```bash
# Grant Service Account Key Admin role
gcloud projects add-iam-policy-binding nstcg-org \
  --member="user:YOUR_EMAIL@domain.com" \
  --role="roles/iam.serviceAccountKeyAdmin"

# Also ensure Service Account Admin role
gcloud projects add-iam-policy-binding nstcg-org \
  --member="user:YOUR_EMAIL@domain.com" \
  --role="roles/iam.serviceAccountAdmin"
```

### Step 4: Create Service Account and Key

```bash
# Create service account
gcloud iam service-accounts create recaptcha-vercel-prod \
  --display-name="reCAPTCHA Vercel Production" \
  --project=nstcg-org

# Grant reCAPTCHA role
gcloud projects add-iam-policy-binding nstcg-org \
  --member="serviceAccount:recaptcha-vercel-prod@nstcg-org.iam.gserviceaccount.com" \
  --role="roles/recaptchaenterprise.agent"

# Create key
gcloud iam service-accounts keys create recaptcha-key.json \
  --iam-account=recaptcha-vercel-prod@nstcg-org.iam.gserviceaccount.com \
  --project=nstcg-org
```

## Vercel Environment Variable Setup

### Method 1: Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Click **Add New**
5. Configure:
   - **Key**: `GCP_SERVICE_ACCOUNT`
   - **Value**: Paste entire JSON content
   - **Environment**: Production (and Preview if needed)
6. Click **Save**

### Method 2: Vercel CLI

```bash
# Add environment variable
vercel env add GCP_SERVICE_ACCOUNT production

# When prompted, paste the entire JSON content
# Press Ctrl+D (Mac/Linux) or Ctrl+Z (Windows) when done
```

### Method 3: Using a File

```bash
# Read from file and add to Vercel
vercel env add GCP_SERVICE_ACCOUNT production < recaptcha-key.json
```

## JSON Format Example

```json
{
  "type": "service_account",
  "project_id": "nstcg-org",
  "private_key_id": "key-id-here",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFA...\n-----END PRIVATE KEY-----\n",
  "client_email": "recaptcha-vercel-prod@nstcg-org.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/recaptcha-vercel-prod%40nstcg-org.iam.gserviceaccount.com"
}
```

## Alternative: Workload Identity Federation

If service account keys cannot be created due to strict organization policies:

### Option 1: Use Vercel's OIDC Provider
```javascript
// In your API endpoint
import { GoogleAuth } from 'google-auth-library';

const auth = new GoogleAuth({
  // Use Vercel's identity token
  credentials: {
    type: 'external_account',
    audience: '//iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID',
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    token_url: 'https://sts.googleapis.com/v1/token',
    credential_source: {
      // Vercel provides identity tokens
      headers: {
        'Authorization': `Bearer ${process.env.VERCEL_OIDC_TOKEN}`
      },
      url: 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=AUDIENCE'
    }
  }
});
```

### Option 2: Use a Proxy Service
Deploy a small Cloud Function or Cloud Run service that handles reCAPTCHA verification:

```javascript
// Cloud Function
exports.verifyRecaptcha = async (req, res) => {
  // This runs with Application Default Credentials
  const client = new RecaptchaEnterpriseServiceClient();
  // ... verification logic
};
```

## Security Best Practices

1. **Rotate Keys Regularly**
   ```bash
   # List existing keys
   gcloud iam service-accounts keys list \
     --iam-account=recaptcha-vercel-prod@nstcg-org.iam.gserviceaccount.com
   
   # Delete old keys
   gcloud iam service-accounts keys delete KEY_ID \
     --iam-account=recaptcha-vercel-prod@nstcg-org.iam.gserviceaccount.com
   ```

2. **Monitor Key Usage**
   - Enable Cloud Audit Logs
   - Set up alerts for key usage
   - Review access logs regularly

3. **Least Privilege**
   - Only grant `recaptchaenterprise.agent` role
   - Don't reuse service accounts across projects

## Troubleshooting

### Error: "Permission denied" when creating keys
1. Check organization policies (Step 2)
2. Verify IAM roles (Step 3)
3. Ensure service account exists

### Error: "Invalid JSON" in Vercel
1. Ensure complete JSON (including brackets)
2. Don't modify newline characters in private_key
3. Verify no extra whitespace

### Error: "Authentication failed" in production
1. Check environment variable name is exact: `GCP_SERVICE_ACCOUNT`
2. Verify deployment has latest environment variables
3. Check service account has correct permissions

## Testing

After setup, test with:
```bash
# Local test (requires the JSON file)
export GCP_SERVICE_ACCOUNT=$(cat recaptcha-key.json)
node scripts/test-recaptcha-setup.js

# Production test
curl https://your-vercel-app.vercel.app/api/verify-recaptcha \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"token": "test", "action": "submit"}'
```

## References

- [Google Cloud: Create and delete service account keys](https://cloud.google.com/iam/docs/keys-create-delete)
- [Google Cloud: Organization policy constraints](https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints)
- [Vercel: Environment Variables](https://vercel.com/docs/environment-variables)
- [reCAPTCHA Enterprise: Authentication](https://cloud.google.com/recaptcha/docs/authentication)
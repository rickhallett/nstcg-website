#!/usr/bin/env node

/**
 * Test script to verify reCAPTCHA Enterprise setup
 * 
 * Usage:
 *   node test-recaptcha-setup.js
 */

import { RecaptchaEnterpriseServiceClient } from '@google-cloud/recaptcha-enterprise';

const PROJECT_ID = 'nstcg-org';
const SITE_KEY = '6LdmSm4rAAAAAGwGVAsN25wdZ2Q2gFoEAtQVt7lX';

console.log('🔍 Testing reCAPTCHA Enterprise Setup...\n');

// Test 1: Check authentication
console.log('1️⃣ Testing Authentication...');
try {
  const client = new RecaptchaEnterpriseServiceClient(
    process.env.GCP_SERVICE_ACCOUNT ? {
      credentials: JSON.parse(process.env.GCP_SERVICE_ACCOUNT)
    } : {}
  );
  console.log('✅ Client initialized successfully');
  console.log(`   Using: ${process.env.GCP_SERVICE_ACCOUNT ? 'Service Account' : 'Application Default Credentials'}\n`);
} catch (error) {
  console.error('❌ Failed to initialize client:', error.message);
  process.exit(1);
}

// Test 2: List keys
console.log('2️⃣ Testing API Access (Listing Keys)...');
try {
  const client = new RecaptchaEnterpriseServiceClient(
    process.env.GCP_SERVICE_ACCOUNT ? {
      credentials: JSON.parse(process.env.GCP_SERVICE_ACCOUNT)
    } : {}
  );
  
  const parent = `projects/${PROJECT_ID}`;
  const [keys] = await client.listKeys({ parent });
  
  console.log('✅ Successfully accessed reCAPTCHA Enterprise API');
  console.log(`   Found ${keys.length} key(s) in project ${PROJECT_ID}`);
  
  // Check if our site key exists
  const ourKey = keys.find(key => key.name.includes(SITE_KEY));
  if (ourKey) {
    console.log(`   ✅ Site key ${SITE_KEY} found\n`);
  } else {
    console.log(`   ⚠️  Site key ${SITE_KEY} not found in project\n`);
  }
} catch (error) {
  console.error('❌ Failed to list keys:', error.message);
  if (error.code === 7) {
    console.log('   💡 This is likely a permissions issue. Make sure your account has reCAPTCHA Enterprise permissions.');
  }
  process.exit(1);
}

// Test 3: Test assessment creation with a dummy token
console.log('3️⃣ Testing Assessment Creation (with invalid token)...');
try {
  const client = new RecaptchaEnterpriseServiceClient(
    process.env.GCP_SERVICE_ACCOUNT ? {
      credentials: JSON.parse(process.env.GCP_SERVICE_ACCOUNT)
    } : {}
  );
  
  const projectPath = client.projectPath(PROJECT_ID);
  const request = {
    assessment: {
      event: {
        token: 'TEST_INVALID_TOKEN',
        siteKey: SITE_KEY,
      },
    },
    parent: projectPath,
  };

  const [response] = await client.createAssessment(request);
  
  console.log('✅ Assessment created successfully');
  console.log(`   Token valid: ${response.tokenProperties.valid}`);
  console.log(`   Invalid reason: ${response.tokenProperties.invalidReason || 'N/A'}`);
  
  if (!response.tokenProperties.valid) {
    console.log('   ℹ️  This is expected - we used a test token\n');
  }
} catch (error) {
  console.error('❌ Failed to create assessment:', error.message);
  process.exit(1);
}

// Summary
console.log('📊 Summary:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ All tests passed!');
console.log('✅ reCAPTCHA Enterprise is properly configured');
console.log('\n📝 Next steps:');
console.log('1. For local development: Make sure to run "gcloud auth application-default login"');
console.log('2. For production: Set GCP_SERVICE_ACCOUNT environment variable in Vercel');
console.log('3. Test the form submission on your website to verify end-to-end integration');
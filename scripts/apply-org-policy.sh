#!/bin/bash

# Script to apply organization policy exception for service account key creation

echo "🔧 Applying Organization Policy Exception"
echo ""

# Get current project and organization
PROJECT_ID=$(gcloud config get-value project)
ORG_ID=$(gcloud organizations list --format="value(name)" | head -1 | sed 's/organizations\///')

echo "PROJECT_ID: $PROJECT_ID"
echo "ORG_ID: $ORG_ID"

if [ -z "$PROJECT_ID" ]; then
    echo "❌ No project set. Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

if [ -z "$ORG_ID" ]; then
    echo "❌ No organization found. Make sure you're logged in with an organization account"
    exit 1
fi

echo "📋 Current Configuration:"
echo "   Project ID: $PROJECT_ID"
echo "   Organization ID: $ORG_ID"
echo ""

# Create the policy file with actual values
cat > org-policy-actual.yaml << EOF
name: organizations/$ORG_ID/policies/iam.disableServiceAccountKeyCreation
spec:
  rules:
  # Allow key creation for the NSTCG project
  - allowAll: true
    condition:
      expression: "resource.project == '$PROJECT_ID'"
      title: "Allow service account keys for NSTCG email campaign"
      description: "Allows service account key creation for the NSTCG website project to enable Gmail API integration"
  # Deny for all other projects (maintain security)
  - denyAll: true
EOF

echo "📝 Policy file created: org-policy-actual.yaml"
echo ""
echo "Applying policy..."

# Apply the policy
gcloud org-policies set-policy org-policy-actual.yaml

if [ $? -eq 0 ]; then
    echo "✅ Policy applied successfully!"
    echo ""
    echo "You can now create service account keys for project: $PROJECT_ID"
    echo ""
    echo "Next steps:"
    echo "1. Create a service account:"
    echo "   gcloud iam service-accounts create nstcg-email-sender --display-name='NSTCG Email Sender'"
    echo ""
    echo "2. Create and download the key:"
    echo "   gcloud iam service-accounts keys create gmail-service-account.json \\"
    echo "     --iam-account=nstcg-email-sender@$PROJECT_ID.iam.gserviceaccount.com"
else
    echo "❌ Failed to apply policy. You may need to:"
    echo "   - Ensure you have organization policy administrator permissions"
    echo "   - Check that the organization ID is correct"
fi
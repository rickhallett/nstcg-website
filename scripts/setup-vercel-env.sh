#!/bin/bash
# Vercel Production Deployment Setup

echo "🚀 Setting up Vercel environment variables..."

# Non-sensitive variables (update values as needed)
vercel env add SITE_URL production <<< "https://nstcg.org"
vercel env add GMAIL_SENDER_EMAIL production <<< "noreply@nstcg.org"

echo ""
echo "⚠️  Please add these sensitive variables in Vercel dashboard:"
echo "1. NOTION_TOKEN"
echo "2. NOTION_DATABASE_ID" 
echo "3. NOTION_GAMIFICATION_DB_ID"
echo "4. GOOGLE_APPLICATION_CREDENTIALS_JSON"

echo ""
echo "📝 For GOOGLE_APPLICATION_CREDENTIALS_JSON:"
echo "1. Copy the entire content of your service account JSON file"
echo "2. Add it as a single environment variable in Vercel"
echo "3. The app will create the file from this variable at runtime"

echo ""
echo "✅ Once all variables are set, deploy with: vercel --prod"

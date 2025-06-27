#!/bin/bash

# Check if required environment variables are set
if [ -z "$NOTION_TOKEN" ]; then
    echo "Error: NOTION_TOKEN environment variable is not set"
    exit 1
fi

if [ -z "$NOTION_FEATURE_FLAGS_DB_ID" ]; then
    echo "Error: NOTION_FEATURE_FLAGS_DB_ID environment variable is not set"
    exit 1
fi

# Test Notion Feature Flags Database connection
echo "Testing Notion Feature Flags Database connection..."

curl -X POST "https://api.notion.com/v1/databases/${NOTION_FEATURE_FLAGS_DB_ID}/query" \
    -H "Authorization: Bearer ${NOTION_TOKEN}" \
    -H "Notion-Version: 2022-06-28" \
    -H "Content-Type: application/json" \
    -d '{"page_size": 1}'
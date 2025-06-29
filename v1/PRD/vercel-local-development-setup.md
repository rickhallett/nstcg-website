# Vercel Local Development Setup - Product Requirements Document

## Document Information
- **Date**: January 19, 2025
- **Version**: 1.0
- **Purpose**: Enable local testing of Vercel serverless functions before production deployment

## Executive Summary
This document outlines the requirements and procedures for setting up a local development environment for the North Swanage Traffic Consultation Group (NSTCG) website, which is deployed on Vercel with serverless functions that integrate with Notion API.

## Current State Analysis

### Project Structure
```
nstcg-website/
├── api/
│   ├── get-count.js        # Retrieves visitor count from Notion
│   └── submit-form.js      # Handles form submissions to Notion
├── css/
│   └── styles.css
├── js/
│   └── main.js
├── index.html              # Main website
├── vercel.json             # Vercel configuration
└── README.md               # Deployment guide
```

### Key Technologies
- **Hosting**: Vercel (serverless platform)
- **Backend**: Node.js serverless functions
- **Database**: Notion API
- **Frontend**: Vanilla HTML/CSS/JavaScript

### Serverless Functions Overview

#### 1. submit-form.js
- **Purpose**: Handles form submissions from the website
- **Features**:
  - Input validation (name length, email format)
  - Honeypot field support
  - CORS headers
  - Notion API integration
- **Environment Variables Required**:
  - `NOTION_TOKEN`
  - `NOTION_DATABASE_ID`

#### 2. get-count.js
- **Purpose**: Retrieves and caches lead generation count
- **Features**:
  - 1-minute cache for performance
  - Pagination handling for large datasets
  - Base count offset (215)
  - Error fallback
- **Environment Variables Required**:
  - `NOTION_TOKEN`
  - `NOTION_DATABASE_ID`

## Requirements

### Functional Requirements

#### FR1: Local Development Server
- Must serve static files (HTML, CSS, JS)
- Must execute serverless functions at `/api/*` endpoints
- Must support hot reloading for development
- Must load environment variables from local configuration

#### FR2: Environment Variable Management
- Must support `.env.local` file for sensitive data
- Must not commit secrets to version control
- Must provide clear error messages for missing variables

#### FR3: API Testing Capabilities
- Must allow testing of form submissions locally
- Must allow testing of visitor count retrieval
- Must support CORS headers in local environment
- Must maintain rate limiting functionality

## Implementation Plan

#### 3.2 Verify vercel.json
The existing `vercel.json` configuration is already properly set up with:
- Function configurations with 10-second timeout
- Security headers

### Phase 4: Local Development Testing

#### 4.1 Start Development Server
```bash
# Start Vercel dev server
vercel dev

# Or use npm script
npm run dev
```

#### 4.2 Test Endpoints
1. **Static Site**: http://localhost:3000
2. **Submit Form API**: POST http://localhost:3000/api/submit-form
3. **Get Count API**: GET http://localhost:3000/api/get-count

#### 4.3 Test Form Submission
```bash
curl -X POST http://localhost:3000/api/submit-form \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "source": "test",
    "timestamp": "2025-01-19T00:00:00Z"
  }'
```

## Testing Procedures

### 1. Environment Variable Validation
- Start server without `.env.local` - should see clear error messages
- Add incomplete variables - should fail gracefully
- Add complete variables - functions should work

### 2. Form Submission Testing
- Valid submission - should return success
- Missing fields - should return 400 error
- Invalid email - should return validation error
- Rate limiting - submit 11 times quickly, 11th should fail
- Honeypot - include "website" field, should fail

### 3. Visitor Count Testing
- First request - should query Notion
- Second request within 1 minute - should use cache
- Error simulation - use invalid token, should return default count

### 4. CORS Testing
- Test from different origins
- Verify OPTIONS requests work
- Check response headers

## Troubleshooting Guide

### Common Issues

#### 1. "NOTION_TOKEN is not defined"
**Solution**: Create `.env.local` file with proper variables

#### 2. "Cannot find module 'vercel'"
**Solution**: Run `npm install` or install globally with `npm i -g vercel`

#### 3. "Port 3000 already in use"
**Solution**: Use different port: `vercel dev --listen 3001`

#### 4. "Notion API error: Unauthorized"
**Solution**: 
- Verify NOTION_TOKEN is correct
- Ensure database is shared with integration
- Check token has proper permissions

#### 5. "Function timeout"
**Solution**: Functions have 10-second limit, optimize Notion queries

### Debug Mode
For verbose logging:
```bash
vercel dev --debug
```

## Best Practices

### 1. Security
- Never commit `.env.local`
- Rotate Notion tokens periodically
- Use environment-specific tokens
- Monitor API usage

### 2. Development Workflow
- Test all changes locally before deployment
- Use consistent Node.js version
- Keep dependencies updated
- Document any custom configurations

### 3. Performance
- Respect cache durations
- Optimize Notion queries
- Monitor function execution times
- Use appropriate timeouts

## Future Enhancements

### 1. Advanced Features
- Add TypeScript support
- Implement proper logging service
- Add unit tests for functions
- Set up CI/CD pipeline

### 2. Monitoring
- Add error tracking (e.g., Sentry)
- Implement analytics
- Monitor API performance
- Track submission metrics

### 3. Scalability
- Consider Redis for rate limiting
- Implement queue for form submissions
- Add database backup strategy
- Plan for traffic spikes

## Appendix A: Notion Database Schema

Required properties for the Notion database:

| Property | Type | Description |
|----------|------|-------------|
| Name | Title | Submitter's name |
| Email | Email | Contact email |
| Source | Text | Submission source (website, survey, etc.) |
| Timestamp | Date | Submission time |
| Status | Select | Processing status (New, Contacted, Completed) |

## Appendix B: API Documentation

### POST /api/submit-form
**Request Body**:
```json
{
  "name": "string (required, 2-100 chars)",
  "email": "string (required, valid email)",
  "source": "string (optional)",
  "timestamp": "string (optional, ISO 8601)",
  "website": "string (honeypot, must be empty)"
}
```

**Response**:
- 200: Success with submission ID
- 400: Validation error
- 429: Rate limit exceeded
- 500: Server error

### GET /api/get-count
**Response**:
```json
{
  "count": 215
}
```

## Appendix C: Resources

### Official Documentation
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Vercel Functions Guide](https://vercel.com/docs/functions)
- [Notion API Reference](https://developers.notion.com/reference)

### Community Resources
- Vercel Discord Community
- Notion API Developers Forum
- Stack Overflow tags: `vercel`, `notion-api`

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-19 | System | Initial document creation |
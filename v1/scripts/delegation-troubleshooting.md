# Gmail Domain-Wide Delegation Troubleshooting

## Current Status
✅ Service account credentials are valid  
✅ JWT tokens are being created successfully  
✅ Gmail API is enabled  
❌ Domain-wide delegation is not working  

## Service Account Details
- **Client ID**: `116861682133988247799`
- **Service Account Email**: `nstcg-email-sender@nstcg-org.iam.gserviceaccount.com`
- **Project**: `nstcg-org`

## Common Domain-Wide Delegation Issues

### 1. **Incorrect Client ID**
- Go to: https://admin.google.com → Security → API controls → Domain-wide delegation
- **VERIFY**: The Client ID is exactly: `116861682133988247799`
- **CHECK**: No extra spaces, characters, or line breaks

### 2. **Incorrect OAuth Scopes**
The scope must be **EXACTLY** (case-sensitive):
```
https://www.googleapis.com/auth/gmail.send
```

**Common mistakes:**
- Extra spaces: ` https://www.googleapis.com/auth/gmail.send `
- Wrong case: `https://www.googleapis.com/auth/Gmail.send`
- Missing 's': `https://www.googleapis.com/auth/gmail.end`
- Wrong format: `gmail.send` (missing full URL)

### 3. **Multiple Scopes Format**
If adding multiple scopes, separate with commas (NO spaces):
```
https://www.googleapis.com/auth/gmail.send,https://www.googleapis.com/auth/gmail.readonly
```

### 4. **Domain Organization Issues**
- **CHECK**: You're configuring this in the correct Google Workspace organization
- **VERIFY**: The `nstcg.org` domain is managed by this Workspace
- **CONFIRM**: You have Super Admin access to make these changes

### 5. **User Account Issues**
- **CREATE**: Make sure `noreply@nstcg.org` exists as a real user account
- **ALTERNATIVE**: Use `engineering@nstcg.org` (we know this exists)

### 6. **Propagation Time**
- **WAIT**: Changes can take 5-15 minutes to propagate
- **TRY**: Disable and re-enable the delegation entry
- **CLEAR**: Browser cache and try incognito mode

### 7. **Service Account Permissions**
The service account has all required permissions, so this is NOT the issue.

## Quick Fix Steps

1. **Double-check the delegation entry:**
   - Client ID: `116861682133988247799`
   - Scope: `https://www.googleapis.com/auth/gmail.send`

2. **Remove and re-add the delegation:**
   - Delete the existing entry
   - Wait 2 minutes
   - Add it back with exact values above

3. **Test with different users:**
   ```bash
   # Test with engineering@nstcg.org first (we know this user exists)
   GMAIL_SENDER_EMAIL=engineering@nstcg.org node test-email-campaign.js
   ```

4. **Create the noreply user:**
   - Go to Admin Console → Users
   - Add user: `noreply@nstcg.org`
   - Wait 5 minutes, then test

## Test Commands
```bash
# Run comprehensive diagnostic
node diagnose-gmail-permissions.js

# Test with different email
GMAIL_SENDER_EMAIL=engineering@nstcg.org node test-email-campaign.js

# Original test
node test-email-campaign.js
```

## Expected Success Output
When working correctly, you should see:
```
✓ Gmail API access
  Email: noreply@nstcg.org (or engineering@nstcg.org)
```

## Still Not Working?
If all above checks pass and it still doesn't work:
1. **Check Google Workspace status page** for outages
2. **Try a different browser/incognito mode** for Admin Console
3. **Wait 24 hours** - sometimes there are longer propagation delays
4. **Contact Google Workspace support** with the Client ID and exact error messages

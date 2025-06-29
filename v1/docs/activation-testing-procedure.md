# Email Activation Testing Procedure

## Overview
This document outlines the step-by-step process for testing the email activation flow with the new file-based logging system.

## Prerequisites
1. Ensure you have a test email that exists in the Leads database
2. Have access to the Notion databases (Leads and Gamification)
3. Node.js environment set up with dependencies installed

## Step 1: Clear Previous Logs
```bash
# Clear any existing logs
rm -f logs/api/*.log
rm -f logs/frontend/*.log
```

## Step 2: Start the Log Viewer
Open a terminal and run:
```bash
node scripts/view-logs.js tail
```
This will show logs in real-time as they're generated.

## Step 3: Start Development Servers
In a new terminal:
```bash
npm run both
```
Wait for both Vite and Vercel servers to start.

## Step 4: Test the Activation Flow

### 4.1 Direct API Test (Optional)
First, test the API endpoint directly:
```bash
curl -X POST http://localhost:3000/api/activate-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "visitor_type": "local",
    "bonusPoints": 75
  }'
```

### 4.2 Full Browser Flow
1. Open browser to activation URL:
   ```
   http://localhost:5173/?user_email=test@example.com&bonus=75
   ```

2. Expected behavior:
   - Page loads and detects activation parameters
   - Modal appears showing bonus points
   - User selects visitor type
   - Clicks "Activate & Claim Points"
   - Processing state shows
   - Success message appears
   - Page reloads after 3 seconds

## Step 5: Monitor Logs

### Frontend Logs Should Show:
1. `main.js loaded`
2. `URL parameters checked`
3. `Email activation detected`
4. `handleEmailActivation called`
5. `Showing activation modal`
6. `Activation form submitted`
7. `Calling activation API`
8. `API success response` (or error)
9. `Storing user data in localStorage`
10. `Reloading page`

### Backend Logs Should Show:
1. `API Request received`
2. `Activation attempt started`
3. `Querying Leads database`
4. `User info extracted`
5. `Updating Leads database`
6. `Checking for existing gamification profile`
7. `Awarding bonus points` (or `Bonus points already awarded`)
8. `Activation completed successfully`

## Step 6: Check Log Files
After testing, examine the log files:

```bash
# View today's API logs
cat logs/api/activate-user-$(date +%Y-%m-%d).log | jq .

# View today's frontend logs
cat logs/frontend/activation-flow-$(date +%Y-%m-%d).log | jq .
```

## Step 7: Search for Errors
```bash
# Search for any errors
node scripts/view-logs.js search "ERROR"

# View summary
node scripts/view-logs.js summary
```

## Step 8: Verify Database Updates

### Check Notion Leads Database:
- User should have visitor_type updated
- Referral code should be present

### Check Notion Gamification Database:
- User profile should exist
- Bonus points (75) should be awarded
- Total points should include bonus

## Common Issues to Look For

1. **Modal Not Appearing**
   - Check if MicroModal is loaded
   - Verify modal HTML exists in page

2. **API 404 Error**
   - Ensure email exists in Leads database
   - Check email format and encoding

3. **No Gamification Update**
   - Check NOTION_GAMIFICATION_DB_ID environment variable
   - Verify Notion API permissions

4. **Page Doesn't Reload**
   - Check for JavaScript errors in console
   - Verify localStorage is being updated

## Debug Commands

### View specific session:
```bash
# Get session ID from logs, then:
node scripts/view-logs.js session session_1234567_abc
```

### Check for rate limiting:
```bash
node scripts/view-logs.js search "rate limit"
```

### Check for database errors:
```bash
node scripts/view-logs.js search "Failed to"
```

## Test Scenarios

1. **New User Activation**
   - User exists in Leads but not Gamification
   - Should create new gamification profile

2. **Repeat Activation**
   - User already activated before
   - Should not award bonus points again

3. **Invalid Parameters**
   - Test with invalid email
   - Test with invalid bonus points
   - Test with missing visitor type

4. **Rate Limiting**
   - Attempt multiple activations rapidly
   - Should see rate limit messages

## Success Criteria

✅ All frontend logs show expected flow  
✅ Backend logs show successful database operations  
✅ No ERROR level logs  
✅ User data correctly stored in localStorage  
✅ Database records properly updated  
✅ Bonus points awarded (first time only)  
✅ Page successfully reloads with user state  

## Troubleshooting

If logs aren't appearing:
1. Check that log directories exist
2. Verify file permissions
3. Ensure servers are running on correct ports
4. Check browser console for errors
5. Verify API endpoint is registered in vercel.json
# Leaderboard Debugging Procedure

## Overview
This document outlines how to debug the leaderboard display issues using the file-based logging system.

## Issues to Debug
1. Names showing as "undefined"
2. Points displaying as 0
3. Referral counts not showing
4. Podium (1st, 2nd, 3rd) not displaying names

## Step 1: Clear Logs
```bash
# Clear existing logs
rm -f logs/api/get-leaderboard-*.log
rm -f logs/frontend/activation-flow-*.log
```

## Step 2: Start Log Viewer
In Terminal 1:
```bash
node scripts/view-logs.js tail
```

## Step 3: Start Development Servers
In Terminal 2:
```bash
npm run both
```
Wait for both servers to start (Vite on 5173, Vercel on 3000).

## Step 4: Run API Test Script
In Terminal 3:
```bash
node scripts/test-leaderboard.js
```

This will:
- Call the leaderboard API directly
- Show the API response structure
- Query Notion directly to show raw property names
- Compare what the API returns vs what Notion has

## Step 5: Load Leaderboard Page
In browser:
```
http://localhost:5173/leaderboard.html
```

## Step 6: Analyze Logs

### Backend Logs to Look For:
1. **Property names from Notion**:
   - Look for "First result properties"
   - Check if properties are "Name", "Display Name", or something else
   - Verify "Total Points" and "Direct Referrals Count" exist

2. **Name extraction**:
   - Look for "Using Display Name:", "Using Name:", or "Using First/Last Name:"
   - Check if "No name found for entry" warnings appear

3. **Data formatting**:
   - Look for "Entry 1", "Entry 2", "Entry 3" logs
   - Verify the formatted data has correct names, points, referrals

### Frontend Logs to Look For:
1. **API Response**:
   - Look for "Leaderboard API response"
   - Check sampleData to see what frontend receives

2. **Podium Updates**:
   - Look for "Updating podium"
   - Check topThree data for names and values

3. **Row Creation**:
   - Look for "Creating row" logs
   - Verify data for first 5 rows

## Step 7: Common Issues and Solutions

### If Names are "undefined":
- Check backend logs for actual property names
- The API might be looking for wrong property names
- Common property names in Notion:
  - `Name` (title field)
  - `Display Name` (rich_text field)
  - NOT `First Name` and `Last Name`

### If Points are 0:
- Check if `Total Points` property exists in Notion response
- Verify it's a number type field
- Check for property name variations

### If Referrals are 0:
- Check if `Direct Referrals Count` property exists
- Verify the property name matches exactly

## Step 8: View Log Summary
```bash
# Search for errors
node scripts/view-logs.js search "ERROR"

# View summary
node scripts/view-logs.js summary
```

## Step 9: Direct Database Check
If needed, check what's actually in the Notion database:
1. Go to Notion
2. Open the Gamification database
3. Verify property names match what the code expects
4. Check that users have "Opted Into Leaderboard" checked

## Expected Log Output

### Successful Case:
```
[Backend]
- "First result properties" showing actual property names
- "Using Display Name: John D." or similar
- "Entry 1" with populated name, points, referrals

[Frontend]  
- "Leaderboard API response" with entriesCount > 0
- "Updating podium" with actual names
- "Setting first place" with real data
```

### Failed Case:
```
[Backend]
- "No name found for entry"
- Properties showing wrong field names
- Missing expected properties

[Frontend]
- Names showing as "undefined"
- Points/referrals as 0
```

## Quick Fix Guide

Once you identify the issue from logs:

1. **Wrong property names**: Update get-leaderboard.js to use correct property names from Notion
2. **Missing data**: Check if Notion database has the required fields
3. **Type mismatches**: Ensure proper field types (title vs rich_text vs number)
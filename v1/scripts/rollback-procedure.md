# Email Campaign Rollback Procedure

## When to Execute Rollback

Initiate rollback if any of these conditions occur:

1. **Email Delivery Failure Rate > 5%**
   - More than 5% of emails bouncing or failing
   - Gmail API returning consistent errors
   - Authentication issues that can't be resolved quickly

2. **Activation API Errors**
   - Activation endpoint returning 500 errors
   - Database connection failures
   - Rate limiting preventing user activations

3. **Critical Bug Discovery**
   - Incorrect bonus points being awarded
   - Wrong activation URLs being generated
   - Security vulnerability identified

4. **High User Complaint Rate**
   - Multiple reports of spam classification
   - Users reporting they can't activate
   - Broken links or formatting issues

## Rollback Steps

### 1. Stop Email Sending Immediately

```bash
# If campaign is running, press Ctrl+C to stop gracefully
# This will save the current state to campaign-log.json
```

### 2. Assess Current State

```bash
# Check how many emails were sent
cat campaign-log.json | jq '.sent | length'

# Check failed emails
cat campaign-log.json | jq '.failed'

# Run monitor to see activation rates
node monitor-campaign.js
```

### 3. Fix the Issue

Depending on the problem:

#### Email Delivery Issues:
- Check Gmail API quotas in Google Cloud Console
- Verify authentication is still valid
- Review email content for spam triggers
- Check SPF/DKIM records if using custom domain

#### Activation API Issues:
- Check Vercel logs: `vercel logs`
- Verify environment variables are set correctly
- Test API endpoint manually
- Check Notion API status

#### Template Issues:
- Fix template in `email/activate.mjml`
- Test with `node preview-email.js`
- Verify all variables are correct

### 4. Restore Service

#### Option A: Resume Campaign (if issue is fixed)
```bash
# Resume from where it stopped
node launch-campaign.js --resume

# Or restart specific failed emails
node launch-campaign.js --emails=user1@example.com,user2@example.com
```

#### Option B: Start Fresh (if major changes needed)
```bash
# Backup current state
cp campaign-log.json campaign-log-failed.json

# Remove state file
rm campaign-log.json

# Start campaign with test batch first
node launch-campaign.js --test-batch

# If successful, run full campaign
node launch-campaign.js
```

### 5. Communication

#### Internal Team:
- Notify project manager of issue and resolution
- Document problem in incident log
- Update monitoring dashboard

#### Users (if needed):
- If users received broken emails, prepare follow-up
- Draft apology email with correct links
- Consider extending deadline if activation was affected

## Recovery Procedures

### Resend to Failed Recipients

```bash
# Extract failed emails from log
cat campaign-log.json | jq -r '.failed[].email' > failed-emails.txt

# Resend to specific emails
node launch-campaign.js --emails=$(cat failed-emails.txt | tr '\n' ',')
```

### Fix Incorrect Bonus Points

If wrong bonus points were sent:

```javascript
// Script to update bonus points in Notion
// update-bonus-points.js
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function fixBonusPoints(email, correctPoints) {
  // Find user in gamification database
  // Update their bonus points
  // Log the correction
}
```

### Regenerate Activation URLs

If activation URLs were incorrect:

1. Identify affected users from campaign-log.json
2. Generate correct URLs
3. Send follow-up email with apology and correct link

## Monitoring After Recovery

1. **Watch activation rates closely**
   ```bash
   node monitor-campaign.js --real-time
   ```

2. **Check error logs**
   ```bash
   tail -f vercel logs
   ```

3. **Monitor user feedback**
   - Check support emails
   - Watch for social media mentions
   - Track activation completion rate

## Lessons Learned Template

After any rollback, document:

```markdown
## Incident Report - [Date]

### What Happened
[Brief description of the issue]

### Impact
- Emails affected: X
- Users impacted: Y
- Duration: Z minutes

### Root Cause
[Technical explanation]

### Resolution
[Steps taken to fix]

### Prevention
[Changes to prevent recurrence]

### Timeline
- HH:MM - Issue detected
- HH:MM - Campaign stopped
- HH:MM - Fix implemented
- HH:MM - Campaign resumed
```

## Emergency Contacts

- Technical Lead: [Name] - [Phone]
- Project Manager: [Name] - [Phone]
- Notion Support: https://notion.so/contact
- Google Cloud Support: [Support PIN]
- Vercel Support: support@vercel.com

---

**Remember**: It's better to pause and fix properly than to continue with a broken campaign. User trust is paramount.
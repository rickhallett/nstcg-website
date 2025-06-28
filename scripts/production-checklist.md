# Production Deployment Checklist

**Campaign:** Email Activation Campaign  
**Date:** _______________  
**Operator:** _______________  
**Target:** 340+ existing users  

## Pre-Deployment Verification

### 1. Environment Configuration ✓
- [ ] All environment variables set in Vercel dashboard
  - [ ] `NOTION_TOKEN` - Verified working
  - [ ] `NOTION_DATABASE_ID` - Correct Leads database
  - [ ] `NOTION_GAMIFICATION_DB_ID` - Gamification database
  - [ ] `GOOGLE_APPLICATION_CREDENTIALS_JSON` - Service account JSON
  - [ ] `SITE_URL` - https://nstcg.org
- [ ] `.env.local` created for local testing
- [ ] Service account has Gmail send permissions

### 2. Code Verification ✓
- [ ] Latest code deployed to Vercel
- [ ] `activate-user` API endpoint tested
- [ ] Email template renders correctly
- [ ] Activation URLs generate properly
- [ ] Bonus points validation working (75 static value)

### 3. Database Verification ✓
- [ ] Notion Leads database accessible
- [ ] All users have valid email addresses
- [ ] No duplicate emails in database
- [ ] Gamification database ready
- [ ] Test user created and verified

### 4. Email System Verification ✓
- [ ] Gmail API authentication working
- [ ] Test email sent successfully
- [ ] Email template previews generated
- [ ] SPF/DKIM records configured (if using custom domain)
- [ ] From address verified

## Launch Preparation

### 5. Testing Suite ✓
- [ ] Run `node test-email-campaign.js`
  - All tests pass (except Gmail in dev)
  - User data quality verified
  - Template compilation successful
- [ ] Preview emails reviewed by team
- [ ] Activation flow tested end-to-end

### 6. Monitoring Setup ✓
- [ ] Monitor script ready (`monitor-campaign.js`)
- [ ] CSV export directory created
- [ ] Error alerting configured
- [ ] Real-time dashboard accessible

### 7. Backup & Recovery ✓
- [ ] Notion databases backed up
- [ ] Campaign state will be logged
- [ ] Rollback procedure documented
- [ ] Support team briefed on issues

## Launch Execution

### 8. Test Batch (5 emails) ✓
- [ ] Select 5 test recipients (team members)
- [ ] Send test batch with `--batch-size=5`
- [ ] Verify email delivery (check spam folders)
- [ ] Test activation links work
- [ ] Confirm bonus points awarded
- [ ] Check monitoring dashboard

**Test Results:**
- Emails sent: ___/5
- Delivered: ___/5  
- Activated: ___/5
- Issues: _________________

### 9. Pilot Batch (50 emails) ✓
- [ ] Send first production batch
- [ ] Monitor delivery rate
- [ ] Track activation rate (target >15%)
- [ ] Check for bounce backs
- [ ] Review error logs
- [ ] Verify rate limiting working

**Pilot Results:**
- Emails sent: ___/50
- Delivered: ___/50
- Activated: ___/50 (___%)
- Bounce rate: ___%
- Issues: _________________

### 10. Full Campaign Launch ✓
- [ ] If pilot successful, proceed with remaining users
- [ ] Launch in batches of 50-100
- [ ] Monitor continuously
- [ ] Document any issues
- [ ] Respond to user queries

## Post-Launch

### 11. Monitoring & Metrics ✓
- [ ] Continue monitoring for 48 hours
- [ ] Export final metrics CSV
- [ ] Calculate final activation rate
- [ ] Document lessons learned
- [ ] Archive campaign logs

### 12. Success Metrics ✓
- [ ] Open rate > 30%
- [ ] Click rate > 15%
- [ ] Activation completion > 50%
- [ ] Error rate < 1%
- [ ] Delivery rate > 99%

## Emergency Procedures

### If emails failing:
1. Stop campaign immediately
2. Check Gmail API quotas
3. Verify authentication still valid
4. Review error logs
5. Fix issue and resume with `--resume` flag

### If high bounce rate:
1. Pause campaign
2. Review bounced emails
3. Clean email list
4. Adjust sending rate
5. Resume with cleaned list

### If activation API down:
1. Email sending can continue
2. Fix API issue
3. Users can still activate later
4. Monitor and communicate

## Sign-offs

- [ ] Technical Lead: _________________ Date: _______
- [ ] Project Manager: _________________ Date: _______
- [ ] Campaign Operator: _________________ Date: _______

## Notes

_Use this space for any additional observations or issues during deployment_

---

**Remember:** Start small, monitor closely, and scale gradually!
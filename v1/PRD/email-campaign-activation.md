# Email Campaign & User Activation System PRD

## Executive Summary

This document outlines the email campaign and user activation system designed to re-engage existing users in the Leads database, incentivize them with bonus points, and enable cross-device session restoration. The system sends personalized emails with time-sensitive messaging about the survey deadline and new referral scheme, driving users back to the platform through a seamless activation flow.

## Problem Statement

Current challenges:
- 340+ registered users who may not be aware of the new referral scheme
- Users who registered on one device cannot access their account on another device
- No mechanism to re-engage dormant users as survey deadline approaches
- Lack of incentive for existing users to return and participate
- No automated way to communicate updates to the user base

These issues result in:
- Lower engagement from existing registered users
- Missed opportunities for referral-driven growth
- Users unable to access their referral codes on different devices
- Reduced viral coefficient as users don't share from multiple devices
- Time-sensitive survey participation at risk

## Goals & Objectives

### Primary Goals
1. Re-engage all existing users via personalized email campaign
2. Enable cross-device account access through email authentication
3. Incentivize return visits with static bonus points (75)
4. Restore full session state including referral codes and user data
5. Drive survey participation before deadline

### Success Metrics
- Email open rate >30%
- Click-through rate >15%
- Activation completion rate >50% of clicks
- Average bonus points claimed: 75
- Referral shares post-activation >20%

## User Stories

### As an Existing User
- I want to be reminded about the survey deadline
- I want to learn about the new referral scheme
- I want to access my account from any device
- I want to earn bonus points for returning
- I want to see my referral code immediately

### As a Campaign Administrator
- I want to send emails to all registered users
- I want to track email campaign performance
- I want to see activation rates
- I want to ensure secure authentication
- I want to prevent abuse of bonus points

### As a Mobile User
- I want to click the email link on my phone
- I want the activation process to be simple
- I want my account restored on this device
- I want to share my referral code immediately
- I want the interface to be mobile-friendly

## Functional Requirements

### 1. Email Campaign System

#### Campaign Script (`scripts/email-campaign.js`)
```javascript
// Core functionality
- Fetch all users from Leads Notion database
- Generate personalized email content
- Calculate time remaining until survey deadline
- Assign static bonus points (75)
- Send via Gmail API using ADC authentication
- Rate limit to 1 email per second
- Track sending status and errors
```

#### Email Template Features
- Responsive HTML design
- Dynamic countdown timer display
- Personalized greeting with first name
- Bonus points announcement
- Clear CTA button with activation link
- Referral scheme benefits
- Mobile-optimized layout

#### Activation Link Structure
```
https://nstcg.org/?user_email={encoded_email}&bonus={points}
```

### 2. User Activation Flow

#### URL Parameter Detection
```javascript
// Check for email activation on page load
if (userEmail) {
  handleEmailActivation(userEmail, bonusPoints);
  return; // Prevent other parameter processing
}
```

#### Activation Modal
- Welcome message with bonus points display
- Visitor type selection (local/tourist)
- Single-click activation
- Progress states (form → processing → success)
- Error handling with user-friendly messages

#### Modal States
1. **Initial State**: Form with visitor type selection
2. **Processing State**: Loading spinner with status message
3. **Success State**: Confirmation with referral code display
4. **Error State**: Clear error message with retry option

### 3. Backend Activation API

#### Endpoint: `/api/activate-user`
```javascript
// Request
{
  email: string,
  visitorType: 'local' | 'tourist',
  bonusPoints: number (75 - static)
}

// Response
{
  success: boolean,
  userData: {
    user_id: string,
    email: string,
    first_name: string,
    last_name: string,
    name: string,
    referral_code: string,
    comment: string,
    visitor_type: string,
    bonus_points: number,
    registered: boolean
  }
}
```

#### Processing Logic
1. Validate email exists in Leads database
2. Extract complete user record
3. Generate referral code if missing
4. Update visitor type in Leads DB
5. Create/update Gamification profile
6. Award bonus points
7. Return full user data for localStorage

### 4. Session Restoration

#### LocalStorage Keys Restored
```javascript
localStorage.setItem('nstcg_user_id', userData.user_id);
localStorage.setItem('nstcg_email', userData.email);
localStorage.setItem('nstcg_registered', 'true');
localStorage.setItem('nstcg_referral_code', userData.referral_code);
localStorage.setItem('nstcg_first_name', userData.first_name);
localStorage.setItem('nstcg_comment', userData.comment);
```

#### UI State Updates
- Hide registration form
- Show confirmation message
- Display share buttons
- Update navigation state
- Show referral code
- Enable all registered-user features

### 5. Gamification Integration

#### Profile Creation/Update
```javascript
// New profile properties
{
  'Email': email,
  'Name': fullName,
  'Display Name': firstName + lastInitial,
  'User ID': userId,
  'Referral Code': referralCode,
  'Total Points': bonusPoints,
  'Bonus Points': bonusPoints,
  'Registration Points': 0, // Already registered
  'Share Points': 0,
  'Referral Points': 0,
  'Direct Referrals Count': 0,
  'Streak Days': 1,
  'Is Anonymous': false,
  'Opted Into Leaderboard': true,
  'Profile Visibility': 'Public',
  'Created At': timestamp,
  'Last Activity Date': timestamp
}
```

#### Points Allocation
- Static bonus: 75 points
- Weighted towards middle values
- One-time bonus per activation
- Added to total points immediately
- Tracked separately as "Bonus Points"

## Technical Implementation

### 1. Email Sending Architecture

#### Gmail API Integration
```javascript
// Authentication using ADC
const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/gmail.send'],
});

// Email construction
const message = [
  'Content-Type: text/html; charset=utf-8',
  'MIME-Version: 1.0',
  `From: North Swanage Traffic Safety Group <info@nstcg.org>`,
  `To: ${recipient}`,
  `Subject: ${subject}`,
  '',
  htmlContent
].join('\n');
```

#### Rate Limiting
- 1 second delay between emails
- Prevents Gmail API quota issues
- Allows ~3,600 emails per hour
- Progress logging for monitoring

### 2. Frontend Integration

#### MicroModal Initialization
```javascript
// Initialize modal system
if (typeof MicroModal !== 'undefined') {
  MicroModal.init();
}

// Show activation modal
MicroModal.show('modal-activation');
```

#### Form Submission Handling
```javascript
// Prevent double submissions
if (submitBtn.disabled) return;
submitBtn.disabled = true;

// Show processing state
activationForm.style.display = 'none';
processingDiv.style.display = 'block';

// API call with error handling
try {
  const response = await fetch('/api/activate-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  // Handle response
} catch (error) {
  // Show error state
}
```

### 3. Database Operations

#### Notion API Queries
```javascript
// Find user by email
const response = await notion.databases.query({
  database_id: LEADS_DB_ID,
  filter: {
    property: 'Email',
    email: { equals: email }
  }
});

// Update user properties
await notion.pages.update({
  page_id: pageId,
  properties: updates
});
```

#### Gamification Updates
- Check existence before creation
- Merge with existing data
- Atomic updates for consistency
- Error isolation (doesn't fail activation)

### 4. Security Measures

#### Email Validation
- Server-side email format validation
- Case-insensitive email matching
- Existing user verification
- Rate limiting on activation endpoint

#### Bonus Points Validation
- Range enforcement (10-50)
- Integer validation
- Server-side generation fallback
- One-time activation per email

#### URL Manipulation Prevention
- Clean URL after processing
- Session-based tracking
- No sensitive data in URLs
- HTTPS-only activation links

## User Experience Flow

### 1. Email Receipt
```
User receives email → 
Opens email → 
Sees countdown timer → 
Reads about bonus points → 
Clicks "Let's Win This!" button
```

### 2. Landing & Activation
```
Browser opens with parameters → 
Activation modal appears → 
User sees bonus points → 
Selects visitor type → 
Clicks "Activate & Claim Points"
```

### 3. Processing & Success
```
Loading spinner shows → 
API validates user → 
Updates databases → 
Shows success message → 
Displays referral code → 
User clicks "Continue to Dashboard"
```

### 4. Session Restored
```
Page reloads → 
LocalStorage populated → 
User sees personalized content → 
Registration form hidden → 
Share buttons enabled → 
Full access restored
```

## Testing & Validation

### 1. Test Scripts
- `test-email-campaign.js`: Validates email system without sending
- `preview-email.js`: Generates sample email for review
- Database connection testing
- Template variable validation

### 2. Manual Testing Checklist
- [ ] Email renders correctly in Gmail/Outlook
- [ ] Activation link works on mobile
- [ ] Modal displays properly
- [ ] Form validation works
- [ ] API handles errors gracefully
- [ ] LocalStorage restored correctly
- [ ] UI updates appropriately
- [ ] Bonus points awarded once only

### 3. Edge Cases
- User not found in database
- Invalid bonus points in URL
- Missing email parameter
- Network errors during activation
- Duplicate activation attempts
- Modal closed before completion

## Success Metrics & Monitoring

### 1. Campaign Metrics
- Emails sent successfully
- Bounce rate
- Open rate (via pixel tracking)
- Click-through rate
- Time to activation
- Device types used

### 2. Activation Metrics
- Total activations
- Activation completion rate
- Average time to complete
- Error rates by type
- Bonus points distribution
- Visitor type breakdown

### 3. Post-Activation Behavior
- Referral shares initiated
- Survey completions
- Return visits
- Cross-device usage
- Referral link clicks

## Maintenance & Operations

### 1. Regular Tasks
- Monitor email sending queue
- Check API error logs
- Review activation rates
- Update email templates
- Adjust bonus point ranges

### 2. Troubleshooting Guide
| Issue | Cause | Solution |
|-------|-------|----------|
| Emails not sending | API quota exceeded | Check Gmail API dashboard |
| Low activation rate | Email in spam | Improve email content/sender reputation |
| Activation fails | User not in DB | Verify email exists before sending |
| Bonus points wrong | URL manipulation | Validate server-side |

### 3. Future Enhancements
- A/B testing email templates
- Progressive bonus points
- Referral leaderboard in email
- Automated follow-up sequences
- Social proof in activation modal

## Conclusion

The email campaign and user activation system provides a complete solution for re-engaging existing users, enabling cross-device access, and incentivizing participation through bonus points. The implementation prioritizes user experience with a seamless activation flow while maintaining security and data integrity throughout the process.
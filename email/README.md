# Email Campaign Tools

This directory contains email campaign tools for NSTCG.

## auto_smtp.py

A Python script that sends activation emails to users from the Notion database using Gmail SMTP.

### Features
- Fetches users from Notion database automatically
- Filters out already-sent emails
- Uses the activate.mjml template
- Real-time progress tracking
- Tracks success/failure in JSON files
- Supports dry-run mode and resume functionality

### Prerequisites
```bash
# Install required Python packages
pip install notion-client python-dotenv

# Ensure Node.js and MJML are installed
npm install -g mjml
```

### Environment Variables
Add to your `.env` file:
```bash
NOTION_TOKEN=your_notion_integration_token
NOTION_DATABASE_ID=your_database_id
GMAIL_APP_PASSWORD=your_gmail_app_password  # Optional, can be entered at runtime
```

### Usage
```bash
# Dry run mode (preview without sending)
python email/auto_smtp.py --dry-run

# Send emails
python email/auto_smtp.py

# Resume from previous run
python email/auto_smtp.py --resume

# Specify custom Gmail sender
python email/auto_smtp.py --gmail-user your-email@gmail.com

# Process in smaller batches
python email/auto_smtp.py --batch-size 25
```

### Gmail Setup
1. Enable 2-factor authentication on your Gmail account
2. Go to Google Account settings → Security → App passwords
3. Generate an app password for "Mail"
4. Use that 16-character password (not your regular Gmail password)

### Output
The script provides real-time progress updates:
```
🚀 Starting Email Activation Campaign...
📊 Fetching users from Notion database...
✅ Found 312 registered users
📌 Found 100 previously sent emails
📊 Filtering: 100 already sent, 212 to process

📧 [1/212] Sending to john@example.com... ✅
📧 [2/212] Sending to jane@example.com... ❌ (Invalid email)

📊 Campaign Summary
==================================================
Total Users: 312
Already Sent: 100
Processed: 212
Successful: 210
Failed: 2
Duration: 3.7 minutes
==================================================
```

### Files
- `sent-emails.json`: Tracks successfully sent emails
- `failed-emails.json`: Tracks failed attempts with error details
- `activate.mjml`: Email template with {{user_email}} placeholder
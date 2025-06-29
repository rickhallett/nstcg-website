#!/usr/bin/env python3

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import getpass
import json
import os
import sys
import subprocess
import time
import argparse
from datetime import datetime
from pathlib import Path

# Try to import required packages
try:
    from notion_client import Client as NotionClient
    from dotenv import load_dotenv
except ImportError:
    print("❌ Missing required packages. Please install:")
    print("   pip install notion-client python-dotenv")
    sys.exit(1)

# Load environment variables
load_dotenv()

# Get script directory
SCRIPT_DIR = Path(__file__).parent.absolute()
PROJECT_ROOT = SCRIPT_DIR.parent

# File paths
SENT_EMAILS_FILE = PROJECT_ROOT / "scripts" / "sent-emails.json"
FAILED_EMAILS_FILE = PROJECT_ROOT / "scripts" / "failed-emails.json"
MJML_TEMPLATE_FILE = SCRIPT_DIR / "activate.mjml"

# Configuration
CONFIG = {
    "RATE_LIMIT_MS": 1000,  # 1 second between emails
    "GMAIL_USER": "engineering@nstcg.org",  # Default sender email
    "EMAIL_SUBJECT": "⏰ Time is Running Out - Activate Your Referral Code!",
}


def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description="Send activation emails to users from Notion database",
        epilog="""
Examples:
  python auto_smtp.py --dry-run              # Preview mode
  python auto_smtp.py --batch-size=10        # Process 10 emails per batch
  python auto_smtp.py --resume               # Resume previous run
  python auto_smtp.py --hans-solo            # Send test email to kai@oceanheart.ai
  python auto_smtp.py -hs                    # Same as --hans-solo
        """,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Preview mode without sending emails"
    )
    parser.add_argument(
        "--resume", action="store_true", help="Resume from previous run"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=50,
        help="Number of emails to process per batch (default: 50)",
    )
    parser.add_argument("--gmail-user", type=str, help="Gmail address to send from")
    parser.add_argument(
        "--single-email",
        type=str,
        help="Send email to a single email address",
    )
    parser.add_argument(
        "--hans-solo",
        "-hs",
        action="store_true",
        help="Send single test email to kai@oceanheart.ai",
    )
    return parser.parse_args()


def fetch_users_from_notion():
    """Fetch all users from Notion database"""
    print("📊 Fetching users from Notion database...")

    notion_token = os.getenv("NOTION_TOKEN")
    database_id = os.getenv("NOTION_DATABASE_ID")

    if not notion_token or not database_id:
        raise ValueError("Missing NOTION_TOKEN or NOTION_DATABASE_ID in environment")

    notion = NotionClient(auth=notion_token)
    users = []
    has_more = True
    start_cursor = None

    while has_more:
        try:
            response = notion.databases.query(
                database_id=database_id,
                start_cursor=start_cursor,
                page_size=100,
                filter={
                    "property": "Email",
                    "email": {"is_not_empty": True},
                },
            )

            # Process results
            for page in response["results"]:
                props = page["properties"]
                email_prop = props.get("Email", {})
                email = email_prop.get("email")

                if email:
                    # Extract name fields
                    first_name = ""
                    last_name = ""
                    name = ""

                    if "First Name" in props:
                        first_name_data = props["First Name"].get("rich_text", [])
                        if first_name_data:
                            first_name = first_name_data[0]["text"]["content"]

                    if "Last Name" in props:
                        last_name_data = props["Last Name"].get("rich_text", [])
                        if last_name_data:
                            last_name = last_name_data[0]["text"]["content"]

                    if "Name" in props:
                        name_data = props["Name"].get("title", [])
                        if name_data:
                            name = name_data[0]["text"]["content"]

                    # Construct user object
                    users.append(
                        {
                            "id": page["id"],
                            "email": email.lower(),
                            "firstName": (
                                first_name or name.split()[0]
                                if name
                                else email.split("@")[0]
                            ),
                            "lastName": last_name or "",
                            "name": name
                            or f"{first_name} {last_name}".strip()
                            or email.split("@")[0],
                        }
                    )

            has_more = response.get("has_more", False)
            start_cursor = response.get("next_cursor")

        except Exception as e:
            print(f"❌ Error fetching users from Notion: {e}")
            raise

    print(f"✅ Found {len(users)} registered users")
    return users


def load_json_file(filepath):
    """Load JSON file, return empty list/dict if not found"""
    try:
        with open(filepath, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return [] if "emails" in str(filepath) else {}
    except json.JSONDecodeError:
        print(f"⚠️ Warning: {filepath} is corrupted, starting fresh")
        return [] if "emails" in str(filepath) else {}


def save_json_file(filepath, data):
    """Save data to JSON file"""
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)


def compile_mjml_template(user_email):
    """Compile MJML template with user email interpolation"""
    try:
        # Read MJML template
        with open(MJML_TEMPLATE_FILE, "r") as f:
            mjml_content = f.read()

        # Replace user_email placeholder
        mjml_content = mjml_content.replace("{{user_email}}", user_email)

        # Compile MJML to HTML using subprocess
        result = subprocess.run(
            ["npx", "mjml", "-i", "-s"],
            input=mjml_content,
            capture_output=True,
            text=True,
            check=True,
        )

        return result.stdout

    except subprocess.CalledProcessError as e:
        print(f"❌ MJML compilation failed: {e.stderr}")
        raise
    except FileNotFoundError:
        print("❌ MJML template file not found or npx/mjml not installed")
        raise


def send_email(to_email, html_content, smtp_server, gmail_user, gmail_password):
    """Send email via SMTP"""
    try:
        # Create message
        msg = MIMEMultipart("alternative")
        msg["From"] = gmail_user
        msg["To"] = to_email
        msg["Subject"] = CONFIG["EMAIL_SUBJECT"]

        # Add HTML content
        html_part = MIMEText(html_content, "html")
        msg.attach(html_part)

        # Send email
        smtp_server.send_message(msg)
        return True, None

    except Exception as e:
        return False, str(e)


def run_hans_solo(gmail_user):
    """Hans Solo mode - send single test email to kai@oceanheart.ai"""
    print("🚀 Hans Solo Mode - Sending test email...\n")

    start_time = time.time()
    test_email = "engineering@nstcg.org"

    try:
        print(f"📧 Sending test email to: {test_email}")

        # Get Gmail password
        gmail_password = os.getenv("GMAIL_APP_PASSWORD")
        if not gmail_password:
            gmail_password = getpass.getpass(
                "Enter your Gmail App Password (16 characters): "
            )

        # Connect to SMTP
        print("🔧 Connecting to Gmail SMTP...")
        try:
            smtp_server = smtplib.SMTP("smtp.gmail.com", 587)
            smtp_server.starttls()
            smtp_server.login(gmail_user, gmail_password)
            print("✅ Connected to Gmail SMTP\n")
        except Exception as e:
            print(f"❌ Failed to connect to Gmail: {e}")
            print("\nMake sure you have:")
            print("1. Enabled 2-factor authentication")
            print("2. Generated an App Password (not your regular password)")
            print("3. Used the correct Gmail address")
            return

        # Compile MJML template with test email
        html_content = compile_mjml_template(test_email)

        # Send the email
        print(f"📧 Sending to {test_email}...", end=" ", flush=True)
        success, error = send_email(
            test_email,
            html_content,
            smtp_server,
            gmail_user,
            gmail_password,
        )

        if success:
            print("✅")
            print(f"✅ Test email sent successfully!")
            print(f"   To: {test_email}")
            print(f"   From: {gmail_user}")
            print(f"   Subject: {CONFIG['EMAIL_SUBJECT']}")
        else:
            print(f"❌ ({error})")
            print(f"❌ Failed to send test email: {error}")

        # Close SMTP connection
        smtp_server.quit()

        duration = time.time() - start_time
        print(f"\n⏱️  Duration: {duration:.1f} seconds")
        print("\n🎉 Hans Solo test completed!")

    except Exception as e:
        print(f"\n❌ Hans Solo test failed: {e}")
        sys.exit(1)


def main():
    args = parse_arguments()

    # Check for Hans Solo mode first
    if args.hans_solo:
        gmail_user = args.gmail_user or CONFIG["GMAIL_USER"]
        return run_hans_solo(gmail_user)

    # Set Gmail user
    gmail_user = args.gmail_user or CONFIG["GMAIL_USER"]

    print("🚀 Starting Email Activation Campaign...")
    print(f"Mode: {'DRY RUN' if args.dry_run else 'LIVE'}")
    print(f"Batch Size: {args.batch_size}")
    print(f"Resume: {'Yes' if args.resume else 'No'}\n")

    start_time = time.time()
    stats = {
        "total": 0,
        "sent": 0,
        "failed": 0,
        "skipped": 0,
    }

    try:
        # Fetch users from Notion
        users = fetch_users_from_notion()
        stats["total"] = len(users)

        if not users:
            print("❌ No users found to process")
            return

        # Load sent emails
        sent_emails = set(load_json_file(SENT_EMAILS_FILE))
        if sent_emails:
            print(f"📌 Found {len(sent_emails)} previously sent emails")

        # Filter out already sent emails
        filtered_users = [u for u in users if u["email"] not in sent_emails]
        stats["skipped"] = len(users) - len(filtered_users)

        print(
            f"📊 Filtering: {stats['skipped']} already sent, {len(filtered_users)} to process\n"
        )

        if not filtered_users:
            print("✅ All users have already received emails!")
            return

        # Get Gmail password
        gmail_password = os.getenv("GMAIL_APP_PASSWORD")
        if not gmail_password and not args.dry_run:
            gmail_password = getpass.getpass(
                "Enter your Gmail App Password (16 characters): "
            )

        # Connect to SMTP (skip in dry run)
        smtp_server = None
        if not args.dry_run:
            print("🔧 Connecting to Gmail SMTP...")
            try:
                smtp_server = smtplib.SMTP("smtp.gmail.com", 587)
                smtp_server.starttls()
                smtp_server.login(gmail_user, gmail_password)
                print("✅ Connected to Gmail SMTP\n")
            except Exception as e:
                print(f"❌ Failed to connect to Gmail: {e}")
                print("\nMake sure you have:")
                print("1. Enabled 2-factor authentication")
                print("2. Generated an App Password (not your regular password)")
                print("3. Used the correct Gmail address")
                return

        # Process users
        for i, user in enumerate(filtered_users):
            progress = f"[{i+1}/{len(filtered_users)}]"

            try:
                if args.dry_run:
                    print(f"📧 {progress} Would send to: {user['email']}")
                    stats["sent"] += 1
                else:
                    # Compile MJML with user email
                    html_content = compile_mjml_template(user["email"])

                    # Send email
                    print(
                        f"📧 {progress} Sending to {user['email']}...",
                        end=" ",
                        flush=True,
                    )
                    success, error = send_email(
                        user["email"],
                        html_content,
                        smtp_server,
                        gmail_user,
                        gmail_password,
                    )

                    if success:
                        print("✅")
                        stats["sent"] += 1

                        # Update sent emails file
                        sent_emails_list = load_json_file(SENT_EMAILS_FILE)
                        sent_emails_list.append(user["email"])
                        save_json_file(SENT_EMAILS_FILE, sent_emails_list)
                    else:
                        print(f"❌ ({error})")
                        stats["failed"] += 1

                        # Update failed emails file
                        failed_emails = load_json_file(FAILED_EMAILS_FILE)
                        failed_emails.append(
                            {
                                **user,
                                "error": error,
                                "timestamp": datetime.now().isoformat(),
                            }
                        )
                        save_json_file(FAILED_EMAILS_FILE, failed_emails)

                # Rate limiting
                if i < len(filtered_users) - 1:
                    time.sleep(CONFIG["RATE_LIMIT_MS"] / 1000)

            except KeyboardInterrupt:
                print("\n\n⚠️ Campaign interrupted by user")
                print("💡 Use --resume flag to continue from where you left off")
                break
            except Exception as e:
                print(f"❌ Error processing {user['email']}: {e}")
                stats["failed"] += 1

        # Close SMTP connection
        if smtp_server:
            smtp_server.quit()

        # Summary
        duration = time.time() - start_time
        print(f"\n{'='*50}")
        print("📊 Campaign Summary")
        print(f"{'='*50}")
        print(f"Mode: {'DRY RUN' if args.dry_run else 'LIVE'}")
        print(f"Total Users: {stats['total']}")
        print(f"Already Sent: {stats['skipped']}")
        print(f"Processed: {stats['sent'] + stats['failed']}")
        print(f"Successful: {stats['sent']}")
        print(f"Failed: {stats['failed']}")
        print(f"Duration: {duration/60:.1f} minutes")
        print(f"{'='*50}")
        print("\n🎉 Email campaign completed!")

    except Exception as e:
        print(f"\n❌ Campaign failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

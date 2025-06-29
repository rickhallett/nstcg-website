#!/usr/bin/env python3

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import getpass
import json
import os
import sys
import time
import argparse
from datetime import datetime
from pathlib import Path
import resend
import dotenv
import requests
import string
import random
from concurrent.futures import ThreadPoolExecutor, as_completed

# Load environment variables
dotenv.load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY")

from notion_client import Client as NotionClient
from interpolate_encourage_email import EmailLinkInterpolator


# Get script directory
SCRIPT_DIR = Path(__file__).parent.absolute()
PROJECT_ROOT = SCRIPT_DIR.parent

# File paths
SENT_EMAILS_FILE = PROJECT_ROOT / "scripts" / "sent-emails.json"
FAILED_EMAILS_FILE = PROJECT_ROOT / "scripts" / "failed-emails.json"

# Configuration
CONFIG = {
    "RATE_LIMIT_MS": 250,  # 250ms between emails (slow mode)
    "BATCH_SIZE": 100,  # Max emails per batch (fast mode)
    "MAX_WORKERS": 10,  # Thread pool size for HTML generation
    "BATCH_DELAY_MS": 100,  # Delay between batches (fast mode)
    "GMAIL_USER": "engineering@nstcg.org",  # Default sender email
    "EMAIL_SUBJECT": "Last call to Save Shore Road - North Swanage Traffic Concern Group (www.nstcg.org)",
    "SITE_URL": "https://nstcg.org",
    "API_URL": "https://nstcg.org/api",
}


def generate_referral_code(first_name="USER"):
    """Generate a referral code matching the website's format"""
    prefix = first_name[:3].upper() if first_name else "USR"
    timestamp = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    random_suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{prefix}{timestamp}{random_suffix}"


def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description="Send encourage emails to users from Notion database with personalized referral links",
        epilog="""
Examples:
  python auto_resend.py --dry-run              # Preview mode
  python auto_resend.py --batch-size=10        # Process 10 emails per batch
  python auto_resend.py --resume               # Resume previous run
  python auto_resend.py --hans-solo            # Send test email to kai@oceanheart.ai
  python auto_resend.py -hs                    # Same as --hans-solo
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

    # Speed mode arguments (mutually exclusive)
    speed_group = parser.add_mutually_exclusive_group()
    speed_group.add_argument(
        "--fast",
        action="store_true",
        help="Fast mode: Use batch API and multi-threading (up to 200 emails/second)",
    )
    speed_group.add_argument(
        "--slow",
        action="store_true",
        help="Slow mode: Sequential sending with 250ms delay (default)",
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
                    referral_code = ""

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

                    # Extract referral code
                    if "Referral Code" in props:
                        referral_code_data = props["Referral Code"].get("rich_text", [])
                        if referral_code_data:
                            referral_code = referral_code_data[0]["text"]["content"]

                    # Generate referral code if missing
                    if not referral_code:
                        display_name = (
                            first_name or name.split()[0]
                            if name
                            else email.split("@")[0]
                        )
                        referral_code = generate_referral_code(display_name)

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
                            "referralCode": referral_code,
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


def fetch_current_response_count():
    """Fetch current participant count from API"""
    try:
        response = requests.get(f"{CONFIG['API_URL']}/get-count", timeout=5)
        if response.status_code == 200:
            data = response.json()
            return data.get("count", 555)  # Default to 555 if not found
        return 555
    except:
        return 555  # Default fallback


def generate_encourage_email(user):
    """Generate personalized encourage email HTML"""
    try:
        # Initialize interpolator
        interpolator = EmailLinkInterpolator()

        # Get current response count (cached for performance)
        if not hasattr(generate_encourage_email, "response_count"):
            generate_encourage_email.response_count = fetch_current_response_count()

        # Calculate hours remaining (assuming midnight deadline)
        now = datetime.now()
        midnight = now.replace(hour=23, minute=59, second=59)
        hours_remaining = int((midnight - now).total_seconds() / 3600)

        # Prepare user data for interpolation
        user_data = {
            "referral_code": user["referralCode"],
            "name": user["name"],
            "email": user["email"],
            "response_count": generate_encourage_email.response_count,
            "target_count": 1000,
            "hours_remaining": max(1, hours_remaining),  # At least 1 hour
            "custom_share_text": "The closing of Shore Road in Swanage will have impacts on traffic, tourists and residents for years to come. The survey closes midnight tonight!",
        }

        # Generate interpolated HTML
        return interpolator.interpolate(user_data)

    except Exception as e:
        print(f"❌ Email generation failed: {e}")
        raise


def send_email(to_email, html_content, smtp_server, gmail_user, gmail_password):
    """Send email via SMTP"""
    try:
        params: resend.Emails.SendParams = {
            "from": "North Swanage Traffic Concern Group <engineering@nstcg.org>",
            "to": [to_email],
            "subject": CONFIG["EMAIL_SUBJECT"],
            "html": html_content,
        }

        email = resend.Emails.send(params)
        print(email)

        return True, None

    except Exception as e:
        return False, str(e)


def send_batch_emails(batch_data):
    """
    Send multiple emails using Resend batch API

    Args:
        batch_data: List of dicts with 'email' and 'html_content' keys

    Returns:
        List of tuples (email, success, error_msg)
    """
    try:
        # Prepare batch request
        batch_params = []
        for item in batch_data:
            params = {
                "from": "North Swanage Traffic Concern Group <engineering@nstcg.org>",
                "to": [item["email"]],
                "subject": CONFIG["EMAIL_SUBJECT"],
                "html": item["html_content"],
            }
            batch_params.append(params)

        # Send batch
        response = resend.Batch.send(batch_params)

        # Process results
        results = []
        for i, item in enumerate(batch_data):
            # Resend batch API returns individual results
            # Check if this email succeeded
            success = True  # Assume success unless we have error info
            error_msg = None

            results.append((item["email"], success, error_msg))

        return results

    except Exception as e:
        # If batch fails, return all as failed
        return [(item["email"], False, str(e)) for item in batch_data]


def generate_html_batch(users):
    """
    Generate HTML for multiple users in parallel using thread pool

    Args:
        users: List of user dicts

    Returns:
        Dict mapping email to HTML content
    """
    html_map = {}

    def generate_for_user(user):
        try:
            html = generate_encourage_email(user)
            return user["email"], html, None
        except Exception as e:
            return user["email"], None, str(e)

    # Use thread pool for parallel generation
    with ThreadPoolExecutor(max_workers=CONFIG["MAX_WORKERS"]) as executor:
        # Submit all tasks
        futures = [executor.submit(generate_for_user, user) for user in users]

        # Collect results
        for future in as_completed(futures):
            email, html, error = future.result()
            if html:
                html_map[email] = html
            else:
                print(f"⚠️ Failed to generate HTML for {email}: {error}")

    return html_map


def run_hans_solo(gmail_user):
    """Hans Solo mode - send single test email to kai@oceanheart.ai"""
    print("🚀 Hans Solo Mode - Sending test email...\n")

    start_time = time.time()
    test_email = "kai@oceanheart.ai"

    try:
        print(f"📧 Sending test email to: {test_email}")

        # Create test user object
        test_user = {
            "id": "test-user",
            "email": test_email,
            "firstName": "Kai",
            "lastName": "Test",
            "name": "Kai Test",
            "referralCode": "KAITEST1234",
        }

        # Generate personalized email
        html_content = generate_encourage_email(test_user)

        # Send the email
        print(f"📧 Sending to {test_email}...", end=" ", flush=True)
        success, error = send_email(
            test_email,
            html_content,
            None,  # SMTP server not used with Resend
            gmail_user,
            None,  # Password not used with Resend
        )

        if success:
            print("✅")
            print(f"✅ Test email sent successfully!")
            print(f"   To: {test_email}")
            print(f"   From: {gmail_user}")
            print(f"   Subject: {CONFIG['EMAIL_SUBJECT']}")
            print(f"   Referral Code: {test_user['referralCode']}")
        else:
            print(f"❌ ({error})")
            print(f"❌ Failed to send test email: {error}")

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

    # Determine mode (default to slow if not specified)
    mode = "fast" if args.fast else "slow"

    print("🚀 Starting Encourage Email Campaign with Personalized Referral Links...")
    print(f"Mode: {'DRY RUN' if args.dry_run else 'LIVE'} - {mode.upper()} mode")
    if mode == "slow":
        print(f"Batch Size: {args.batch_size}")
    else:
        print(f"Batch Size: {CONFIG['BATCH_SIZE']} (fast mode)")
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

        # Note: Using Resend API, so no SMTP connection needed
        if not args.dry_run:
            print("🔧 Using Resend API for email delivery")
            if not resend.api_key:
                print("❌ RESEND_API_KEY not found in environment")
                return
            print("✅ Resend API configured\n")

        # Process users based on mode
        if mode == "fast":
            # Fast mode: batch processing with multi-threading
            try:
                batch_stats = process_emails_fast(filtered_users, sent_emails, args)
                stats["sent"] = batch_stats["sent"]
                stats["failed"] = batch_stats["failed"]
            except KeyboardInterrupt:
                print("\n\n⚠️ Campaign interrupted by user")
                print("💡 Use --resume flag to continue from where you left off")
        else:
            # Slow mode: sequential processing (original implementation)
            for i, user in enumerate(filtered_users):
                progress = f"[{i+1}/{len(filtered_users)}]"

                try:
                    if args.dry_run:
                        print(f"📧 {progress} Would send to: {user['email']}")
                        stats["sent"] += 1
                    else:
                        # Generate personalized email
                        html_content = generate_encourage_email(user)

                        # Send email
                        print(
                            f"📧 {progress} Sending to {user['email']} (ref: {user['referralCode'][:8]}...)...",
                            end=" ",
                            flush=True,
                        )
                        success, error = send_email(
                            user["email"],
                            html_content,
                            None,  # SMTP server not used with Resend
                            gmail_user,
                            None,  # Password not used with Resend
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

        # No SMTP connection to close when using Resend

        # Summary
        duration = time.time() - start_time
        print(f"\n{'='*50}")
        print("📊 Campaign Summary")
        print(f"{'='*50}")
        print(f"Mode: {'DRY RUN' if args.dry_run else 'LIVE'} - {mode.upper()}")
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


def process_emails_fast(filtered_users, sent_emails, args):
    """
    Process emails in fast mode using batch API and multi-threading

    Returns:
        stats dict with sent/failed counts
    """
    stats = {"sent": 0, "failed": 0}
    total_users = len(filtered_users)

    print("🚀 Fast mode: Using batch API and multi-threading")
    print(f"📊 Processing {total_users} emails in batches of {CONFIG['BATCH_SIZE']}\n")

    # Process users in batches
    for batch_start in range(0, total_users, CONFIG["BATCH_SIZE"]):
        batch_end = min(batch_start + CONFIG["BATCH_SIZE"], total_users)
        batch_users = filtered_users[batch_start:batch_end]
        batch_num = (batch_start // CONFIG["BATCH_SIZE"]) + 1
        total_batches = (total_users + CONFIG["BATCH_SIZE"] - 1) // CONFIG["BATCH_SIZE"]

        print(
            f"📦 Processing batch {batch_num}/{total_batches} ({len(batch_users)} emails)..."
        )

        if args.dry_run:
            # Dry run mode
            for user in batch_users:
                print(
                    f"   📧 Would send to: {user['email']} (ref: {user['referralCode'][:8]}...)"
                )
            stats["sent"] += len(batch_users)
        else:
            # Generate HTML for batch in parallel
            print("   🔧 Generating HTML content...")
            html_map = generate_html_batch(batch_users)

            # Prepare batch data
            batch_data = []
            for user in batch_users:
                if user["email"] in html_map:
                    batch_data.append(
                        {
                            "email": user["email"],
                            "html_content": html_map[user["email"]],
                            "user": user,
                        }
                    )
                else:
                    # HTML generation failed
                    stats["failed"] += 1
                    failed_emails = load_json_file(FAILED_EMAILS_FILE)
                    failed_emails.append(
                        {
                            **user,
                            "error": "HTML generation failed",
                            "timestamp": datetime.now().isoformat(),
                        }
                    )
                    save_json_file(FAILED_EMAILS_FILE, failed_emails)

            if batch_data:
                # Send batch
                print(f"   📤 Sending {len(batch_data)} emails...")
                results = send_batch_emails(batch_data)

                # Process results
                sent_emails_list = load_json_file(SENT_EMAILS_FILE)
                failed_emails = load_json_file(FAILED_EMAILS_FILE)

                for email, success, error in results:
                    if success:
                        stats["sent"] += 1
                        sent_emails_list.append(email)
                        print(f"   ✅ {email}")
                    else:
                        stats["failed"] += 1
                        # Find user data
                        user_data = next(
                            item["user"]
                            for item in batch_data
                            if item["email"] == email
                        )
                        failed_emails.append(
                            {
                                **user_data,
                                "error": error or "Unknown error",
                                "timestamp": datetime.now().isoformat(),
                            }
                        )
                        print(f"   ❌ {email} - {error}")

                # Save updated files
                save_json_file(SENT_EMAILS_FILE, sent_emails_list)
                save_json_file(FAILED_EMAILS_FILE, failed_emails)

        # Delay between batches (except for last batch)
        if batch_end < total_users and not args.dry_run:
            time.sleep(CONFIG["BATCH_DELAY_MS"] / 1000)

    return stats


if __name__ == "__main__":
    main()

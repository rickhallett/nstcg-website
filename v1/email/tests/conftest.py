"""
Shared fixtures and configuration for auto_smtp.py tests
"""

import os
import json
import pytest
import tempfile
from pathlib import Path
from unittest.mock import Mock, MagicMock, patch
from datetime import datetime
from faker import Faker

# Initialize faker for test data generation
fake = Faker()


@pytest.fixture(autouse=True)
def reset_environment(monkeypatch):
    """Reset environment variables for each test"""
    # Clear any existing env vars
    monkeypatch.delenv("NOTION_TOKEN", raising=False)
    monkeypatch.delenv("NOTION_DATABASE_ID", raising=False)
    monkeypatch.delenv("GMAIL_APP_PASSWORD", raising=False)
    
    # Set test environment variables
    monkeypatch.setenv("NOTION_TOKEN", "test-notion-token")
    monkeypatch.setenv("NOTION_DATABASE_ID", "test-database-id")
    monkeypatch.setenv("GMAIL_APP_PASSWORD", "test-gmail-password")


@pytest.fixture
def temp_files(tmp_path):
    """Create temporary JSON files for testing"""
    sent_file = tmp_path / "sent-emails.json"
    failed_file = tmp_path / "failed-emails.json"
    
    # Initialize with empty arrays
    sent_file.write_text("[]")
    failed_file.write_text("[]")
    
    return {
        "sent": sent_file,
        "failed": failed_file,
        "dir": tmp_path
    }


@pytest.fixture
def sample_users():
    """Generate sample user data"""
    return [
        {
            "id": "user-1",
            "email": "john.doe@example.com",
            "firstName": "John",
            "lastName": "Doe",
            "name": "John Doe"
        },
        {
            "id": "user-2",
            "email": "jane.smith@example.com",
            "firstName": "Jane",
            "lastName": "Smith",
            "name": "Jane Smith"
        },
        {
            "id": "user-3",
            "email": "bob@example.com",
            "firstName": "Bob",
            "lastName": "",
            "name": "Bob"
        },
        {
            "id": "user-4",
            "email": "alice.wong@example.com",
            "firstName": "Alice",
            "lastName": "Wong",
            "name": "Alice Wong"
        },
        {
            "id": "user-5",
            "email": "test.user@example.com",
            "firstName": "",
            "lastName": "",
            "name": "test.user"
        }
    ]


@pytest.fixture
def large_user_list():
    """Generate a large list of users for performance testing"""
    users = []
    for i in range(1000):
        email = fake.email()
        first_name = fake.first_name()
        last_name = fake.last_name()
        users.append({
            "id": f"user-{i}",
            "email": email.lower(),
            "firstName": first_name,
            "lastName": last_name,
            "name": f"{first_name} {last_name}"
        })
    return users


@pytest.fixture
def mock_notion_response(sample_users):
    """Mock Notion API response"""
    return {
        "results": [
            {
                "id": user["id"],
                "properties": {
                    "Email": {"email": user["email"]},
                    "First Name": {"rich_text": [{"text": {"content": user["firstName"]}}] if user["firstName"] else []},
                    "Last Name": {"rich_text": [{"text": {"content": user["lastName"]}}] if user["lastName"] else []},
                    "Name": {"title": [{"text": {"content": user["name"]}}]}
                }
            }
            for user in sample_users
        ],
        "has_more": False,
        "next_cursor": None
    }


@pytest.fixture
def mock_notion_client(mocker, mock_notion_response):
    """Mock Notion client"""
    mock_client = Mock()
    mock_client.databases.query = Mock(return_value=mock_notion_response)
    
    # Patch the NotionClient class
    mocker.patch("auto_smtp.NotionClient", return_value=mock_client)
    
    return mock_client


@pytest.fixture
def mock_smtp_server(mocker):
    """Mock SMTP server"""
    mock_smtp = MagicMock()
    mock_server_instance = MagicMock()
    
    # Configure the mock
    mock_smtp.return_value = mock_server_instance
    mock_server_instance.starttls = MagicMock()
    mock_server_instance.login = MagicMock()
    mock_server_instance.send_message = MagicMock()
    mock_server_instance.quit = MagicMock()
    
    # Patch smtplib.SMTP
    mocker.patch("smtplib.SMTP", mock_smtp)
    
    return mock_server_instance


@pytest.fixture
def mock_subprocess_mjml(mocker):
    """Mock subprocess for MJML compilation"""
    def mock_mjml_run(*args, **kwargs):
        mock_result = Mock()
        # Extract email from the input text if available
        input_text = kwargs.get('input', '')
        if 'user+tag@example.com' in input_text:
            email = 'user+tag@example.com'
        else:
            email = 'test@example.com'
            
        mock_result.stdout = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Test Email</title>
    </head>
    <body>
        <h1>Activation Email</h1>
        <p>Click here to activate: https://nstcg.org/?user_email={email}&bonus=75</p>
    </body>
    </html>
    """
        return mock_result
    
    mocker.patch("subprocess.run", side_effect=mock_mjml_run)
    return Mock()  # Return a mock for reference


@pytest.fixture
def mjml_template_content():
    """Sample MJML template content"""
    return """
    <mjml>
        <mj-body>
            <mj-section>
                <mj-column>
                    <mj-text>Test email for {{user_email}}</mj-text>
                    <mj-button href="https://nstcg.org/?user_email={{user_email}}&bonus=75">
                        Activate Now
                    </mj-button>
                </mj-column>
            </mj-section>
        </mj-body>
    </mjml>
    """


@pytest.fixture
def create_mjml_template(tmp_path, mjml_template_content):
    """Create a temporary MJML template file"""
    template_file = tmp_path / "activate.mjml"
    template_file.write_text(mjml_template_content)
    return template_file


@pytest.fixture
def sent_emails_data():
    """Sample sent emails data"""
    return [
        "already.sent@example.com",
        "another.sent@example.com",
        "third.sent@example.com"
    ]


@pytest.fixture
def failed_emails_data():
    """Sample failed emails data"""
    return [
        {
            "id": "fail-1",
            "email": "failed@example.com",
            "firstName": "Failed",
            "lastName": "User",
            "name": "Failed User",
            "error": "Invalid recipient",
            "timestamp": "2025-06-28T12:00:00"
        }
    ]


@pytest.fixture
def mock_datetime(mocker):
    """Mock datetime for consistent timestamps"""
    mock_dt = mocker.patch("auto_smtp.datetime")
    mock_dt.now.return_value.isoformat.return_value = "2025-06-28T15:30:00"
    mock_dt.now.return_value.strftime.return_value = "June 28, 2025"
    return mock_dt


@pytest.fixture
def mock_time(mocker):
    """Mock time.sleep to speed up tests"""
    return mocker.patch("time.sleep")


@pytest.fixture
def cli_args():
    """Common CLI argument combinations"""
    return {
        "default": ["auto_smtp.py"],
        "dry_run": ["auto_smtp.py", "--dry-run"],
        "resume": ["auto_smtp.py", "--resume"],
        "batch_small": ["auto_smtp.py", "--batch-size", "10"],
        "custom_gmail": ["auto_smtp.py", "--gmail-user", "custom@gmail.com"]
    }


@pytest.fixture(autouse=True)
def cleanup_files():
    """Ensure test files are cleaned up"""
    yield
    # Cleanup happens automatically with tmp_path fixture


@pytest.fixture
def capture_print(mocker):
    """Capture print statements for testing"""
    printed = []
    
    def mock_print(*args, **kwargs):
        printed.append(" ".join(str(arg) for arg in args))
    
    mocker.patch("builtins.print", side_effect=mock_print)
    return printed


@pytest.fixture
def mock_getpass(mocker):
    """Mock getpass for password input"""
    return mocker.patch("getpass.getpass", return_value="test-password-123")
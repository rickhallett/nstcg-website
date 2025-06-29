"""
Comprehensive unit tests for auto_smtp.py
"""

import pytest
import json
import sys
import subprocess
from pathlib import Path
from unittest.mock import Mock, MagicMock, patch, call
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import auto_smtp
from tests.fixtures.email_data import (
    VALID_USERS, EDGE_CASE_EMAILS, INVALID_EMAILS,
    INCOMPLETE_USERS, UNICODE_USERS, ALREADY_SENT_EMAILS
)
from tests.fixtures.mjml_templates import (
    BASIC_MJML_TEMPLATE, EXPECTED_HTML_OUTPUT,
    INVALID_MJML_TEMPLATE, SPECIAL_CHARS_TEMPLATE
)
from tests.fixtures.notion_responses import (
    get_single_page_response, get_empty_response,
    get_malformed_response, ERROR_RESPONSES
)


class TestArgumentParsing:
    """Test command-line argument parsing"""
    
    def test_default_arguments(self):
        """Test default argument values"""
        with patch.object(sys, 'argv', ['auto_smtp.py']):
            args = auto_smtp.parse_arguments()
            assert args.dry_run is False
            assert args.resume is False
            assert args.batch_size == 50
            assert args.gmail_user is None
    
    def test_dry_run_flag(self):
        """Test --dry-run flag"""
        with patch.object(sys, 'argv', ['auto_smtp.py', '--dry-run']):
            args = auto_smtp.parse_arguments()
            assert args.dry_run is True
    
    def test_resume_flag(self):
        """Test --resume flag"""
        with patch.object(sys, 'argv', ['auto_smtp.py', '--resume']):
            args = auto_smtp.parse_arguments()
            assert args.resume is True
    
    def test_batch_size_argument(self):
        """Test --batch-size argument"""
        with patch.object(sys, 'argv', ['auto_smtp.py', '--batch-size', '25']):
            args = auto_smtp.parse_arguments()
            assert args.batch_size == 25
    
    def test_gmail_user_argument(self):
        """Test --gmail-user argument"""
        with patch.object(sys, 'argv', ['auto_smtp.py', '--gmail-user', 'test@gmail.com']):
            args = auto_smtp.parse_arguments()
            assert args.gmail_user == 'test@gmail.com'
    
    def test_multiple_arguments(self):
        """Test multiple arguments together"""
        with patch.object(sys, 'argv', [
            'auto_smtp.py', '--dry-run', '--resume', 
            '--batch-size', '10', '--gmail-user', 'custom@gmail.com'
        ]):
            args = auto_smtp.parse_arguments()
            assert args.dry_run is True
            assert args.resume is True
            assert args.batch_size == 10
            assert args.gmail_user == 'custom@gmail.com'


class TestNotionIntegration:
    """Test Notion API integration"""
    
    @pytest.mark.unit
    def test_fetch_users_success(self, mock_notion_client, sample_users):
        """Test successful user fetching from Notion"""
        users = auto_smtp.fetch_users_from_notion()
        
        assert len(users) == len(sample_users)
        assert users[0]['email'] == sample_users[0]['email']
        assert users[0]['firstName'] == sample_users[0]['firstName']
        mock_notion_client.databases.query.assert_called_once()
    
    @pytest.mark.unit
    def test_fetch_users_empty_database(self, mocker):
        """Test fetching from empty database"""
        mock_client = Mock()
        mock_client.databases.query = Mock(return_value=get_empty_response())
        mocker.patch("auto_smtp.NotionClient", return_value=mock_client)
        
        users = auto_smtp.fetch_users_from_notion()
        assert users == []
    
    @pytest.mark.unit
    def test_fetch_users_pagination(self, mocker):
        """Test pagination handling"""
        # Create mock responses for pagination
        page1_response = {
            "results": [
                {
                    "id": "user-1",
                    "properties": {
                        "Email": {"email": "user1@example.com"},
                        "First Name": {"rich_text": [{"text": {"content": "User1"}}]},
                        "Last Name": {"rich_text": []},
                        "Name": {"title": [{"text": {"content": "User1"}}]}
                    }
                }
            ],
            "has_more": True,
            "next_cursor": "cursor-1"
        }
        
        page2_response = {
            "results": [
                {
                    "id": "user-2",
                    "properties": {
                        "Email": {"email": "user2@example.com"},
                        "First Name": {"rich_text": [{"text": {"content": "User2"}}]},
                        "Last Name": {"rich_text": []},
                        "Name": {"title": [{"text": {"content": "User2"}}]}
                    }
                }
            ],
            "has_more": False,
            "next_cursor": None
        }
        
        mock_client = Mock()
        mock_client.databases.query = Mock(side_effect=[page1_response, page2_response])
        mocker.patch("auto_smtp.NotionClient", return_value=mock_client)
        
        users = auto_smtp.fetch_users_from_notion()
        assert len(users) == 2
        assert mock_client.databases.query.call_count == 2
    
    @pytest.mark.unit
    def test_fetch_users_missing_env_vars(self, mocker):
        """Test handling of missing environment variables"""
        mocker.patch.dict('os.environ', {}, clear=True)
        
        with pytest.raises(ValueError, match="Missing NOTION_TOKEN"):
            auto_smtp.fetch_users_from_notion()
    
    @pytest.mark.unit
    def test_fetch_users_malformed_response(self, mocker):
        """Test handling of malformed Notion response"""
        mock_client = Mock()
        mock_client.databases.query = Mock(return_value=get_malformed_response())
        mocker.patch("auto_smtp.NotionClient", return_value=mock_client)
        
        users = auto_smtp.fetch_users_from_notion()
        # Should skip malformed entries but not crash
        assert len(users) == 1  # Only one valid user
        assert users[0]['email'] == 'test@example.com'
    
    @pytest.mark.unit
    def test_fetch_users_api_error(self, mocker):
        """Test handling of Notion API errors"""
        mock_client = Mock()
        mock_client.databases.query = Mock(
            side_effect=Exception("Notion API Error")
        )
        mocker.patch("auto_smtp.NotionClient", return_value=mock_client)
        
        with pytest.raises(Exception, match="Notion API Error"):
            auto_smtp.fetch_users_from_notion()


class TestFileOperations:
    """Test JSON file operations"""
    
    @pytest.mark.unit
    def test_load_json_file_exists(self, temp_files):
        """Test loading existing JSON file"""
        test_data = ["email1@test.com", "email2@test.com"]
        temp_files['sent'].write_text(json.dumps(test_data))
        
        loaded = auto_smtp.load_json_file(temp_files['sent'])
        assert loaded == test_data
    
    @pytest.mark.unit
    def test_load_json_file_not_exists(self, temp_files):
        """Test loading non-existent file"""
        # Test email file - should return []
        non_existent_emails = temp_files['dir'] / "non-existent-emails.json"
        loaded = auto_smtp.load_json_file(non_existent_emails)
        assert loaded == []
        
        # Test non-email file - should return {}
        non_existent_other = temp_files['dir'] / "non-existent.json"
        loaded = auto_smtp.load_json_file(non_existent_other)
        assert loaded == {}
    
    @pytest.mark.unit
    def test_load_json_file_corrupted(self, temp_files, capsys):
        """Test loading corrupted JSON file"""
        temp_files['sent'].write_text("{ invalid json")
        
        loaded = auto_smtp.load_json_file(temp_files['sent'])
        assert loaded == []
        
        # Check warning was printed
        captured = capsys.readouterr()
        assert "corrupted" in captured.out
    
    @pytest.mark.unit
    def test_save_json_file(self, temp_files):
        """Test saving JSON file"""
        test_data = ["email1@test.com", "email2@test.com"]
        auto_smtp.save_json_file(temp_files['sent'], test_data)
        
        # Verify file contents
        saved_data = json.loads(temp_files['sent'].read_text())
        assert saved_data == test_data
    
    @pytest.mark.unit
    def test_save_json_file_pretty_print(self, temp_files):
        """Test JSON is pretty-printed"""
        test_data = {"key": "value"}
        auto_smtp.save_json_file(temp_files['sent'], test_data)
        
        content = temp_files['sent'].read_text()
        assert "  " in content  # Check for indentation


class TestMJMLCompilation:
    """Test MJML template compilation"""
    
    @pytest.mark.unit
    def test_compile_mjml_success(self, create_mjml_template, mock_subprocess_mjml):
        """Test successful MJML compilation"""
        # Override auto_smtp paths for test
        original_mjml_file = auto_smtp.MJML_TEMPLATE_FILE
        auto_smtp.MJML_TEMPLATE_FILE = create_mjml_template
        
        try:
            html = auto_smtp.compile_mjml_template("test@example.com")
            assert "test@example.com" in html
            assert "https://nstcg.org/?user_email=test@example.com" in html
        finally:
            auto_smtp.MJML_TEMPLATE_FILE = original_mjml_file
    
    @pytest.mark.unit
    def test_compile_mjml_placeholder_replacement(self, create_mjml_template, mock_subprocess_mjml):
        """Test email placeholder replacement"""
        original_mjml_file = auto_smtp.MJML_TEMPLATE_FILE
        auto_smtp.MJML_TEMPLATE_FILE = create_mjml_template
        
        try:
            # Test with special characters
            special_email = "user+tag@example.com"
            html = auto_smtp.compile_mjml_template(special_email)
            assert special_email in html
            assert f"user_email={special_email}" in html
        finally:
            auto_smtp.MJML_TEMPLATE_FILE = original_mjml_file
    
    @pytest.mark.unit
    def test_compile_mjml_command_not_found(self, create_mjml_template, mocker):
        """Test handling of missing MJML command"""
        mocker.patch("subprocess.run", side_effect=FileNotFoundError())
        
        original_mjml_file = auto_smtp.MJML_TEMPLATE_FILE
        auto_smtp.MJML_TEMPLATE_FILE = create_mjml_template
        
        try:
            with pytest.raises(FileNotFoundError):
                auto_smtp.compile_mjml_template("test@example.com")
        finally:
            auto_smtp.MJML_TEMPLATE_FILE = original_mjml_file
    
    @pytest.mark.unit
    def test_compile_mjml_compilation_error(self, create_mjml_template, mocker):
        """Test handling of MJML compilation errors"""
        mock_result = Mock()
        mock_result.stderr = "MJML validation error"
        mocker.patch("subprocess.run", 
                    side_effect=subprocess.CalledProcessError(1, 'mjml', stderr=mock_result.stderr))
        
        original_mjml_file = auto_smtp.MJML_TEMPLATE_FILE
        auto_smtp.MJML_TEMPLATE_FILE = create_mjml_template
        
        try:
            with pytest.raises(subprocess.CalledProcessError):
                auto_smtp.compile_mjml_template("test@example.com")
        finally:
            auto_smtp.MJML_TEMPLATE_FILE = original_mjml_file
    
    @pytest.mark.unit
    def test_compile_mjml_template_not_found(self, mocker):
        """Test handling of missing template file"""
        original_mjml_file = auto_smtp.MJML_TEMPLATE_FILE
        auto_smtp.MJML_TEMPLATE_FILE = Path("/non/existent/template.mjml")
        
        try:
            with pytest.raises(FileNotFoundError):
                auto_smtp.compile_mjml_template("test@example.com")
        finally:
            auto_smtp.MJML_TEMPLATE_FILE = original_mjml_file


class TestEmailSending:
    """Test email sending functionality"""
    
    @pytest.mark.unit
    def test_send_email_success(self, mock_smtp_server):
        """Test successful email send"""
        html_content = "<html><body>Test</body></html>"
        
        success, error = auto_smtp.send_email(
            "test@example.com", 
            html_content, 
            mock_smtp_server,
            "sender@gmail.com",
            "password"
        )
        
        assert success is True
        assert error is None
        mock_smtp_server.send_message.assert_called_once()
    
    @pytest.mark.unit
    def test_send_email_failure(self, mock_smtp_server):
        """Test email send failure"""
        mock_smtp_server.send_message.side_effect = Exception("SMTP Error")
        
        success, error = auto_smtp.send_email(
            "test@example.com",
            "<html></html>",
            mock_smtp_server,
            "sender@gmail.com",
            "password"
        )
        
        assert success is False
        assert error == "SMTP Error"
    
    @pytest.mark.unit
    def test_send_email_message_structure(self, mock_smtp_server):
        """Test email message structure"""
        html_content = "<html><body>Test</body></html>"
        
        auto_smtp.send_email(
            "recipient@example.com",
            html_content,
            mock_smtp_server,
            "sender@gmail.com",
            "password"
        )
        
        # Get the message that was sent
        call_args = mock_smtp_server.send_message.call_args
        msg = call_args[0][0]
        
        assert msg['From'] == "sender@gmail.com"
        assert msg['To'] == "recipient@example.com"
        assert msg['Subject'] == auto_smtp.CONFIG['EMAIL_SUBJECT']


class TestMainFunction:
    """Test main campaign function"""
    
    @pytest.mark.unit
    def test_main_dry_run(self, mocker, sample_users, temp_files, capture_print):
        """Test dry run mode"""
        # Mock command line args
        mocker.patch.object(sys, 'argv', ['auto_smtp.py', '--dry-run'])
        
        # Mock file paths
        mocker.patch.object(auto_smtp, 'SENT_EMAILS_FILE', temp_files['sent'])
        mocker.patch.object(auto_smtp, 'FAILED_EMAILS_FILE', temp_files['failed'])
        
        # Mock Notion
        mock_client = Mock()
        mock_client.databases.query = Mock(return_value=get_single_page_response(sample_users))
        mocker.patch("auto_smtp.NotionClient", return_value=mock_client)
        
        # Run main
        auto_smtp.main()
        
        # Verify dry run behavior
        assert "DRY RUN" in " ".join(capture_print)
        assert "Would send to:" in " ".join(capture_print)
        
        # Verify no actual sends
        assert temp_files['sent'].read_text() == "[]"
    
    @pytest.mark.unit
    def test_main_no_users(self, mocker, temp_files, capture_print):
        """Test handling of no users found"""
        mocker.patch.object(sys, 'argv', ['auto_smtp.py'])
        mocker.patch.object(auto_smtp, 'SENT_EMAILS_FILE', temp_files['sent'])
        mocker.patch.object(auto_smtp, 'FAILED_EMAILS_FILE', temp_files['failed'])
        
        # Mock empty Notion response
        mock_client = Mock()
        mock_client.databases.query = Mock(return_value=get_empty_response())
        mocker.patch("auto_smtp.NotionClient", return_value=mock_client)
        
        auto_smtp.main()
        
        assert "No users found to process" in " ".join(capture_print)
    
    @pytest.mark.unit
    def test_main_all_already_sent(self, mocker, sample_users, temp_files, capture_print):
        """Test when all users have already received emails"""
        mocker.patch.object(sys, 'argv', ['auto_smtp.py'])
        mocker.patch.object(auto_smtp, 'SENT_EMAILS_FILE', temp_files['sent'])
        mocker.patch.object(auto_smtp, 'FAILED_EMAILS_FILE', temp_files['failed'])
        
        # Pre-populate sent emails with all users
        sent_emails = [user['email'] for user in sample_users]
        temp_files['sent'].write_text(json.dumps(sent_emails))
        
        # Mock Notion
        mock_client = Mock()
        mock_client.databases.query = Mock(return_value=get_single_page_response(sample_users))
        mocker.patch("auto_smtp.NotionClient", return_value=mock_client)
        
        auto_smtp.main()
        
        assert "All users have already received emails!" in " ".join(capture_print)
    
    @pytest.mark.unit
    def test_main_smtp_connection_failure(self, mocker, sample_users, temp_files, capture_print):
        """Test SMTP connection failure"""
        mocker.patch.object(sys, 'argv', ['auto_smtp.py'])
        mocker.patch.object(auto_smtp, 'SENT_EMAILS_FILE', temp_files['sent'])
        mocker.patch.object(auto_smtp, 'FAILED_EMAILS_FILE', temp_files['failed'])
        
        # Mock Notion
        mock_client = Mock()
        mock_client.databases.query = Mock(return_value=get_single_page_response(sample_users))
        mocker.patch("auto_smtp.NotionClient", return_value=mock_client)
        
        # Mock SMTP failure
        mocker.patch("smtplib.SMTP", side_effect=Exception("Connection refused"))
        
        auto_smtp.main()
        
        assert "Failed to connect to Gmail" in " ".join(capture_print)
        assert "Connection refused" in " ".join(capture_print)


class TestErrorHandling:
    """Test error handling scenarios"""
    
    @pytest.mark.unit
    def test_keyboard_interrupt(self, mocker, sample_users, temp_files, capsys):
        """Test graceful handling of keyboard interrupt"""
        mocker.patch.object(sys, 'argv', ['auto_smtp.py'])
        mocker.patch.object(auto_smtp, 'SENT_EMAILS_FILE', temp_files['sent'])
        mocker.patch.object(auto_smtp, 'FAILED_EMAILS_FILE', temp_files['failed'])
        
        # Mock components
        mock_notion = Mock()
        mock_notion.databases.query = Mock(return_value=get_single_page_response(sample_users))
        mocker.patch("auto_smtp.NotionClient", return_value=mock_notion)
        
        mock_smtp = MagicMock()
        mocker.patch("smtplib.SMTP", return_value=mock_smtp)
        
        # Mock compile_mjml_template to raise KeyboardInterrupt on second call
        compile_mock = mocker.patch("auto_smtp.compile_mjml_template")
        compile_mock.side_effect = ["<html>1</html>", KeyboardInterrupt()]
        
        # Mock time.sleep
        mocker.patch("time.sleep")
        
        # Run main - should complete without raising SystemExit
        auto_smtp.main()
        
        # Check that interrupt message was printed
        captured = capsys.readouterr()
        assert "Campaign interrupted" in captured.out
    
    @pytest.mark.unit
    def test_partial_batch_failure(self, mocker, sample_users, temp_files):
        """Test handling of partial batch failures"""
        mocker.patch.object(sys, 'argv', ['auto_smtp.py'])
        mocker.patch.object(auto_smtp, 'SENT_EMAILS_FILE', temp_files['sent'])
        mocker.patch.object(auto_smtp, 'FAILED_EMAILS_FILE', temp_files['failed'])
        
        # Mock Notion
        mock_notion = Mock()
        mock_notion.databases.query = Mock(return_value=get_single_page_response(sample_users[:3]))
        mocker.patch("auto_smtp.NotionClient", return_value=mock_notion)
        
        # Mock SMTP with alternating success/failure
        mock_smtp = MagicMock()
        mock_smtp.send_message.side_effect = [None, Exception("Failed"), None]
        mocker.patch("smtplib.SMTP", return_value=mock_smtp)
        
        # Mock MJML compilation
        mocker.patch("auto_smtp.compile_mjml_template", return_value="<html>Test</html>")
        
        # Mock time.sleep
        mocker.patch("time.sleep")
        
        auto_smtp.main()
        
        # Check results
        sent_emails = json.loads(temp_files['sent'].read_text())
        failed_emails = json.loads(temp_files['failed'].read_text())
        
        assert len(sent_emails) == 2  # Two successful
        assert len(failed_emails) == 1  # One failed


class TestUtilityFunctions:
    """Test utility functions and edge cases"""
    
    @pytest.mark.unit
    def test_unicode_handling(self, mocker):
        """Test handling of Unicode characters in names and emails"""
        unicode_response = get_single_page_response(UNICODE_USERS)
        
        mock_client = Mock()
        mock_client.databases.query = Mock(return_value=unicode_response)
        mocker.patch("auto_smtp.NotionClient", return_value=mock_client)
        
        users = auto_smtp.fetch_users_from_notion()
        
        assert len(users) == len(UNICODE_USERS)
        assert users[0]['firstName'] == "José"
        assert users[1]['firstName'] == "François"
        assert users[2]['name'] == "田中優希"
        assert "🎉" in users[3]['name']
    
    @pytest.mark.unit
    def test_email_case_sensitivity(self, temp_files):
        """Test email comparison is case-insensitive"""
        # Save mixed-case emails
        sent_emails = ["TEST@EXAMPLE.COM", "User@Example.Com"]
        temp_files['sent'].write_text(json.dumps(sent_emails))
        
        # Load and check
        loaded = set(auto_smtp.load_json_file(temp_files['sent']))
        
        # These should be treated as already sent
        assert "test@example.com" in [e.lower() for e in loaded]
        assert "user@example.com" in [e.lower() for e in loaded]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
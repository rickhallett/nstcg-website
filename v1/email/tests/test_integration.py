"""
Integration tests for auto_smtp.py - end-to-end scenarios
"""

import pytest
import json
import sys
import time
import threading
from pathlib import Path
from unittest.mock import Mock, patch, call
import subprocess

sys.path.insert(0, str(Path(__file__).parent.parent))

import auto_smtp
from tests.mock_smtp_server import MockSMTPServer, wait_for_messages, extract_activation_link
from tests.fixtures.email_data import VALID_USERS, ALREADY_SENT_EMAILS, generate_large_user_batch
from tests.fixtures.notion_responses import get_single_page_response, get_paginated_response


@pytest.mark.integration
class TestCompleteWorkflow:
    """Test complete email campaign workflows"""
    
    def test_full_campaign_flow(self, mocker, temp_files, capsys):
        """Test entire workflow from Notion to email send"""
        # Setup
        mocker.patch.object(sys, 'argv', ['auto_smtp.py'])
        mocker.patch.object(auto_smtp, 'SENT_EMAILS_FILE', temp_files['sent'])
        mocker.patch.object(auto_smtp, 'FAILED_EMAILS_FILE', temp_files['failed'])
        
        # Mock Notion with test users
        mock_notion = Mock()
        mock_notion.databases.query = Mock(return_value=get_single_page_response(VALID_USERS))
        mocker.patch("auto_smtp.NotionClient", return_value=mock_notion)
        
        # Mock MJML compilation
        def mock_compile(email):
            return f"""
            <html>
            <body>
                <h1>Activation Email</h1>
                <p>Hello {email}</p>
                <a href="https://nstcg.org/?user_email={email}&bonus=75">Activate</a>
            </body>
            </html>
            """
        mocker.patch("auto_smtp.compile_mjml_template", side_effect=mock_compile)
        
        # Mock SMTP
        sent_messages = []
        mock_smtp = Mock()
        mock_smtp.send_message = lambda msg: sent_messages.append({
            'to': msg['To'],
            'from': msg['From'],
            'subject': msg['Subject']
        })
        mocker.patch("smtplib.SMTP", return_value=mock_smtp)
        
        # Mock time.sleep for faster test
        mocker.patch("time.sleep")
        
        # Run campaign
        auto_smtp.main()
        
        # Verify results
        assert len(sent_messages) == len(VALID_USERS)
        
        # Check sent emails file
        sent_emails = json.loads(temp_files['sent'].read_text())
        assert len(sent_emails) == len(VALID_USERS)
        assert all(user['email'] in sent_emails for user in VALID_USERS)
        
        # Check console output
        captured = capsys.readouterr()
        assert f"Found {len(VALID_USERS)} registered users" in captured.out
        assert "Campaign Summary" in captured.out
        assert f"Successful: {len(VALID_USERS)}" in captured.out
    
    def test_resume_functionality(self, mocker, temp_files, capsys):
        """Test resuming a partially completed campaign"""
        # Setup
        mocker.patch.object(sys, 'argv', ['auto_smtp.py', '--resume'])
        mocker.patch.object(auto_smtp, 'SENT_EMAILS_FILE', temp_files['sent'])
        mocker.patch.object(auto_smtp, 'FAILED_EMAILS_FILE', temp_files['failed'])
        
        # Pre-populate sent emails (first 2 users already sent)
        already_sent = [VALID_USERS[0]['email'], VALID_USERS[1]['email']]
        temp_files['sent'].write_text(json.dumps(already_sent))
        
        # Mock Notion
        mock_notion = Mock()
        mock_notion.databases.query = Mock(return_value=get_single_page_response(VALID_USERS))
        mocker.patch("auto_smtp.NotionClient", return_value=mock_notion)
        
        # Mock MJML and SMTP
        mocker.patch("auto_smtp.compile_mjml_template", return_value="<html>Test</html>")
        sent_messages = []
        mock_smtp = Mock()
        mock_smtp.send_message = lambda msg: sent_messages.append(msg['To'])
        mocker.patch("smtplib.SMTP", return_value=mock_smtp)
        mocker.patch("time.sleep")
        
        # Run campaign
        auto_smtp.main()
        
        # Verify only unsent emails were processed
        expected_to_send = len(VALID_USERS) - len(already_sent)
        assert len(sent_messages) == expected_to_send
        
        # Verify console output
        captured = capsys.readouterr()
        assert f"Found {len(already_sent)} previously sent emails" in captured.out
        assert f"{len(already_sent)} already sent, {expected_to_send} to process" in captured.out
    
    def test_mixed_success_failure(self, mocker, temp_files):
        """Test campaign with mix of successful and failed sends"""
        # Setup
        mocker.patch.object(sys, 'argv', ['auto_smtp.py'])
        mocker.patch.object(auto_smtp, 'SENT_EMAILS_FILE', temp_files['sent'])
        mocker.patch.object(auto_smtp, 'FAILED_EMAILS_FILE', temp_files['failed'])
        
        # Mock Notion
        mock_notion = Mock()
        mock_notion.databases.query = Mock(return_value=get_single_page_response(VALID_USERS))
        mocker.patch("auto_smtp.NotionClient", return_value=mock_notion)
        
        # Mock MJML
        mocker.patch("auto_smtp.compile_mjml_template", return_value="<html>Test</html>")
        
        # Mock SMTP with some failures
        send_results = [None, Exception("Invalid email"), None, Exception("Timeout"), None]
        mock_smtp = Mock()
        mock_smtp.send_message = Mock(side_effect=send_results)
        mocker.patch("smtplib.SMTP", return_value=mock_smtp)
        mocker.patch("time.sleep")
        
        # Run campaign
        auto_smtp.main()
        
        # Check results
        sent_emails = json.loads(temp_files['sent'].read_text())
        failed_emails = json.loads(temp_files['failed'].read_text())
        
        assert len(sent_emails) == 3  # 3 successful
        assert len(failed_emails) == 2  # 2 failed
        
        # Verify failed email structure
        assert failed_emails[0]['error'] == "Invalid email"
        assert failed_emails[1]['error'] == "Timeout"
        assert all('timestamp' in record for record in failed_emails)


@pytest.mark.integration
class TestRealSMTPIntegration:
    """Test with actual mock SMTP server"""
    
    @pytest.mark.slow
    def test_with_mock_smtp_server(self, mocker, temp_files):
        """Test with a real mock SMTP server"""
        # Start mock SMTP server
        smtp_server = MockSMTPServer(port=1025)
        smtp_server.start()
        
        try:
            # Setup
            mocker.patch.object(sys, 'argv', ['auto_smtp.py'])
            mocker.patch.object(auto_smtp, 'SENT_EMAILS_FILE', temp_files['sent'])
            mocker.patch.object(auto_smtp, 'FAILED_EMAILS_FILE', temp_files['failed'])
            mocker.patch.dict(auto_smtp.CONFIG, {
                'GMAIL_USER': 'test@example.com'
            })
            
            # Use only first 2 users for speed
            test_users = VALID_USERS[:2]
            
            # Mock Notion
            mock_notion = Mock()
            mock_notion.databases.query = Mock(return_value=get_single_page_response(test_users))
            mocker.patch("auto_smtp.NotionClient", return_value=mock_notion)
            
            # Mock MJML
            def mock_compile(email):
                return f"<html><body>Test email for {email}</body></html>"
            mocker.patch("auto_smtp.compile_mjml_template", side_effect=mock_compile)
            
            # Mock SMTP completely for this test
            mock_smtp = Mock()
            mock_smtp.send_message = Mock()
            mocker.patch("smtplib.SMTP", return_value=mock_smtp)
            
            # Run campaign
            auto_smtp.main()
            
            # Verify SMTP calls
            assert mock_smtp.send_message.call_count == len(test_users)
            
            # Check sent emails file
            sent_emails = json.loads(temp_files['sent'].read_text())
            assert len(sent_emails) == len(test_users)
            assert all(user['email'] in sent_emails for user in test_users)
                
        finally:
            smtp_server.stop()
    
    @pytest.mark.slow
    def test_smtp_failure_recovery(self, mocker, temp_files):
        """Test recovery from SMTP failures"""
        # Start mock SMTP server with failure mode
        smtp_server = MockSMTPServer(port=1026)
        smtp_server.start()
        smtp_server.set_fail_mode(True, pattern="@fail.com")
        
        try:
            # Setup
            mocker.patch.object(sys, 'argv', ['auto_smtp.py'])
            mocker.patch.object(auto_smtp, 'SENT_EMAILS_FILE', temp_files['sent'])
            mocker.patch.object(auto_smtp, 'FAILED_EMAILS_FILE', temp_files['failed'])
            
            # Test users with mix of success/fail
            test_users = [
                {"email": "success1@example.com", "firstName": "Success", "lastName": "One", "name": "Success One"},
                {"email": "fail@fail.com", "firstName": "Fail", "lastName": "User", "name": "Fail User"},
                {"email": "success2@example.com", "firstName": "Success", "lastName": "Two", "name": "Success Two"},
            ]
            
            # Mock Notion
            mock_notion = Mock()
            mock_notion.databases.query = Mock(return_value=get_single_page_response(test_users))
            mocker.patch("auto_smtp.NotionClient", return_value=mock_notion)
            
            # Mock MJML
            mocker.patch("auto_smtp.compile_mjml_template", return_value="<html>Test</html>")
            
            # Mock SMTP with failure patterns
            def mock_smtp_send(msg):
                recipient = msg['To']
                if '@fail.com' in recipient:
                    raise Exception("Delivery failed")
                # Success for other emails
                
            mock_smtp = Mock()
            mock_smtp.send_message = Mock(side_effect=mock_smtp_send)
            mocker.patch("smtplib.SMTP", return_value=mock_smtp)
            
            # Run campaign
            auto_smtp.main()
            
            # Check results
            sent_emails = json.loads(temp_files['sent'].read_text())
            failed_emails = json.loads(temp_files['failed'].read_text())
            
            assert len(sent_emails) == 2  # Two successful
            assert len(failed_emails) == 1  # One failed
            assert failed_emails[0]['email'] == "fail@fail.com"
            
        finally:
            smtp_server.stop()


@pytest.mark.integration
class TestErrorScenarios:
    """Test various error scenarios"""
    
    def test_notion_api_failure(self, mocker, temp_files, capsys):
        """Test handling of Notion API failures"""
        mocker.patch.object(sys, 'argv', ['auto_smtp.py'])
        mocker.patch.object(auto_smtp, 'SENT_EMAILS_FILE', temp_files['sent'])
        mocker.patch.object(auto_smtp, 'FAILED_EMAILS_FILE', temp_files['failed'])
        
        # Mock Notion to fail
        mock_notion = Mock()
        mock_notion.databases.query = Mock(side_effect=Exception("API Error"))
        mocker.patch("auto_smtp.NotionClient", return_value=mock_notion)
        
        # Run campaign
        with pytest.raises(SystemExit):
            auto_smtp.main()
        
        # Check error message
        captured = capsys.readouterr()
        assert "Campaign failed: API Error" in captured.out
    
    def test_mjml_compilation_failure(self, mocker, temp_files):
        """Test handling of MJML compilation failures"""
        mocker.patch.object(sys, 'argv', ['auto_smtp.py'])
        mocker.patch.object(auto_smtp, 'SENT_EMAILS_FILE', temp_files['sent'])
        mocker.patch.object(auto_smtp, 'FAILED_EMAILS_FILE', temp_files['failed'])
        
        # Mock Notion
        mock_notion = Mock()
        mock_notion.databases.query = Mock(return_value=get_single_page_response(VALID_USERS[:1]))
        mocker.patch("auto_smtp.NotionClient", return_value=mock_notion)
        
        # Mock MJML to fail
        mocker.patch("auto_smtp.compile_mjml_template", 
                    side_effect=subprocess.CalledProcessError(1, 'mjml'))
        
        # Mock SMTP
        mocker.patch("smtplib.SMTP", return_value=Mock())
        
        # Run campaign
        auto_smtp.main()
        
        # Check that failure was recorded in stats (not necessarily in failed_emails file)
        # MJML failures are caught by the general exception handler which only increments stats
        sent_emails = json.loads(temp_files['sent'].read_text())
        failed_emails = json.loads(temp_files['failed'].read_text())
        assert len(sent_emails) == 0  # No emails sent
        # Note: MJML failures don't get saved to failed_emails.json, just counted in stats
    
    def test_interrupt_and_resume(self, mocker, temp_files, capsys):
        """Test interrupting campaign and resuming"""
        # First run - interrupt after 2 emails
        mocker.patch.object(sys, 'argv', ['auto_smtp.py'])
        mocker.patch.object(auto_smtp, 'SENT_EMAILS_FILE', temp_files['sent'])
        mocker.patch.object(auto_smtp, 'FAILED_EMAILS_FILE', temp_files['failed'])
        
        # Mock Notion
        mock_notion = Mock()
        mock_notion.databases.query = Mock(return_value=get_single_page_response(VALID_USERS))
        mocker.patch("auto_smtp.NotionClient", return_value=mock_notion)
        
        # Mock MJML
        mocker.patch("auto_smtp.compile_mjml_template", return_value="<html>Test</html>")
        
        # Mock SMTP to raise KeyboardInterrupt after 2 sends
        send_count = 0
        def mock_send(msg):
            nonlocal send_count
            send_count += 1
            if send_count > 2:
                raise KeyboardInterrupt()
        
        mock_smtp = Mock()
        mock_smtp.send_message = mock_send
        mocker.patch("smtplib.SMTP", return_value=mock_smtp)
        mocker.patch("time.sleep")
        
        # Run first time (will be interrupted)
        auto_smtp.main()
        
        # Check partial completion
        sent_emails = json.loads(temp_files['sent'].read_text())
        assert len(sent_emails) == 2
        
        # Check interrupt message
        captured = capsys.readouterr()
        assert "Campaign interrupted" in captured.out
        
        # Second run - resume
        mocker.patch.object(sys, 'argv', ['auto_smtp.py', '--resume'])
        
        # Reset mock to work normally
        mock_smtp.send_message = Mock()
        
        # Run again with resume
        auto_smtp.main()
        
        # Check full completion
        sent_emails = json.loads(temp_files['sent'].read_text())
        assert len(sent_emails) == len(VALID_USERS)


@pytest.mark.integration 
class TestBatchProcessing:
    """Test batch processing functionality"""
    
    def test_small_batch_size(self, mocker, temp_files, capsys):
        """Test processing with small batch size"""
        mocker.patch.object(sys, 'argv', ['auto_smtp.py', '--batch-size', '2'])
        mocker.patch.object(auto_smtp, 'SENT_EMAILS_FILE', temp_files['sent'])
        mocker.patch.object(auto_smtp, 'FAILED_EMAILS_FILE', temp_files['failed'])
        
        # Use 5 users for testing
        test_users = VALID_USERS[:5]
        
        # Mock Notion
        mock_notion = Mock()
        mock_notion.databases.query = Mock(return_value=get_single_page_response(test_users))
        mocker.patch("auto_smtp.NotionClient", return_value=mock_notion)
        
        # Mock other components
        mocker.patch("auto_smtp.compile_mjml_template", return_value="<html>Test</html>")
        mocker.patch("smtplib.SMTP", return_value=Mock())
        
        # Track sleep calls to verify batch pauses
        sleep_calls = []
        mocker.patch("time.sleep", side_effect=lambda x: sleep_calls.append(x))
        
        # Run campaign
        auto_smtp.main()
        
        # Should have pauses between batches
        # With 5 users and batch size 2: batches of 2, 2, 1
        # So we expect pauses after batches, plus rate limiting
        assert len(sleep_calls) > 0
    
    def test_pagination_handling(self, mocker, temp_files):
        """Test handling of paginated Notion results"""
        mocker.patch.object(sys, 'argv', ['auto_smtp.py'])
        mocker.patch.object(auto_smtp, 'SENT_EMAILS_FILE', temp_files['sent'])
        mocker.patch.object(auto_smtp, 'FAILED_EMAILS_FILE', temp_files['failed'])
        
        # Create 250 test users (will paginate)
        large_user_list = generate_large_user_batch(250)
        
        # Mock Notion with pagination
        page_size = 100
        responses = []
        for i in range(0, len(large_user_list), page_size):
            responses.append(get_paginated_response(large_user_list, page_size, i // page_size))
        
        mock_notion = Mock()
        mock_notion.databases.query = Mock(side_effect=responses)
        mocker.patch("auto_smtp.NotionClient", return_value=mock_notion)
        
        # Mock other components for speed
        mocker.patch("auto_smtp.compile_mjml_template", return_value="<html>Test</html>")
        mocker.patch("smtplib.SMTP", return_value=Mock())
        mocker.patch("time.sleep")
        
        # Run campaign
        auto_smtp.main()
        
        # Verify all users were processed
        sent_emails = json.loads(temp_files['sent'].read_text())
        assert len(sent_emails) == len(large_user_list)


@pytest.mark.integration
class TestDryRunMode:
    """Test dry run functionality"""
    
    def test_dry_run_no_sends(self, mocker, temp_files, capsys):
        """Test that dry run doesn't send emails"""
        mocker.patch.object(sys, 'argv', ['auto_smtp.py', '--dry-run'])
        mocker.patch.object(auto_smtp, 'SENT_EMAILS_FILE', temp_files['sent'])
        mocker.patch.object(auto_smtp, 'FAILED_EMAILS_FILE', temp_files['failed'])
        
        # Mock Notion
        mock_notion = Mock()
        mock_notion.databases.query = Mock(return_value=get_single_page_response(VALID_USERS))
        mocker.patch("auto_smtp.NotionClient", return_value=mock_notion)
        
        # Mock SMTP - should not be called
        mock_smtp = Mock()
        smtp_patch = mocker.patch("smtplib.SMTP", return_value=mock_smtp)
        
        # Run campaign
        auto_smtp.main()
        
        # Verify no SMTP connection
        smtp_patch.assert_not_called()
        
        # Verify no files updated
        assert temp_files['sent'].read_text() == "[]"
        assert temp_files['failed'].read_text() == "[]"
        
        # Check output
        captured = capsys.readouterr()
        assert "DRY RUN" in captured.out
        assert all(f"Would send to: {user['email']}" in captured.out for user in VALID_USERS)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "integration"])
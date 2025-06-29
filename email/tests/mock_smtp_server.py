"""
Mock SMTP server for testing email functionality
"""

import asyncio
import threading
from aiosmtpd.controller import Controller
from aiosmtpd.handlers import Debugging
from email.message import EmailMessage
from email.parser import Parser
import time


class MockSMTPHandler:
    """Custom handler that stores received messages"""
    
    def __init__(self):
        self.messages = []
        self.should_fail = False
        self.fail_pattern = None
        self.fail_count = 0
        self.max_failures = -1  # -1 means always fail
    
    async def handle_DATA(self, server, session, envelope):
        """Handle incoming email data"""
        # Parse the email
        parser = Parser()
        message = parser.parsestr(envelope.content.decode('utf8', errors='replace'))
        
        # Extract email details
        email_data = {
            'from': envelope.mail_from,
            'to': envelope.rcpt_tos,
            'subject': message.get('Subject', ''),
            'body': self._get_body(message),
            'timestamp': time.time(),
            'raw': envelope.content.decode('utf8', errors='replace')
        }
        
        # Check if we should fail this email
        if self.should_fail:
            if self.fail_pattern and self.fail_pattern in email_data['to'][0]:
                if self.max_failures == -1 or self.fail_count < self.max_failures:
                    self.fail_count += 1
                    return '550 Test failure for pattern match'
            elif not self.fail_pattern:
                if self.max_failures == -1 or self.fail_count < self.max_failures:
                    self.fail_count += 1
                    return '550 Test failure'
        
        # Store the message
        self.messages.append(email_data)
        return '250 Message accepted for delivery'
    
    def _get_body(self, message):
        """Extract body from email message"""
        if message.is_multipart():
            for part in message.walk():
                if part.get_content_type() == "text/html":
                    return part.get_payload(decode=True).decode('utf8', errors='replace')
                elif part.get_content_type() == "text/plain":
                    return part.get_payload(decode=True).decode('utf8', errors='replace')
        else:
            return message.get_payload(decode=True).decode('utf8', errors='replace')
        return ""


class MockSMTPServer:
    """Mock SMTP server for testing"""
    
    def __init__(self, hostname='localhost', port=1025):
        self.hostname = hostname
        self.port = port
        self.handler = MockSMTPHandler()
        self.controller = None
        self.thread = None
    
    def start(self):
        """Start the mock SMTP server"""
        self.controller = Controller(
            self.handler,
            hostname=self.hostname,
            port=self.port
        )
        
        # Start in a separate thread
        self.thread = threading.Thread(target=self._run_server)
        self.thread.daemon = True
        self.thread.start()
        
        # Wait for server to start
        time.sleep(0.5)
        print(f"Mock SMTP server started on {self.hostname}:{self.port}")
    
    def _run_server(self):
        """Run the server in a thread"""
        self.controller.start()
        # Keep the thread alive
        while True:
            time.sleep(0.1)
    
    def stop(self):
        """Stop the mock SMTP server"""
        if self.controller:
            self.controller.stop()
            print(f"Mock SMTP server stopped")
    
    def get_messages(self):
        """Get all received messages"""
        return self.handler.messages
    
    def clear_messages(self):
        """Clear all stored messages"""
        self.handler.messages = []
    
    def set_fail_mode(self, should_fail=True, pattern=None, max_failures=-1):
        """Configure server to fail certain emails"""
        self.handler.should_fail = should_fail
        self.handler.fail_pattern = pattern
        self.handler.max_failures = max_failures
        self.handler.fail_count = 0
    
    def get_message_count(self):
        """Get count of received messages"""
        return len(self.handler.messages)
    
    def get_last_message(self):
        """Get the last received message"""
        if self.handler.messages:
            return self.handler.messages[-1]
        return None
    
    def find_message_by_recipient(self, email):
        """Find message by recipient email"""
        for message in self.handler.messages:
            if email in message['to']:
                return message
        return None


class SimpleMockSMTP:
    """Simple mock SMTP for unit tests (no actual server)"""
    
    def __init__(self):
        self.messages = []
        self.authenticated = False
        self.tls_started = False
        self.connection_failed = False
        self.send_failed = False
        self.quit_called = False
    
    def starttls(self):
        """Mock STARTTLS"""
        if self.connection_failed:
            raise Exception("Connection failed")
        self.tls_started = True
    
    def login(self, username, password):
        """Mock login"""
        if self.connection_failed:
            raise Exception("Connection failed")
        if username and password:
            self.authenticated = True
        else:
            raise Exception("Authentication failed")
    
    def send_message(self, msg):
        """Mock send_message"""
        if not self.authenticated:
            raise Exception("Not authenticated")
        if self.send_failed:
            raise Exception("Send failed")
        
        # Extract message details
        message_data = {
            'from': msg['From'],
            'to': msg['To'],
            'subject': msg['Subject'],
            'timestamp': time.time()
        }
        self.messages.append(message_data)
    
    def quit(self):
        """Mock quit"""
        self.quit_called = True


# Utility functions for testing
def wait_for_messages(server, count, timeout=5):
    """Wait for a specific number of messages to arrive"""
    start_time = time.time()
    while time.time() - start_time < timeout:
        if server.get_message_count() >= count:
            return True
        time.sleep(0.1)
    return False


def extract_activation_link(html_body):
    """Extract activation link from email body"""
    import re
    pattern = r'https://nstcg\.org/\?user_email=([^&]+)&bonus=(\d+)'
    match = re.search(pattern, html_body)
    if match:
        return {
            'email': match.group(1),
            'bonus': int(match.group(2))
        }
    return None
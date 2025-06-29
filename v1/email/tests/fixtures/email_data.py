"""
Test email addresses and user data for testing
"""

# Valid test users
VALID_USERS = [
    {
        "id": "user-001",
        "email": "john.doe@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "name": "John Doe"
    },
    {
        "id": "user-002",
        "email": "jane.smith@example.com",
        "firstName": "Jane",
        "lastName": "Smith",
        "name": "Jane Smith"
    },
    {
        "id": "user-003",
        "email": "bob.johnson@example.com",
        "firstName": "Bob",
        "lastName": "Johnson",
        "name": "Bob Johnson"
    },
    {
        "id": "user-004",
        "email": "alice.wong@example.com",
        "firstName": "Alice",
        "lastName": "Wong",
        "name": "Alice Wong"
    },
    {
        "id": "user-005",
        "email": "charlie.brown@example.com",
        "firstName": "Charlie",
        "lastName": "Brown",
        "name": "Charlie Brown"
    }
]

# Edge case emails
EDGE_CASE_EMAILS = [
    # Valid but unusual formats
    "user+tag@example.com",
    "user.name+tag@example.com",
    "test@subdomain.example.com",
    "test@example.co.uk",
    "123@example.com",
    "test_user@example.com",
    "test-user@example.com",
    
    # Very long email
    "very.long.email.address.that.might.cause.issues@subdomain.example-company.international.co.uk",
    
    # Short email
    "a@b.co",
    
    # Numbers and special chars
    "user123@example.com",
    "test.email.with+symbol@example4numbers.com"
]

# Invalid emails for testing
INVALID_EMAILS = [
    "notanemail",
    "@example.com",
    "user@",
    "user @example.com",  # Space
    "user@example .com",  # Space
    "user@@example.com",
    "user@example..com",
    "",
    None,
    "user@.com",
    ".user@example.com",
    "user.@example.com"
]

# Users with missing data
INCOMPLETE_USERS = [
    {
        "id": "incomplete-001",
        "email": "no-name@example.com",
        "firstName": "",
        "lastName": "",
        "name": ""
    },
    {
        "id": "incomplete-002",
        "email": "first-only@example.com",
        "firstName": "FirstName",
        "lastName": "",
        "name": "FirstName"
    },
    {
        "id": "incomplete-003",
        "email": "last-only@example.com",
        "firstName": "",
        "lastName": "LastName",
        "name": "LastName"
    }
]

# Unicode test users
UNICODE_USERS = [
    {
        "id": "unicode-001",
        "email": "jose@example.com",
        "firstName": "José",
        "lastName": "García",
        "name": "José García"
    },
    {
        "id": "unicode-002",
        "email": "francois@example.com",
        "firstName": "François",
        "lastName": "Müller",
        "name": "François Müller"
    },
    {
        "id": "unicode-003",
        "email": "yuki@example.com",
        "firstName": "優希",
        "lastName": "田中",
        "name": "田中優希"
    },
    {
        "id": "unicode-004",
        "email": "emoji@example.com",
        "firstName": "Test",
        "lastName": "User 🎉",
        "name": "Test User 🎉"
    }
]

# Large batch of users for performance testing
def generate_large_user_batch(count=1000):
    """Generate a large batch of test users"""
    users = []
    for i in range(count):
        users.append({
            "id": f"bulk-user-{i:04d}",
            "email": f"user{i:04d}@example.com",
            "firstName": f"User{i:04d}",
            "lastName": "Test",
            "name": f"User{i:04d} Test"
        })
    return users

# Emails that should already be marked as sent
ALREADY_SENT_EMAILS = [
    "already.sent1@example.com",
    "already.sent2@example.com",
    "already.sent3@example.com",
    "john.doe@example.com",  # Overlaps with VALID_USERS
]

# Failed email records
FAILED_EMAIL_RECORDS = [
    {
        "id": "failed-001",
        "email": "bounce@example.com",
        "firstName": "Bounce",
        "lastName": "Test",
        "name": "Bounce Test",
        "error": "550 Mailbox not found",
        "timestamp": "2025-06-28T10:00:00"
    },
    {
        "id": "failed-002",
        "email": "timeout@example.com",
        "firstName": "Timeout",
        "lastName": "Test",
        "name": "Timeout Test",
        "error": "Connection timeout",
        "timestamp": "2025-06-28T10:05:00"
    }
]

# Email patterns for testing failures
FAIL_PATTERNS = {
    "bounce": ["bounce@", "invalid@", "noreply@"],
    "timeout": ["timeout@", "slow@"],
    "auth": ["unauthorized@", "forbidden@"]
}

# Test campaign statistics
EXPECTED_STATS = {
    "small_batch": {
        "total": 5,
        "sent": 4,
        "failed": 1,
        "skipped": 0
    },
    "with_skips": {
        "total": 10,
        "sent": 6,
        "failed": 1,
        "skipped": 3
    },
    "all_failed": {
        "total": 5,
        "sent": 0,
        "failed": 5,
        "skipped": 0
    }
}
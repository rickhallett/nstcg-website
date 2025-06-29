"""
Mock Notion API responses for testing
"""


def get_single_page_response(users):
    """Generate a single page Notion response"""
    return {
        "results": [
            {
                "id": user.get("id", f"page-{i}"),
                "properties": {
                    "Email": {"email": user["email"]},
                    "First Name": {
                        "rich_text": [{"text": {"content": user.get("firstName", "")}}] 
                        if user.get("firstName") else []
                    },
                    "Last Name": {
                        "rich_text": [{"text": {"content": user.get("lastName", "")}}] 
                        if user.get("lastName") else []
                    },
                    "Name": {
                        "title": [{"text": {"content": user.get("name", "")}}]
                        if user.get("name") else []
                    }
                }
            }
            for i, user in enumerate(users)
        ],
        "has_more": False,
        "next_cursor": None
    }


def get_paginated_response(users, page_size=100, page_num=0):
    """Generate paginated Notion response"""
    start_idx = page_num * page_size
    end_idx = start_idx + page_size
    page_users = users[start_idx:end_idx]
    has_more = end_idx < len(users)
    
    response = get_single_page_response(page_users)
    response["has_more"] = has_more
    response["next_cursor"] = f"cursor-page-{page_num + 1}" if has_more else None
    
    return response


def get_empty_response():
    """Generate empty Notion response"""
    return {
        "results": [],
        "has_more": False,
        "next_cursor": None
    }


def get_malformed_response():
    """Generate malformed Notion response for error testing"""
    return {
        "results": [
            {
                "id": "malformed-1",
                "properties": {
                    # Missing Email property - will be skipped
                    "Name": {"title": [{"text": {"content": "John Doe"}}]}
                }
            },
            {
                "id": "valid-1",
                "properties": {
                    "Email": {"email": "test@example.com"},
                    "Name": {"title": [{"text": {"content": "Valid User"}}]},
                    "First Name": {"rich_text": [{"text": {"content": "Valid"}}]},
                    "Last Name": {"rich_text": [{"text": {"content": "User"}}]}
                }
            },
            {
                "id": "malformed-3",
                "properties": {
                    "Email": {"email": ""},  # Empty email - will be skipped
                    "Name": {"title": [{"text": {"content": "Empty Email"}}]}
                }
            }
        ],
        "has_more": False,
        "next_cursor": None
    }


def get_unicode_response():
    """Generate response with Unicode characters"""
    return get_single_page_response([
        {
            "email": "jose@example.com",
            "firstName": "José",
            "lastName": "García",
            "name": "José García"
        },
        {
            "email": "marie@example.com",
            "firstName": "Marie",
            "lastName": "Müller",
            "name": "Marie Müller"
        },
        {
            "email": "wang@example.com",
            "firstName": "王",
            "lastName": "小明",
            "name": "王小明"
        },
        {
            "email": "emoji@example.com",
            "firstName": "Test",
            "lastName": "User 🎉",
            "name": "Test User 🎉"
        }
    ])


def get_edge_case_response():
    """Generate response with edge cases"""
    return get_single_page_response([
        {
            "email": "no-name@example.com",
            "firstName": "",
            "lastName": "",
            "name": ""
        },
        {
            "email": "first-only@example.com",
            "firstName": "FirstOnly",
            "lastName": "",
            "name": "FirstOnly"
        },
        {
            "email": "last-only@example.com",
            "firstName": "",
            "lastName": "LastOnly",
            "name": "LastOnly"
        },
        {
            "email": "very.long.email.address.that.exceeds.normal.length@subdomain.example-company.co.uk",
            "firstName": "VeryLongFirstNameThatExceedsNormalLength",
            "lastName": "VeryLongLastNameThatExceedsNormalLength",
            "name": "VeryLongFirstNameThatExceedsNormalLength VeryLongLastNameThatExceedsNormalLength"
        },
        {
            "email": "special-chars+tag@example.com",
            "firstName": "Special",
            "lastName": "Chars",
            "name": "Special Chars"
        }
    ])


def get_duplicate_email_response():
    """Generate response with duplicate emails"""
    return get_single_page_response([
        {
            "id": "user-1",
            "email": "duplicate@example.com",
            "firstName": "First",
            "lastName": "User",
            "name": "First User"
        },
        {
            "id": "user-2",
            "email": "duplicate@example.com",
            "firstName": "Second",
            "lastName": "User",
            "name": "Second User"
        },
        {
            "id": "user-3",
            "email": "DUPLICATE@EXAMPLE.COM",  # Different case
            "firstName": "Third",
            "lastName": "User",
            "name": "Third User"
        }
    ])


# Error responses
ERROR_RESPONSES = {
    "unauthorized": {
        "code": "unauthorized",
        "message": "API token is invalid."
    },
    "database_not_found": {
        "object": "error",
        "status": 404,
        "code": "object_not_found",
        "message": "Could not find database with ID: test-database-id"
    },
    "rate_limited": {
        "code": "rate_limited",
        "message": "Too many requests. Please wait and try again."
    },
    "internal_error": {
        "code": "internal_server_error",
        "message": "An internal server error occurred."
    }
}
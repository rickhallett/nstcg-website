"""
Test MJML templates and expected HTML output
"""

# Basic test template
BASIC_MJML_TEMPLATE = """<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>
          <h1>Test Email</h1>
          <p>Hello {{user_email}}</p>
        </mj-text>
        <mj-button href="https://nstcg.org/?user_email={{user_email}}&bonus=75">
          Activate
        </mj-button>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>"""

# Expected compiled HTML (simplified)
EXPECTED_HTML_OUTPUT = """<!doctype html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title></title>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body>
  <div>
    <h1>Test Email</h1>
    <p>Hello test@example.com</p>
    <table border="0" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td>
          <a href="https://nstcg.org/?user_email=test@example.com&bonus=75" target="_blank">
            Activate
          </a>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>"""

# Complex template with all placeholders
FULL_MJML_TEMPLATE = """<mjml>
  <mj-head>
    <mj-title>Activate Your Account</mj-title>
    <mj-preview>You have bonus points waiting!</mj-preview>
  </mj-head>
  <mj-body>
    <mj-section background-color="#1a1a1a">
      <mj-column>
        <mj-text color="#00ff00" font-size="24px">
          ⏰ Time is Running Out!
        </mj-text>
      </mj-column>
    </mj-section>
    
    <mj-section>
      <mj-column>
        <mj-text>
          <p>Dear {{user_email}},</p>
          <p>You have <strong>75 bonus points</strong> waiting!</p>
        </mj-text>
        
        <mj-button 
          href="https://nstcg.org/?user_email={{user_email}}&bonus=75"
          background-color="#00ff00"
          color="#1a1a1a">
          🚀 Activate Now & Claim 75 Points →
        </mj-button>
        
        <mj-text>
          <p>This link is unique to: {{user_email}}</p>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>"""

# Template with syntax error
INVALID_MJML_TEMPLATE = """<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>
          <h1>Invalid Template</h1>
        </mj-nonexistent-tag>  <!-- Invalid closing tag -->
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>"""

# Template with special characters
SPECIAL_CHARS_TEMPLATE = """<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>
          <p>Testing special chars: & < > " '</p>
          <p>User email: {{user_email}}</p>
          <p>Unicode: café, naïve, 你好</p>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>"""

# Template without placeholders
NO_PLACEHOLDER_TEMPLATE = """<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>
          <h1>Static Email</h1>
          <p>This email has no placeholders</p>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>"""

# Expected placeholder replacements
PLACEHOLDER_TEST_CASES = [
    {
        "email": "simple@example.com",
        "expected_in_html": [
            "simple@example.com",
            "https://nstcg.org/?user_email=simple@example.com&bonus=75"
        ]
    },
    {
        "email": "user+tag@example.com",
        "expected_in_html": [
            "user+tag@example.com",
            "https://nstcg.org/?user_email=user+tag@example.com&bonus=75"
        ]
    },
    {
        "email": "special&chars@example.com",
        "expected_in_html": [
            "special&chars@example.com",
            "https://nstcg.org/?user_email=special&chars@example.com&bonus=75"
        ]
    }
]

# MJML compilation error messages
MJML_ERROR_MESSAGES = {
    "command_not_found": "npx: command not found",
    "mjml_not_installed": "Cannot find module 'mjml'",
    "syntax_error": "ValidationError",
    "file_not_found": "ENOENT: no such file or directory"
}

def get_test_template(email="test@example.com"):
    """Get a test template with email replaced"""
    return BASIC_MJML_TEMPLATE.replace("{{user_email}}", email)

def verify_email_in_html(html, email):
    """Verify email appears correctly in HTML"""
    return email in html and f"user_email={email}" in html
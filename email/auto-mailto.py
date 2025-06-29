import webbrowser
import urllib.parse
import time

# Your email list
email_addresses = ["person1@example.com", "person2@example.com", "person3@example.com"]

# HTML email template with placeholders
html_template = """
<html>
<body>
    <h2>Hello {name}!</h2>
    <p>This is a personalized email for {email}.</p>
    <p>Your special code is: {special_code}</p>
    
    <div style="background: #f0f0f0; padding: 10px;">
        <h3>Section for {name}</h3>
        <p>Custom content here...</p>
    </div>
</body>
</html>
"""

subject = "Your Personalized Email"


def extract_name_from_email(email):
    """Extract name from email address"""
    return email.split("@")[0].replace(".", " ").title()


def generate_special_code(email):
    """Generate some kind of special code"""
    return f"CODE-{hash(email) % 10000:04d}"


# Generate and open emails
for email in email_addresses:
    name = extract_name_from_email(email)
    special_code = generate_special_code(email)

    # Fill in the template
    personalized_html = html_template.format(
        name=name, email=email, special_code=special_code
    )

    # Create mailto link
    mailto_link = f"mailto:{email}?subject={urllib.parse.quote(subject)}&body={urllib.parse.quote(personalized_html)}"

    print(f"Opening email for {name} ({email})")
    webbrowser.open(mailto_link)

    # Wait a bit between opens so they don't all pile up
    time.sleep(2)

print("All emails generated and opened!")

# GitHub Actions Workflows

## Email Campaign Tests (`test-email.yml`)

This workflow runs comprehensive tests for the email campaign automation script.

### Triggers

- **Push**: Automatically runs when changes are pushed to `email/**` files
- **Pull Request**: Runs on PRs that modify email campaign files
- **Manual**: Can be triggered manually from the Actions tab

### Jobs

#### 1. Lint (`lint`)
- Checks code formatting with Black
- Validates import ordering with isort
- Runs Flake8 for code quality issues

#### 2. Test (`test`)
- Runs on Python 3.8, 3.9, 3.10, and 3.11
- Executes unit tests with coverage reporting
- Runs integration tests
- Uploads coverage to Codecov

#### 3. Performance (`performance`)
- Only runs on pushes to main branch
- Executes performance and load tests
- Stores results as artifacts

#### 4. Security (`security`)
- Scans dependencies for known vulnerabilities
- Runs Bandit for security issues in code
- Generates security reports

#### 5. Validate MJML (`validate-mjml`)
- Validates all MJML email templates
- Ensures templates compile without errors

#### 6. Dry Run (`dry-run`)
- Tests the script in dry-run mode
- Verifies no actual emails are sent
- Validates file handling

### Required Secrets

Configure these in your repository settings:

- `NOTION_TOKEN_TEST`: Test Notion integration token
- `NOTION_DATABASE_ID_TEST`: Test database ID

### Running Tests Locally

```bash
# Install test dependencies
pip install -r email/requirements-test.txt

# Run all tests
cd email && pytest

# Run specific test categories
pytest -m unit          # Unit tests only
pytest -m integration   # Integration tests only
pytest -m performance   # Performance tests only

# Run with coverage
pytest --cov=auto_smtp --cov-report=html
```

### Code Quality Tools

```bash
# Format code
black email/

# Sort imports
isort email/

# Check code quality
flake8 email/

# Security scan
bandit -r email/
```
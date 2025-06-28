# NSTCG E2E Tests

Comprehensive end-to-end tests for the NSTCG referral scheme using Playwright.

## Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

3. Set up environment variables:
```bash
# Copy example env file
cp .env.example .env.test

# Add your Notion API credentials
NOTION_TOKEN=your_token_here
NOTION_DATABASE_ID=your_database_id
NOTION_GAMIFICATION_DB_ID=your_gamification_db_id

# Optional: Use separate test databases
NOTION_TEST_DATABASE_ID=test_database_id
NOTION_TEST_GAMIFICATION_DB_ID=test_gamification_db_id
```

## Running Tests

### Basic Commands

```bash
# Run all tests (headless)
npm run test:e2e

# Run tests with visible browser
npm run test:e2e:headed

# Run tests in debug mode
npm run test:e2e:debug

# Open Playwright UI (interactive mode)
npm run test:e2e:ui

# Run specific browser
npm run test:e2e:chrome
npm run test:e2e:firefox
npm run test:e2e:mobile

# Run in CI mode
npm run test:e2e:ci
```

### Advanced Options

```bash
# Run specific test file
npm run test:e2e -- --test=registration

# Run with custom workers
npm run test:e2e -- --workers=4

# Update snapshots
npm run test:e2e -- --update-snapshots

# Custom reporter
npm run test:e2e -- --reporter=json
```

## Test Structure

```
tests/
├── config/                 # Configuration files
│   ├── puppeteer-config.js # Puppeteer/browser settings
│   └── test-constants.js   # Shared constants
├── utils/                  # Helper utilities
│   ├── test-helpers.js     # Common test operations
│   ├── notion-helpers.js   # Notion API utilities
│   └── data-generators.js  # Test data generation
├── e2e/                    # Test files
│   ├── registration.test.js # Registration flow tests
│   ├── sharing.test.js      # Share functionality tests
│   ├── referral.test.js     # Referral attribution tests
│   ├── activation.test.js   # Email activation tests
│   └── leaderboard.test.js  # Leaderboard tests
├── setup/                  # Setup/teardown scripts
│   ├── global-setup.js     # Pre-test setup
│   └── global-teardown.js  # Post-test cleanup
└── run-e2e-tests.js        # Main test runner
```

## Test Coverage

### Registration Flow
- ✅ New user registration
- ✅ Referral code generation
- ✅ Registration via referral link
- ✅ Form validation
- ✅ Duplicate prevention
- ✅ Network error handling

### Share Functionality
- ✅ Referral link display and copy
- ✅ Social share buttons
- ✅ Share tracking
- ✅ Daily limits
- ✅ Mobile compatibility

### Referral Attribution
- ✅ Complete referral journey
- ✅ Points allocation
- ✅ Multiple referrals
- ✅ Cookie persistence
- ✅ Invalid code handling

### Email Activation
- ✅ Activation with bonus points
- ✅ Visitor type selection
- ✅ Session restoration
- ✅ Duplicate prevention
- ✅ Special character handling

### Leaderboard
- ✅ Ranking display
- ✅ Time period filtering
- ✅ Current user highlighting
- ✅ Opt-out preferences
- ✅ Performance with many users

## Writing New Tests

### Test Template

```javascript
import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers.js';
import { NotionTestHelpers } from '../utils/notion-helpers.js';

test.describe('Feature Name', () => {
  let helpers;
  let notionHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    notionHelpers = new NotionTestHelpers();
  });

  test.afterEach(async () => {
    await notionHelpers.cleanupTestData();
  });

  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

### Best Practices

1. **Use Helper Functions**: Leverage existing helpers for common operations
2. **Clean Up Test Data**: Always track and clean up test data
3. **Wait for Elements**: Use proper waits instead of arbitrary timeouts
4. **Test Real APIs**: Avoid mocking unless testing error scenarios
5. **Descriptive Names**: Use clear test descriptions
6. **Isolation**: Each test should be independent

## Debugging Tests

### Debug Mode
```bash
npm run test:e2e:debug
```
- Slows down execution
- Opens browser DevTools
- Allows stepping through tests

### Screenshots
Failed tests automatically capture screenshots in `screenshots/` directory.

### Traces
Playwright traces are saved on test failure in `test-results/artifacts/`.

### View Traces
```bash
npx playwright show-trace test-results/artifacts/trace.zip
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '22'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Install Playwright
      run: npx playwright install --with-deps
      
    - name: Run E2E tests
      env:
        NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}
        NOTION_DATABASE_ID: ${{ secrets.NOTION_TEST_DATABASE_ID }}
        NOTION_GAMIFICATION_DB_ID: ${{ secrets.NOTION_TEST_GAMIFICATION_DB_ID }}
      run: npm run test:e2e:ci
      
    - name: Upload test results
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: test-results
        path: test-results/
```

## Troubleshooting

### Common Issues

1. **Dev server not running**
   ```bash
   # Run in separate terminal
   npm run both
   ```

2. **Missing environment variables**
   - Check `.env.test` file exists
   - Verify all required variables are set

3. **Test timeouts**
   - Increase timeout in test config
   - Check network connectivity
   - Verify API endpoints are responsive

4. **Flaky tests**
   - Add explicit waits
   - Check for race conditions
   - Use retry mechanisms

### Performance Tips

1. Run tests in parallel when possible
2. Use headed mode only for debugging
3. Minimize test data creation
4. Reuse test users where appropriate
5. Clean up data promptly

## Maintenance

### Regular Tasks

1. **Update Dependencies**
   ```bash
   npm update @playwright/test
   npx playwright install
   ```

2. **Review Flaky Tests**
   - Monitor test failure rates
   - Fix or remove unreliable tests

3. **Clean Test Data**
   - Periodically clean orphaned test data
   - Review Notion databases for test entries

4. **Update Selectors**
   - Keep selectors in sync with UI changes
   - Use data-testid attributes when possible
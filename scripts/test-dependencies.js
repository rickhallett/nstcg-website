import { google } from 'googleapis';
import mjml2html from 'mjml';

// We'll test compilation after fixing the import issue
// import { compileActivationEmail } from './compile-email.js';

console.log('Testing dependency imports...\n');

// Test googleapis import
try {
  console.log('✅ googleapis imported successfully');
  console.log(`   Version: ${google.VERSION || 'version info not available'}`);
  
  // Test Gmail API availability
  const gmail = google.gmail('v1');
  console.log('✅ Gmail API v1 available');
} catch (error) {
  console.error('❌ googleapis import failed:', error.message);
}

// Test mjml import
try {
  const testMjml = `
    <mjml>
      <mj-body>
        <mj-section>
          <mj-column>
            <mj-text>Test</mj-text>
          </mj-column>
        </mj-section>
      </mj-body>
    </mjml>
  `;
  
  const { html, errors } = mjml2html(testMjml);
  if (html && errors.length === 0) {
    console.log('✅ mjml imported and working correctly');
  } else {
    console.log('⚠️  mjml imported but has warnings:', errors);
  }
} catch (error) {
  console.error('❌ mjml import failed:', error.message);
}

// Test email template compilation (will test separately)
console.log('⏭️  Email template compilation will be tested separately');

console.log('\nDependency test complete!');
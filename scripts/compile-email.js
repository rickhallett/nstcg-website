import mjml from 'mjml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Compile MJML email template to HTML
 * @param {string} templatePath - Path to MJML template
 * @param {object} variables - Variables to substitute in template
 * @returns {string} Compiled HTML
 */
function compileEmailTemplate(templatePath, variables = {}) {
  try {
    // Read MJML template
    const mjmlTemplate = fs.readFileSync(templatePath, 'utf8');

    // Substitute variables in template
    let processedTemplate = mjmlTemplate;
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedTemplate = processedTemplate.replace(regex, variables[key]);
    });

    // Compile MJML to HTML
    const { html, errors } = mjml(processedTemplate, {
      validationLevel: 'soft', // Allow some flexibility
      fonts: {
        'Arial': 'https://fonts.googleapis.com/css?family=Arial'
      }
    });

    if (errors.length > 0) {
      console.warn('MJML compilation warnings:');
      errors.forEach(error => console.warn(`- ${error.message}`));
    }

    return html;
  } catch (error) {
    console.error('Error compiling MJML template:', error);
    throw error;
  }
}

/**
 * Generate sample email with test data
 */
function generateSampleEmail() {
  const templatePath = path.join(__dirname, '../email/activate.mjml');
  const outputPath = path.join(__dirname, '../email/activate-compiled.html');

  const sampleVariables = {
    user_email: encodeURIComponent('test@example.com'),
    bonus: '75'
  };

  try {
    const compiledHtml = compileEmailTemplate(templatePath, sampleVariables);
    fs.writeFileSync(outputPath, compiledHtml);
    console.log(`✅ Sample email compiled successfully!`);
    console.log(`📧 Output: ${outputPath}`);
    console.log(`🌐 Open in browser to preview`);
  } catch (error) {
    console.error('❌ Failed to compile sample email:', error.message);
  }
}

/**
 * Compile email for campaign use
 * @param {string} userEmail - User's email address
 * @param {number} bonusPoints - Bonus points for user
 * @returns {string} Compiled HTML
 */
function compileActivationEmail(userEmail, bonusPoints = 75) {
  const templatePath = path.join(__dirname, '../email/activate.mjml');

  const variables = {
    user_email: encodeURIComponent(userEmail),
    bonus: bonusPoints.toString()
  };

  return compileEmailTemplate(templatePath, variables);
}

// Export functions for use in other scripts
export {
  compileEmailTemplate,
  compileActivationEmail
};

// If run directly, generate sample email
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Compiling MJML email template...\n');
  generateSampleEmail();
} 
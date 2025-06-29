import { compileEmailTemplate } from './compile-email.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Compile email template with given template name and variables
 * @param {string} templateName - Name of template (e.g., 'activate')
 * @param {object} variables - Variables to substitute
 * @returns {object} { html: string, errors: array }
 */
export function compileEmail(templateName, variables = {}) {
  try {
    const templatePath = path.join(__dirname, `../email/${templateName}.mjml`);
    const html = compileEmailTemplate(templatePath, variables);
    return { html, errors: [] };
  } catch (error) {
    return { 
      html: '', 
      errors: [error.message] 
    };
  }
}

// Also export the original function for compatibility
export { compileActivationEmail } from './compile-email.js';
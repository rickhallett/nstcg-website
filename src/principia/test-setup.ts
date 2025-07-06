/**
 * Test setup for Principia.js
 * Sets up DOM environment for testing
 */

import { GlobalRegistrator } from '@happy-dom/global-registrator';

// Register Happy DOM globally
GlobalRegistrator.register();

// Make sure we have a document.body
if (!document.body) {
  document.body = document.createElement('body');
}
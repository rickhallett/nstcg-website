// Main entry point for Vite build system
// This file imports and initializes all required modules

// Import CSS (Vite will handle bundling)
import '../css/main.css'

// Core utilities and configuration
import './utils/feature-flags.js'
import './utils/include-nav.js'

// Referral utilities (global)
import './modules/referral-utils.js'

// Homepage features
import './modules/homepage-features.js'

// Main application logic
import './main.js'

// Global initialization
console.log('NSTCG Website initialized via Vite')
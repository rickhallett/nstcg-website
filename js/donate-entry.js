// Donate page entry point for Vite build system

// Import CSS
import '../css/main.css'
import '../css/pages/donate.css'

// Core utilities and configuration
import './utils/feature-flags.js'
import './utils/include-nav.js'

// Referral utilities
import './modules/referral-utils.js'

// Donate page specific modules
import './modules/donate-features.js'
import './donate.js'

console.log('Donate page initialized via Vite')
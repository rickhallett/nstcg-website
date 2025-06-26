// Feeds page entry point for Vite build system

// Import CSS
import '../css/main.css'
import '../css/pages/feeds.css'

// Core utilities and configuration  
import './utils/feature-flags.js'
import './utils/include-nav.js'

// Referral utilities
import './modules/referral-utils.js'

// Feeds page specific modules
import './modules/feeds-page.js'

console.log('Feeds page initialized via Vite')
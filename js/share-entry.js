// Share page entry point for Vite build system

// Import CSS
import '../css/main.css'

// Core utilities and configuration
import './utils/feature-flags.js'
import './utils/include-nav.js'

// Referral utilities
import './modules/referral-utils.js'

// Share page specific modules
import './modules/share-features.js'  
import './modules/share-functionality.js'

console.log('Share page initialized via Vite')
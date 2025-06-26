// Leaderboard page entry point for Vite build system

// Import CSS
import '../css/main.css'
import '../css/components/gamification.css'

// Core utilities and configuration
import './utils/feature-flags.js'
import './utils/include-nav.js'

// Referral utilities
import './modules/referral-utils.js'

// Leaderboard page specific modules
import './modules/leaderboard-features.js'
import './modules/leaderboard.js'

console.log('Leaderboard page initialized via Vite')
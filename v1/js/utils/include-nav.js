/**
 * Navigation Include Utility
 * Dynamically includes the navigation component in pages
 */

/**
 * Load and insert navigation HTML
 */
async function includeNavigation() {
  try {
    // Check if navigation placeholder exists
    const navPlaceholder = document.getElementById('navigation-placeholder');
    if (!navPlaceholder) {
      console.warn('Navigation placeholder not found');
      return;
    }

    // Fetch navigation HTML
    const response = await fetch('/components/navigation.html');
    if (!response.ok) {
      throw new Error(`Failed to load navigation: ${response.status}`);
    }

    const navHTML = await response.text();
    
    // Insert navigation HTML
    navPlaceholder.outerHTML = navHTML;
    
    // Now that the HTML is in the DOM, import and initialize the modules
    const { default: navigationManager } = await import('../modules/navigation.js');
    const { initNavigationFeatures } = await import('../modules/navigation-features.js');
    
    // Initialize them in order
    navigationManager.init();
    await initNavigationFeatures();
    
    console.log('Navigation loaded and initialized successfully');
  } catch (error) {
    console.error('Error loading navigation:', error);
    
    // Fallback: Create basic navigation
    createFallbackNavigation();
  }
}

/**
 * Create fallback navigation if component fails to load
 */
function createFallbackNavigation() {
  const navPlaceholder = document.getElementById('navigation-placeholder');
  if (!navPlaceholder) return;
  
  const fallbackNav = `
    <nav class="main-nav" id="main-navigation">
      <div class="nav-container">
        <a href="/" class="nav-logo">
          <span class="logo-text">NSTCG</span>
        </a>
        <p style="color: white; margin: 0;">Navigation loading failed</p>
      </div>
    </nav>
  `;
  
  navPlaceholder.outerHTML = fallbackNav;
}

// Auto-load navigation when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', includeNavigation);
} else {
  includeNavigation();
}

// Export for manual use
export { includeNavigation };
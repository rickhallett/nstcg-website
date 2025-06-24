/**
 * UI configuration constants
 * @module UiConfig
 */

// Color palette
export const Colors = {
  // Primary colors
  primary: '#3498db',
  primaryDark: '#2980b9',
  secondary: '#e74c3c',
  secondaryDark: '#c0392b',
  
  // Neutral colors
  black: '#000',
  white: '#fff',
  gray: {
    light: '#f8f9fa',
    medium: '#6c757d',
    dark: '#343a40'
  },
  
  // Alert colors
  success: '#2ecc71',
  warning: '#f39c12',
  danger: '#e74c3c',
  info: '#3498db',
  
  // Background colors
  backgroundDark: '#000',
  backgroundLight: '#fff',
  backgroundOverlay: 'rgba(0, 0, 0, 0.3)',
  backgroundGradient: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)'
};

// Typography
export const Typography = {
  fontFamily: {
    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    monospace: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace'
  },
  fontSize: {
    xs: '11px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '24px',
    xxl: '32px',
    xxxl: '48px'
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    bold: 700,
    black: 900
  },
  lineHeight: {
    tight: 1,
    normal: 1.5,
    relaxed: 1.75
  }
};

// Spacing
export const Spacing = {
  xs: '4px',
  sm: '8px',
  md: '15px',
  lg: '20px',
  xl: '30px',
  xxl: '50px',
  xxxl: '100px'
};

// Breakpoints
export const Breakpoints = {
  xs: '320px',
  sm: '576px',
  md: '768px',
  lg: '992px',
  xl: '1200px',
  xxl: '1400px'
};

// Z-index layers
export const ZIndex = {
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modalBackdrop: 400,
  modal: 500,
  popover: 600,
  tooltip: 700,
  notification: 800,
  highest: 999
};

// Animation
export const Animation = {
  duration: {
    fast: '200ms',
    normal: '300ms',
    slow: '500ms',
    verySlow: '1000ms'
  },
  easing: {
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  }
};

// Border
export const Border = {
  radius: {
    sm: '4px',
    md: '8px',
    lg: '15px',
    xl: '20px',
    round: '50%',
    pill: '9999px'
  },
  width: {
    thin: '1px',
    medium: '2px',
    thick: '4px'
  }
};

// Shadow
export const Shadow = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.1)',
  md: '0 2px 4px rgba(0, 0, 0, 0.1)',
  lg: '0 4px 8px rgba(0, 0, 0, 0.15)',
  xl: '0 8px 16px rgba(0, 0, 0, 0.2)',
  inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
  text: '0 2px 4px rgba(0, 0, 0, 0.3)'
};

// Component-specific styles
export const Components = {
  button: {
    paddingX: '20px',
    paddingY: '12px',
    borderRadius: Border.radius.md,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold
  },
  input: {
    paddingX: '15px',
    paddingY: '10px',
    borderRadius: Border.radius.md,
    borderColor: Colors.gray.medium,
    focusColor: Colors.primary
  },
  modal: {
    maxWidth: '600px',
    borderRadius: Border.radius.lg,
    padding: Spacing.xl,
    backgroundColor: Colors.white
  },
  toast: {
    minWidth: '300px',
    maxWidth: '500px',
    borderRadius: Border.radius.md,
    padding: Spacing.md
  }
};

// Media query helpers
export function mediaQuery(breakpoint) {
  return `@media (min-width: ${Breakpoints[breakpoint]})`;
}

export function isMobile() {
  return window.innerWidth < parseInt(Breakpoints.md);
}

export function isDesktop() {
  return window.innerWidth >= parseInt(Breakpoints.lg);
}

export default {
  Colors,
  Typography,
  Spacing,
  Breakpoints,
  ZIndex,
  Animation,
  Border,
  Shadow,
  Components,
  mediaQuery,
  isMobile,
  isDesktop
};
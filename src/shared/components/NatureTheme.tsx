/**
 * Nature Theme - Academic & Serene Color Palette
 *
 * Inspired by nature's calming colors found in academic environments:
 * - Forest greens for focus and clarity
 * - Sage and moss tones for tranquility
 * - Warm stone and sand colors for comfort
 * - Ocean blues for depth and wisdom
 *
 * This palette creates a soothing, scholarly atmosphere that promotes
 * deep thinking and reduces eye strain during long study sessions.
 */

export const natureTheme = {
  // Primary Colors - Forest & Sage
  primary: {
    50: '#ecfdf5',  // Lightest mint
    100: '#d1fae5', // Pale sage
    200: '#a7f3d0', // Soft green
    300: '#6ee7b7', // Fresh sage
    400: '#34d399', // Vibrant mint
    500: '#10b981', // Primary emerald
    600: '#059669', // Deep emerald
    700: '#047857', // Forest green
    800: '#065f46', // Dark forest
    900: '#064e3b', // Deepest green
  },

  // Secondary Colors - Ocean & Sky
  secondary: {
    50: '#f0f9ff',  // Pale sky
    100: '#e0f2fe', // Light azure
    200: '#bae6fd', // Soft blue
    300: '#7dd3fc', // Clear sky
    400: '#38bdf8', // Ocean blue
    500: '#0ea5e9', // Primary blue
    600: '#0284c7', // Deep ocean
    700: '#0369a1', // Dark ocean
    800: '#075985', // Deepest ocean
    900: '#0c4a6e', // Midnight blue
  },

  // Accent Colors - Earth & Stone
  accent: {
    amber: '#f59e0b',     // Warm sunlight
    terracotta: '#c2410c', // Earthy clay
    sand: '#d4a574',       // Sandy beach
    clay: '#a67c52',       // Natural clay
  },

  // Neutral Colors - Stone & Sand
  neutral: {
    50: '#fafaf9',   // Off-white
    100: '#f5f5f4',  // Light stone
    200: '#e7e5e4',  // Soft gray
    300: '#d6d3d1',  // Medium stone
    400: '#a8a29e',  // Warm gray
    500: '#78716c',  // Stone gray
    600: '#57534e',  // Dark stone
    700: '#44403c',  // Deep stone
    800: '#292524',  // Almost black
    900: '#1c1917',  // Black stone
  },

  // Semantic Colors
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#0ea5e9',

  // Typography
  fonts: {
    heading: '"Crimson Pro", "Source Serif Pro", Georgia, serif',
    body: '"Atkinson Hyperlegible", "Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
  },
};

// CSS custom properties for runtime theme switching
export const natureThemeVars = {
  light: {
    '--primary-50': '#ecfdf5',
    '--primary-100': '#d1fae5',
    '--primary-200': '#a7f3d0',
    '--primary-300': '#6ee7b7',
    '--primary-400': '#34d399',
    '--primary-500': '#10b981',
    '--primary-600': '#059669',
    '--primary-700': '#047857',
    '--primary-800': '#065f46',
    '--primary-900': '#064e3b',

    '--bg-primary': '#fafaf9',
    '--bg-secondary': '#ffffff',
    '--bg-tertiary': '#f5f5f4',
    '--bg-card': '#ffffff',
    '--bg-hover': '#f5f5f4',

    '--text-primary': '#1c1917',
    '--text-secondary': '#44403c',
    '--text-tertiary': '#78716c',
    '--text-muted': '#a8a29e',

    '--border-light': '#e7e5e4',
    '--border-medium': '#d6d3d1',
    '--border-dark': '#a8a29e',

    '--shadow-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    '--shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    '--shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  },

  dark: {
    '--primary-50': '#064e3b',
    '--primary-100': '#065f46',
    '--primary-200': '#047857',
    '--primary-300': '#059669',
    '--primary-400': '#10b981',
    '--primary-500': '#34d399',
    '--primary-600': '#6ee7b7',
    '--primary-700': '#a7f3d0',
    '--primary-800': '#d1fae5',
    '--primary-900': '#ecfdf5',

    '--bg-primary': '#1c1917',
    '--bg-secondary': '#292524',
    '--bg-tertiary': '#44403c',
    '--bg-card': '#292524',
    '--bg-hover': '#44403c',

    '--text-primary': '#fafaf9',
    '--text-secondary': '#d6d3d1',
    '--text-tertiary': '#a8a29e',
    '--text-muted': '#78716c',

    '--border-light': '#44403c',
    '--border-medium': '#57534e',
    '--border-dark': '#78716c',

    '--shadow-sm': '0 1px 2px 0 rgb(0 0 0 / 0.3)',
    '--shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
    '--shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
  },
};

// Utility function to apply theme
export const applyNatureTheme = (isDark: boolean): void => {
  const theme = isDark ? natureThemeVars.dark : natureThemeVars.light;
  const root = document.documentElement;

  Object.entries(theme).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
};

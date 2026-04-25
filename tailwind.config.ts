import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // CSS variables drive theme switching. Light mode is the default.
        snit: {
          bg: 'rgb(var(--snit-bg) / <alpha-value>)',
          surface: 'rgb(var(--snit-surface) / <alpha-value>)',
          border: 'rgb(var(--snit-border) / <alpha-value>)',
          fg: 'rgb(var(--snit-fg) / <alpha-value>)',
          muted: 'rgb(var(--snit-muted) / <alpha-value>)',
          accent: 'rgb(var(--snit-accent) / <alpha-value>)',
          live: 'rgb(var(--snit-live) / <alpha-value>)',
          ended: 'rgb(var(--snit-ended) / <alpha-value>)',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
} satisfies Config;

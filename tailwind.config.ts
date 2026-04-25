import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // snit palette — sharp, monochrome with one warm accent
        snit: {
          bg: '#0A0A0A',          // near-black, same energy as Chartist
          surface: '#141414',
          border: '#262626',
          fg: '#F5F5F5',
          muted: '#737373',
          accent: '#FF5C29',       // sharp orange — quick, snap-like
          live: '#22C55E',
          ended: '#737373',
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

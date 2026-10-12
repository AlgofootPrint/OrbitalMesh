/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'ui-sans-serif', 'system-ui'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
        sans: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        void: '#0F0F11',
        background: '#0F0F11',
        foreground: '#EEEEEF',
        panel: '#17171B',
        muted: '#1D1D22',
        'muted-foreground': '#A0A0AB',
        border: '#2A2A2F',
        popover: '#17171B',
        'popover-foreground': '#EEEEEF',
        signal: '#D7A13B',
        signalSoft: '#F0C36A',
        danger: '#ef4444',
        plasma: '#C76B4A',
      },
      boxShadow: {
        panel: '0 0 0 1px rgba(255,255,255,0.02), 0 18px 40px rgba(0,0,0,0.28)',
        amber: '0 0 22px rgba(245, 158, 11, 0.12)',
        cyan: '0 0 24px rgba(34, 211, 238, 0.18)',
      },
    },
  },
  plugins: [],
};

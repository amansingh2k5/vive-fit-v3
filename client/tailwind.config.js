/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#0f172a',
        surface:  '#1e293b',
        surface2: '#273548',
        border:   'rgba(255,255,255,0.08)',
        neon:     '#adff2f',
        electric: '#00f2ff',
        pink:     '#ff007f',
        muted:    '#64748b',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        body:    ['"DM Sans"', 'sans-serif'],
      },
      backgroundImage: {
        'neon-gradient':  'linear-gradient(135deg, #adff2f, #00f2ff)',
        'pink-gradient':  'linear-gradient(135deg, #ff007f, #00f2ff)',
        'card-glass':     'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
      },
      boxShadow: {
        neon:     '0 0 20px rgba(173,255,47,0.3)',
        electric: '0 0 20px rgba(0,242,255,0.3)',
        pink:     '0 0 20px rgba(255,0,127,0.3)',
        card:     '0 4px 24px rgba(0,0,0,0.4)',
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: 0, transform: 'translateY(16px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        pulse_neon: {
          '0%,100%': { boxShadow: '0 0 10px rgba(173,255,47,0.3)' },
          '50%':     { boxShadow: '0 0 30px rgba(173,255,47,0.7)' },
        },
      },
      animation: {
        'fade-up':    'fade-up 0.4s ease both',
        'pulse-neon': 'pulse_neon 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

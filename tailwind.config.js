export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'sans-serif'],
        display: ['"Sora"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ink: {
          950: '#0b0e14',
          900: '#101420',
          800: '#151b2b',
          700: '#1c2436',
        },
        glass: {
          100: 'rgba(255, 255, 255, 0.06)',
          200: 'rgba(255, 255, 255, 0.1)',
          300: 'rgba(255, 255, 255, 0.16)',
        },
        brand: {
          50: '#f3fbf7',
          100: '#d9f4e4',
          200: '#b1e9cc',
          300: '#7bdcb1',
          400: '#4bcf99',
          500: '#1fbf7f',
          600: '#159c66',
          700: '#117a52',
          800: '#0f5f41',
          900: '#0d4a33',
        },
        accent: {
          50: '#fff4e6',
          100: '#ffe6c8',
          200: '#ffd29a',
          300: '#ffb861',
          400: '#ff9b32',
          500: '#ff7b0a',
          600: '#e86200',
          700: '#c24d00',
          800: '#9b3e03',
          900: '#7c3306',
        },
      },
      backgroundImage: {
        'aurora':
          'radial-gradient(1200px 600px at 10% -10%, rgba(31, 191, 127, 0.45), transparent 60%), radial-gradient(900px 600px at 110% 10%, rgba(255, 123, 10, 0.38), transparent 55%), radial-gradient(900px 600px at 40% 120%, rgba(51, 187, 255, 0.35), transparent 60%)',
        'glass-sheen':
          'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
      },
      boxShadow: {
        'glow': '0 25px 80px rgba(31, 191, 127, 0.28)',
        'card': '0 24px 60px rgba(10, 12, 20, 0.45)',
        'soft': '0 10px 30px rgba(0, 0, 0, 0.12)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: 0.6 },
          '50%': { opacity: 1 },
        },
      },
      animation: {
        float: 'float 12s ease-in-out infinite',
        shimmer: 'shimmer 2.8s linear infinite',
        pulseSoft: 'pulseSoft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

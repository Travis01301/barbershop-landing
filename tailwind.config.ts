import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './barbershop-landing/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light mode palette
        'primary': '#0F172A', // Deep navy
        'accent': '#FF6B35', // Bold orange
        'success': '#2DD4BF', // Teal
        'warning': '#FBBF24', // Amber
        'danger': '#EF4444', // Red
        
        // Dark mode overrides
        'dark': {
          'bg-primary': '#050E1F', // Darker navy
          'bg-secondary': '#0F172A', // Deep navy
          'bg-tertiary': '#1E293B', // Slate-900
          'text-primary': '#F1F5F9', // Slate-100
          'text-secondary': '#CBD5E1', // Slate-300
          'border': '#334155', // Slate-700
          'input-bg': '#1E293B', // Slate-900
        },
        
        'slate': {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        }
      },
      backgroundColor: {
        'light': '#ffffff',
        'dark-primary': '#050E1F',
        'dark-secondary': '#0F172A',
        'dark-tertiary': '#1E293B',
      },
      textColor: {
        'dark-primary': '#F1F5F9',
        'dark-secondary': '#CBD5E1',
      },
      borderColor: {
        'dark': '#334155',
      },
      fontFamily: {
        'sans': ['Outfit', 'system-ui', 'sans-serif'],
        'display': ['Space Mono', 'monospace'],
        'mono': ['Fira Code', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
        '160': '40rem',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(255, 107, 53, 0.3)',
        'glow-teal': '0 0 20px rgba(45, 212, 191, 0.3)',
        'card': '0 4px 6px rgba(0, 0, 0, 0.07), 0 10px 13px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 20px 25px rgba(0, 0, 0, 0.1), 0 25px 50px rgba(0, 0, 0, 0.1)',
        'dark-card': '0 4px 6px rgba(0, 0, 0, 0.3), 0 10px 13px rgba(0, 0, 0, 0.2)',
        'dark-card-hover': '0 20px 25px rgba(0, 0, 0, 0.4), 0 25px 50px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
}
export default config

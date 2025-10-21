/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}', './test/**/*.{js,jsx,ts,tsx}'],
  safelist: [
    {
      pattern: /(bg|text|border)-(primary|emerald|amber)-(100|200|300|400|500)/
    },
    {
      pattern: /(bg|text|border)-white\/1[0-5]/
    },
    {
      pattern: /(ring|shadow)-(primary|emerald|amber)-(100|200|300|400|500)/
    }
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
        xl: '3rem'
      }
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2D62FF',
          dark: '#1F3BB3',
          light: '#8CA9FF'
        },
        accent: '#FF7A59',
        slate: {
          950: '#0D1224'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui']
      },
      borderRadius: {
        '4xl': '2.5rem'
      },
      boxShadow: {
        card: '0 20px 45px -20px rgba(45, 98, 255, 0.35)'
      },
      backgroundImage: {
        'community-gradient': 'linear-gradient(135deg, rgba(45, 98, 255, 0.9), rgba(79, 70, 229, 0.85))'
      },
      ringColor: {
        focus: 'rgba(45, 98, 255, 0.35)'
      },
      ringWidth: {
        3: '3px'
      },
      transitionTimingFunction: {
        'enter-velocity': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'exit-velocity': 'cubic-bezier(0.7, 0, 0.84, 0)'
      }
    }
  },
  plugins: []
};

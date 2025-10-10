/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
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
      }
    }
  },
  plugins: []
};

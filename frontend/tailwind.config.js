/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        // Identidad SGB: azul institucional #0044A3 (mapea la escala "teal" usada en la app)
        teal: {
          50: '#eef4fb',
          100: '#d9e6f7',
          200: '#b0c9ec',
          300: '#84a9de',
          400: '#3f76c0',
          500: '#1d5cad',
          600: '#1250a6',
          700: '#0044A3',
          800: '#0a3b86',
          900: '#0a2f68',
          950: '#08234d',
        },
        brand: {
          azul: '#0044A3',
          'azul-oscuro': '#0a2f68',
          menta: '#81D4A6',
          'menta-oscuro': '#5cbc85',
        },
      },
    },
  },
  plugins: [],
};
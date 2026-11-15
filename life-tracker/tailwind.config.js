/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        ivory: '#FFFDF8',
        cream: '#F7F1E8',
        blush: { 50: '#FDF6F7', 100: '#F9E9EC', 200: '#F2D3D9', 300: '#E7B5C0', 400: '#D68E9F', 500: '#C06C82', 600: '#A2536A', 700: '#7F3F52' },
        taupe: { 100: '#EFE8E0', 200: '#DDD1C4', 300: '#C4B3A2', 400: '#A8968A', 500: '#8B796C', 600: '#6E5F54', 700: '#54473F', 800: '#3B322C', 900: '#2A2320' },
        sage: { 50: '#F2F6F0', 100: '#E3ECDF', 200: '#C9DAC2', 300: '#A9C3A0', 400: '#88A97F', 500: '#6C8F64', 600: '#56764F', 700: '#435C3E' },
        night: { 900: '#171312', 800: '#201B1A', 700: '#2A2322', 600: '#3A302E', 500: '#4D413E' },
        strength: '#C4577E',
        pilates: '#5B6FB0',
        cardio: '#B8862C',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(84,71,63,0.04), 0 8px 24px -12px rgba(84,71,63,0.18)',
      },
      keyframes: {
        rise: { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'none' } },
        pop: { '0%': { transform: 'scale(.92)' }, '60%': { transform: 'scale(1.06)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: { rise: 'rise .35s ease-out both', pop: 'pop .3s ease-out' },
    },
  },
  plugins: [],
};

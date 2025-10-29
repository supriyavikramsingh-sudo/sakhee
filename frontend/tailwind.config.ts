export default {
  content: ['./index.html', './src/**/*.{ts,tsx,css}'],
  theme: {
    extend: {
      colors: {
        primaryDark: '#e85a5a', // Dark Pink
        primary: '#ff8d8d', // Light Pink
        secondary: '#FFE2E2', // Light Pink
        accent: '#ffb3b3', // Lighter Pink
        background: '#FFFDEC', // Light Cream
        surface: '#fff', // White
        success: '#06d6a0', // Teal
        warning: '#ff8b2e', // Orange
        danger: '#ff006e', // Red
        muted: '#9a8c98', // Gray
      },
      fontFamily: {
        sans: ['Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

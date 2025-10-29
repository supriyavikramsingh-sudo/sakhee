export default {
  content: ['./index.html', './src/**/*.{ts,tsx,css}'],
  theme: {
    extend: {
      colors: {
        // primary: '#9d4edd', // Purple
        primary: '#ff8d8d', // Light Pink
        // secondary: '#5a189a', // Dark Purple
        secondary: '#FFE2E2', // Light Pink
        // accent: '#c77dff', // Light Purple
        accent: '#ffb3b3', // Lighter Pink
        // background: '#f5f1f9', // Light Lavender
        background: '#FFFDEC', // Light Cream
        // surface: '#ede7f6', // Softer Lavender
        // surface: '#fff0f0', // Very Light Pink
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

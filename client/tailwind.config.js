export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#9d4edd',    // Purple
        secondary: '#5a189a',   // Dark Purple
        accent: '#c77dff',      // Light Purple
        background: '#f5f1f9',  // Light Lavender
        surface: '#ede7f6',     // Softer Lavender
        success: '#06d6a0',     // Teal
        warning: '#ff8b2e',     // Orange
        danger: '#ff006e',      // Red
        muted: '#9a8c98'        // Gray
      },
      fontFamily: {
        sans: ['Segoe UI', 'Roboto', 'sans-serif']
      }
    }
  },
  plugins: []
};
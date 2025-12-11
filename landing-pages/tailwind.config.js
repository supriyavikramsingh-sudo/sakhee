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
      animation: {
        blob: 'blob 7s infinite',
        gradient: 'gradient 8s linear infinite',
        fadeIn: 'fadeIn 0.5s ease-in',
        slideDown: 'slideDown 0.3s ease-out',
      },
      keyframes: {
        blob: {
          '0%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
          '33%': {
            transform: 'translate(30px, -50px) scale(1.1)',
          },
          '66%': {
            transform: 'translate(-20px, 20px) scale(0.9)',
          },
          '100%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
        },
        gradient: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center',
          },
        },
        fadeIn: {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        slideDown: {
          '0%': {
            opacity: '0',
            transform: 'translateY(-10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
    },
  },
  plugins: [],
};

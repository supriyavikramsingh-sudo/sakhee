// ============================================
// FILE: client/src/config.js
// ============================================
/**
 * Frontend Configuration
 * All environment variables and app settings
 */

export const config = {
  // ============================================
  // API CONFIGURATION
  // ============================================
  API_BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  API_TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10),

  // ============================================
  // APP METADATA
  // ============================================
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Sakhee',
  APP_VERSION: import.meta.env.VITE_VERSION || '1.0.0',
  APP_DESCRIPTION: 'AI-powered PCOS Management Assistant for Indian Women',

  // ============================================
  // THEME CONFIGURATION
  // ============================================
  theme: {
    colors: {
      primary: '#9d4edd', // Purple
      secondary: '#5a189a', // Dark Purple
      accent: '#c77dff', // Light Purple
      background: '#f5f1f9', // Light Lavender
      surface: '#ede7f6', // Softer Lavender
      success: '#06d6a0', // Teal
      warning: '#ff8b2e', // Orange
      danger: '#ff006e', // Red
      info: '#48bfe3', // Blue
      muted: '#9a8c98', // Gray
    },
    fontFamily: {
      sans: ['Segoe UI', 'Roboto', 'sans-serif'],
      mono: ['Fira Code', 'monospace'],
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem',
    },
  },

  // ============================================
  // FEATURE FLAGS
  // ============================================
  features: {
    chat: true,
    meals: true,
    progress: true,
    community: true,
    reports: true,
    telemedicine: false, // Future feature
    pharmacy: false, // Future feature
    forum: false, // Future feature
  },

  // ============================================
  // STORAGE CONFIGURATION
  // ============================================
  storage: {
    prefix: 'sakhee_',
    useIndexedDB: true,
    useLocalStorage: false, // Per requirements: no localStorage for health data
    encryptSensitiveData: true,
  },

  // ============================================
  // LOCALIZATION
  // ============================================
  defaultLanguage: 'en',
  supportedLanguages: [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  ],

  // ============================================
  // UI CONFIGURATION
  // ============================================
  ui: {
    itemsPerPage: 10,
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    supportedFileTypes: ['pdf', 'docx', 'jpeg', 'jpg', 'png'],
    animationDuration: 300, // milliseconds
    toastDuration: 5000, // milliseconds
    maxChatMessages: 100,
    enableAnimations: true,
    enableSoundEffects: false,
  },

  // ============================================
  // VALIDATION RULES
  // ============================================
  validation: {
    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address',
    },
    password: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
    },
    age: {
      min: 18,
      max: 45,
    },
    budget: {
      min: 100,
      max: 500,
    },
  },

  // ============================================
  // CHAT CONFIGURATION
  // ============================================
  chat: {
    maxMessageLength: 2000,
    enableMarkdown: true,
    enableEmojis: true,
    showTypingIndicator: true,
    messageBatchSize: 20,
    autoScrollToBottom: true,
  },

  // ============================================
  // MEAL PLANNING
  // ============================================
  meals: {
    defaultDuration: 7, // days
    minBudget: 100, // ₹ per day
    maxBudget: 500, // ₹ per day
    defaultMealsPerDay: 3,
    regions: [
      { value: 'north-india', label: 'North Indian' },
      { value: 'south-india', label: 'South Indian' },
      { value: 'east-india', label: 'East Indian' },
      { value: 'west-india', label: 'West Indian' },
    ],
    dietTypes: [
      { value: 'vegetarian', label: 'Vegetarian' },
      { value: 'non-vegetarian', label: 'Non-vegetarian' },
      { value: 'vegan', label: 'Vegan' },
      { value: 'jain', label: 'Jain' },
      { value: 'eggetarian', label: 'Eggetarian' },
    ],
  },

  // ============================================
  // ONBOARDING
  // ============================================
  onboarding: {
    totalSteps: 5,
    requiredFields: [
      'email',
      'age',
      'location',
      'diagnosisTime',
      'dietType',
      'goals',
      'income',
      'language',
    ],
    optionalFields: [
      'phone',
      'symptoms',
      'allergies',
      'activityLevel',
      'medications',
      'healthConditions',
    ],
  },

  // ============================================
  // ANALYTICS (Privacy-safe)
  // ============================================
  analytics: {
    enabled: false, // Disabled for privacy
    anonymizeIp: true,
    trackPageViews: true,
    trackErrors: true,
    trackUserActions: false, // No tracking of health data
  },

  // ============================================
  // SECURITY
  // ============================================
  security: {
    enableCSP: true,
    enableXSSProtection: true,
    enableClickjacking: true,
    sessionTimeout: 3600000, // 1 hour in milliseconds
    maxLoginAttempts: 5,
  },

  // ============================================
  // MEDICAL DISCLAIMERS
  // ============================================
  disclaimers: {
    showOnFirstVisit: true,
    showInChat: true,
    showOnReports: true,
    requireAcknowledgment: true,
  },

  // ============================================
  // DEVELOPMENT / DEBUG
  // ============================================
  dev: {
    enableDebugMode: import.meta.env.DEV || false,
    showAPILogs: import.meta.env.DEV || false,
    mockAPIResponses: false,
    bypassAuth: false,
  },

  // ============================================
  // EXTERNAL SERVICES
  // ============================================
  services: {
    reddit: {
      enabled: true,
      cacheTimeout: 3600000, // 1 hour
    },
    serp: {
      enabled: true,
      cacheTimeout: 3600000, // 1 hour
    },
  },
};

// Freeze config to prevent modifications
Object.freeze(config);

// Default export
export default config;

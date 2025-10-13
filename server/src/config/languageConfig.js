export const languageConfig = {
  supported: [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  ],

  default: 'en',

  // Regional cuisine mappings
  regionalCuisines: {
    'north-india': {
      languages: ['hi', 'gu', 'mr'],
      cuisines: ['North Indian', 'Rajasthani', 'Gujarati'],
      staples: [
        'Roti',
        'Rice',
        'Bajra',
        'Jowar',
        'Wheat',
        'Lentils',
        'Besan',
        'Dal',
        'Aloo',
        'Baingan',
        'Lauki',
        'Choley',
        'Rajma',
        'Bhindi',
        'Paneer',
        'Ghee',
        'Parwal',
      ],
    },
    'south-india': {
      languages: ['ta', 'te', 'kn'],
      cuisines: ['South Indian', 'Tamil', 'Telugu', 'Kannada'],
      staples: ['Rice', 'Millets', 'Sambhar', 'Dosa'],
    },
    'east-india': {
      languages: ['bn'],
      cuisines: ['Bengali', 'Eastern'],
      staples: ['Rice', 'Fish', 'Mustard Oil'],
    },
    'west-india': {
      languages: ['gu', 'mr'],
      cuisines: ['Gujarati', 'Marathi', 'Goan'],
      staples: ['Millets', 'Peanuts', 'Coconut'],
    },
  },

  // Income brackets (India-specific)
  incomeBrackets: [
    { min: 0, max: 25000, label: '₹0 - ₹25,000' },
    { min: 25000, max: 50000, label: '₹25,000 - ₹50,000' },
    { min: 50000, max: 100000, label: '₹50,000 - ₹1L' },
    { min: 100000, max: 300000, label: '₹1L - ₹3L' },
    { min: 300000, max: Infinity, label: '> ₹3L' },
  ],

  // Major Indian cities (for onboarding autocomplete)
  indianCities: [
    'Mumbai',
    'Delhi',
    'Bangalore',
    'Hyderabad',
    'Chennai',
    'Kolkata',
    'Pune',
    'Ahmedabad',
    'Jaipur',
    'Lucknow',
    'Chandigarh',
    'Indore',
    'Thane',
    'Bhopal',
    'Visakhapatnam',
  ],
};

export default languageConfig;

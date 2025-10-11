import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Import translation files (we'll create these in Phase 10)
// For now, using placeholder structure
import en from '../i18n/en.json'
import hi from '../i18n/hi.json'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi }
    },
    lng: localStorage.getItem('language') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    }
  })

export default i18n
import { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from '../utils/i18n'
import ErrorBoundary from '../components/layout/ErrorBoundary'
import LoadingSpinner from '../components/layout/LoadingSpinner'
import ReportsPage from '../pages/ReportsPage'


// Lazy load pages
const HomePage = lazy(() => import('../pages/HomePage'))
const OnboardingPage = lazy(() => import('../pages/OnboardingPage'))
const ChatPage = lazy(() => import('../pages/ChatPage'))
const MealPlanPage = lazy(() => import('../pages/MealPlanPage'))
const ProgressPage = lazy(() => import('../pages/ProgressPage'))
const SettingsPage = lazy(() => import('../pages/SettingsPage'))

function App() {
  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <Router>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/meals" element={<MealPlanPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Router>
      </I18nextProvider>
    </ErrorBoundary>
  )
}

const NotFound = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-primary mb-4">404</h1>
      <p className="text-muted mb-6">Page not found</p>
      <a href="/" className="btn-primary">Go Home</a>
    </div>
  </div>
)

export default App
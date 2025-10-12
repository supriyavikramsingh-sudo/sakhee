import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../utils/i18n';
import ErrorBoundary from '../components/layout/ErrorBoundary';
import LoadingSpinner from '../components/layout/LoadingSpinner';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import LoginPage from '../pages/LoginPage';

// Lazy load pages
const HomePage = lazy(() => import('../pages/HomePage'));
const OnboardingPage = lazy(() => import('../pages/OnboardingPage'));
const ChatPage = lazy(() => import('../pages/ChatPage'));
const MealPlanPage = lazy(() => import('../pages/MealPlanPage'));
const ProgressPage = lazy(() => import('../pages/ProgressPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const ReportsPage = lazy(() => import('../pages/ReportsPage'));

function App() {
  const { initAuth } = useAuthStore();

  // Initialize auth listener on mount
  useEffect(() => {
    initAuth();
  }, []);

  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <Router>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <HomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <OnboardingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/meals"
                element={
                  <ProtectedRoute>
                    <MealPlanPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/progress"
                element={
                  <ProtectedRoute>
                    <ProgressPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Router>
      </I18nextProvider>
    </ErrorBoundary>
  );
}

const NotFound = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-primary mb-4">404</h1>
      <p className="text-muted mb-6">Page not found</p>
      <a href="/" className="btn-primary">
        Go Home
      </a>
    </div>
  </div>
);

export default App;

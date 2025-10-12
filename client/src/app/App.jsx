import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../utils/i18n';
import { useAuthStore } from '../store/authStore';
import ErrorBoundary from '../components/layout/ErrorBoundary';
import LoadingSpinner from '../components/layout/LoadingSpinner';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import OnboardingRoute from '../components/auth/OnboardingRoute';

// Lazy load pages
import LoginPage from '../pages/LoginPage';
import HomePage from '../pages/HomePage';
import OnboardingPage from '../pages/OnboardingPage';
import ChatPage from '../pages/ChatPage';
import MealPlanPage from '../pages/MealPlanPage';
import ProgressPage from '../pages/ProgressPage';
import ReportsPage from '../pages/ReportsPage';
import SettingsPage from '../pages/SettingsPage';

function App() {
  const { initAuth, isLoading } = useAuthStore();

  // Initialize auth listener on mount
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (isLoading) {
    return <LoadingSpinner message="Loading..." />;
  }

  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <Router>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Onboarding Route - Only accessible if NOT onboarded */}
            <Route
              path="/onboarding"
              element={
                <OnboardingRoute>
                  <OnboardingPage />
                </OnboardingRoute>
              }
            />

            {/* Protected Routes - Require auth AND onboarding */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomePage />
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
              path="/reports"
              element={
                <ProtectedRoute>
                  <ReportsPage />
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

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </I18nextProvider>
    </ErrorBoundary>
  );
}

export default App;

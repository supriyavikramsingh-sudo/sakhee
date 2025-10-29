import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { LoadingSpinner } from '../components/layout/LoadingSpinner';
import { useAuthStore } from '../store/authStore';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import OnboardingRoute from '../components/auth/OnboardingRoute';
import ErrorBoundary from '../components/layout/ErrorBoundary';
import ChatPage from '../pages/ChatPage';
import ComingSoonPage from '../pages/ComingSoonPage';
import HomePage from '../pages/HomePage';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import MealPlanPage from '../pages/MealPlanPage';
import OnboardingPage from '../pages/OnboardingPage';
import ProgressPage from '../pages/ProgressPage';
import ReportsPage from '../pages/ReportsPage';
import SettingsPage from '../pages/SettingsPage';
import i18n from '../utils/i18n';

const LandingOrHome = () => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return <LoadingSpinner />;

  return isAuthenticated ? (
    <ProtectedRoute>
      <HomePage />
    </ProtectedRoute>
  ) : (
    <LandingPage />
  );
};

const App = () => {
  const { initAuth, isLoading } = useAuthStore();

  // Initialize auth listener on mount
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/coming-soon"
              element={
                <ProtectedRoute>
                  <ComingSoonPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/onboarding"
              element={
                <OnboardingRoute>
                  <OnboardingPage />
                </OnboardingRoute>
              }
            />
            <Route path="/" element={<LandingOrHome />} />
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </I18nextProvider>
    </ErrorBoundary>
  );
};

export default App;

import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import OnboardingRoute from '../components/auth/OnboardingRoute';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import AboutUsPage from '../pages/AboutUsPage';
import ChatPage from '../pages/ChatPage';
import ComingSoonPage from '../pages/ComingSoonPage';
import HomePage from '../pages/HomePage';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import MealPlanPage from '../pages/MealPlanPage';
import OnboardingPage from '../pages/OnboardingPage';
import PricingDetailsPage from '../pages/PricingDetailsPage';
import PricingPage from '../pages/PricingPage';
import ProgressPage from '../pages/ProgressPage';
import ReportsPage from '../pages/ReportsPage';
import SettingsPageNew from '../pages/SettingsPageNew';
import Layout from '../components/layout/Layout';
import LayoutCommon from '../components/layout/LayoutCommon';

export const UnauthenticatedRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LayoutCommon />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          {/* Public Routes */}
          <Route path="/about" element={<AboutUsPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/pricing-details" element={<PricingDetailsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
};

export const AuthenticatedRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
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
              <OnboardingRoute>
                <OnboardingPage />
              </OnboardingRoute>
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
            path="/settings/*"
            element={
              <ProtectedRoute>
                <SettingsPageNew />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coming-soon"
            element={
              <ProtectedRoute>
                <ComingSoonPage />
              </ProtectedRoute>
            }
          />
          <Route path="/about" element={<AboutUsPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/pricing-details" element={<PricingDetailsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
};

import { lazy, Suspense } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import OnboardingRoute from '../components/auth/OnboardingRoute';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import Layout from '../components/layout/Layout';
import LayoutCommon from '../components/layout/LayoutCommon';

// Lazy load all page components for code splitting
const LandingPage = lazy(() => import('../pages/LandingPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const AboutUsPage = lazy(() => import('../pages/AboutUsPage'));
const PricingPage = lazy(() => import('../pages/PricingPage'));
const PricingDetailsPage = lazy(() => import('../pages/PricingDetailsPage'));
const HomePage = lazy(() => import('../pages/HomePage'));
const OnboardingPage = lazy(() => import('../pages/OnboardingPage'));
const ChatPage = lazy(() => import('../pages/ChatPage'));
const MealPlanPage = lazy(() => import('../pages/MealPlanPage'));
const ProgressPage = lazy(() => import('../pages/ProgressPage'));
const ReportsPage = lazy(() => import('../pages/ReportsPage'));
const SettingsPageNew = lazy(() => import('../pages/SettingsPageNew'));
const ComingSoonPage = lazy(() => import('../pages/ComingSoonPage'));

// Loading component for route transitions
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-pink-100 via-red-50 to-rose-100">
    <div className="text-center space-y-4">
      <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p className="text-gray-600 font-medium">Loading...</p>
    </div>
  </div>
);

export const UnauthenticatedRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LayoutCommon />}>
          <Route
            path="/"
            element={
              <Suspense fallback={<PageLoader />}>
                <LandingPage />
              </Suspense>
            }
          />
          <Route
            path="/login"
            element={
              <Suspense fallback={<PageLoader />}>
                <LoginPage />
              </Suspense>
            }
          />
          {/* Public Routes */}
          <Route
            path="/about"
            element={
              <Suspense fallback={<PageLoader />}>
                <AboutUsPage />
              </Suspense>
            }
          />
          <Route
            path="/pricing"
            element={
              <Suspense fallback={<PageLoader />}>
                <PricingPage />
              </Suspense>
            }
          />
          <Route
            path="/pricing-details"
            element={
              <Suspense fallback={<PageLoader />}>
                <PricingDetailsPage />
              </Suspense>
            }
          />
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
                <Suspense fallback={<PageLoader />}>
                  <HomePage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding"
            element={
              <OnboardingRoute>
                <Suspense fallback={<PageLoader />}>
                  <OnboardingPage />
                </Suspense>
              </OnboardingRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <ChatPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/meals"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <MealPlanPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/progress"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <ProgressPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <ReportsPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/*"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <SettingsPageNew />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/coming-soon"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <ComingSoonPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/about"
            element={
              <Suspense fallback={<PageLoader />}>
                <AboutUsPage />
              </Suspense>
            }
          />
          <Route
            path="/pricing"
            element={
              <Suspense fallback={<PageLoader />}>
                <PricingPage />
              </Suspense>
            }
          />
          <Route
            path="/pricing-details"
            element={
              <Suspense fallback={<PageLoader />}>
                <PricingDetailsPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
};

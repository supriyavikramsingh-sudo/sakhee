import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { LoadingSpinner } from '../layout/LoadingSpinner';

const OnboardingRoute = ({ children }) => {
  const { isAuthenticated, userProfile, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner message="Checking your profile..." />;
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Already onboarded - redirect to home
  if (userProfile?.onboarded === true) {
    return <Navigate to="/" replace />;
  }

  // Not onboarded - show onboarding
  return children;
};

export default OnboardingRoute;

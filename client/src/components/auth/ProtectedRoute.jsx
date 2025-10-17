import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { LoadingSpinner } from '../layout/LoadingSpinner';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, userProfile, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but not onboarded - redirect to onboarding
  if (userProfile?.onboarded === false || !userProfile?.onboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  // Authenticated and onboarded - show protected content
  return children;
};

export default ProtectedRoute;

import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import ErrorBoundary from '../components/layout/ErrorBoundary';
import { LoadingSpinner } from '../components/layout/LoadingSpinner';
import { AuthenticatedRoutes, UnauthenticatedRoutes } from '../routes/routes';
import { useAuthStore } from '../store/authStore';
import i18n from '../utils/i18n';

const App = () => {
  const { initAuth, isLoading, isAuthenticated } = useAuthStore();

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
        {isAuthenticated ? <AuthenticatedRoutes /> : <UnauthenticatedRoutes />}
      </I18nextProvider>
    </ErrorBoundary>
  );
};

export default App;

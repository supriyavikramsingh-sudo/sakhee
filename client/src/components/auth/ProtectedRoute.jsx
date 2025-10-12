import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { LoadingSpinner } from '../layout/LoadingSpinner'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return <LoadingSpinner message="Loading..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
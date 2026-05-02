import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from './LoadingScreen';

export function PublicRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen label="Carregando acesso..." />;
  }

  if (isAuthenticated) {
    const redirectTo = location.state?.from || '/dashboard';
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

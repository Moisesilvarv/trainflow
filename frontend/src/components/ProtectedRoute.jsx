import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from './LoadingScreen';

const EMAIL_PENDING_PATH = '/verify-email-pending';
const TRIAL_EXPIRED_PATH = '/trial-expired';

export function ProtectedRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <LoadingScreen label="Validando sua sessao..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!user?.emailVerified) {
    if (location.pathname !== EMAIL_PENDING_PATH) {
      return <Navigate to={EMAIL_PENDING_PATH} replace />;
    }
    return children;
  }

  if (location.pathname === EMAIL_PENDING_PATH) {
    return <Navigate to="/dashboard" replace />;
  }

  const trialExpired = user?.planStatus === 'expired' && user?.accessReason === 'trial_expired';
  if (trialExpired && location.pathname !== TRIAL_EXPIRED_PATH) {
    return <Navigate to={TRIAL_EXPIRED_PATH} replace />;
  }

  if (!trialExpired && location.pathname === TRIAL_EXPIRED_PATH) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

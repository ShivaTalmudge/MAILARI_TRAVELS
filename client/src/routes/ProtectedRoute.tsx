import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../features/auth/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, token } = useAuthStore();
  const location = useLocation();

  if (!token || !user) {
    // If we're trying to access a specific portal, redirect to its login
    const pathParts = location.pathname.split('/');
    const role = pathParts[1];
    
    if (['admin', 'customer', 'driver'].includes(role)) {
      return <Navigate to={`/login/${role}`} state={{ from: location }} replace />;
    }
    
    return <Navigate to="/login/customer" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

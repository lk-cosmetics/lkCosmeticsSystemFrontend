/**
 * Protected Route Component
 * Prevents unauthenticated users from accessing protected routes
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface ProtectedRouteProps {
  readonly children?: React.ReactNode;
  readonly redirectTo?: string;
}

export function ProtectedRoute({
  children,
  redirectTo = '/login',
}: Readonly<ProtectedRouteProps>) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to={redirectTo} replace />;
  }

  // Render children or Outlet for nested routes
  return children ? <>{children}</> : <Outlet />;
}

export default ProtectedRoute;

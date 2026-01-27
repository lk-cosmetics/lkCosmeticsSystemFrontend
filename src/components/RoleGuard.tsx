/**
 * RoleGuard Component
 * Protects routes based on user roles
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Ban } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { hasRole, hasAnyRole } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface RoleGuardProps {
  children: ReactNode;
  requiredRole?: string;
  requiredRoles?: string[];
  requireAll?: boolean;
  redirectTo?: string;
  showAccessDenied?: boolean;
}

export default function RoleGuard({
  children,
  requiredRole,
  requiredRoles,
  requireAll = false,
  redirectTo = '/dashboard',
  showAccessDenied = true,
}: RoleGuardProps) {
  const { user, isAuthenticated } = useAuthStore();

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check single role
  if (requiredRole && !hasRole(user, requiredRole)) {
    if (showAccessDenied) {
      return (
        <div className="flex flex-1 items-center justify-center p-4">
          <Card className="p-8 max-w-md text-center">
            <Ban className="size-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-l-text-2 dark:text-d-text-2 mb-4">
              You need <strong>{requiredRole}</strong> role to access this page.
            </p>
            <Button onClick={() => window.history.back()}>Go Back</Button>
          </Card>
        </div>
      );
    }
    return <Navigate to={redirectTo} replace />;
  }

  // Check multiple roles
  if (requiredRoles && requiredRoles.length > 0) {
    const hasAccess = requireAll
      ? requiredRoles.every((role) => hasRole(user, role))
      : hasAnyRole(user, requiredRoles);

    if (!hasAccess) {
      if (showAccessDenied) {
        return (
          <div className="flex flex-1 items-center justify-center p-4">
            <Card className="p-8 max-w-md text-center">
              <Ban className="size-16 mx-auto text-red-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p className="text-l-text-2 dark:text-d-text-2 mb-4">
                You need {requireAll ? 'all of' : 'one of'} these roles to access this page:{' '}
                <strong>{requiredRoles.join(', ')}</strong>
              </p>
              <Button onClick={() => window.history.back()}>Go Back</Button>
            </Card>
          </div>
        );
      }
      return <Navigate to={redirectTo} replace />;
    }
  }

  // User has required permissions
  return <>{children}</>;
}

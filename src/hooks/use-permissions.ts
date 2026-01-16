'use client';

import { useRole } from '@/context/RoleContext';

export function usePermissions() {
  const { currentUser } = useRole();

  const hasPermission = (permission: string) => {
    if (!currentUser) {
      return false;
    }
    
    // Admin has all permissions implicitly
    if (currentUser.role === 'admin') {
        return true;
    }

    if (!currentUser.permissions) {
        return false;
    }

    return currentUser.permissions[permission] === true;
  };

  return { hasPermission };
}

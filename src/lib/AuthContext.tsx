import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_super_admin: boolean;
  force_password_change?: boolean;
}

export interface Role {
  id: string;
  name: string;
  code: string;
}

interface PermissionsData {
  user: User;
  roles: Role[];
  page_permissions: Record<string, string[]>;
  mcp_tool_permissions: string[];
}

interface AuthContextType {
  user: User | null;
  roles: Role[];
  isLoading: boolean;
  canAccessPage: (pageCode: string, actionCode?: string) => boolean;
  canUseMcpTool: (toolCode: string) => boolean;
  hasRole: (roleCode: string) => boolean;
  logout: () => void;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<PermissionsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setPermissions(null);
      setIsLoading(false);
      return;
    }
    
    try {
      const data = await apiClient.get<PermissionsData>('/api/me/permissions');
      setPermissions(data);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      // Optional: Clear token if unauthorized
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const canAccessPage = (pageCode: string, actionCode = 'VIEW') => {
    if (!permissions) return false;
    if (permissions.user.is_super_admin) return true;
    if (permissions.roles.some((r) => r.code === 'SUPER_ADMIN')) return true;
    
    const pageActions = permissions.page_permissions[pageCode];
    if (!pageActions) return false;
    
    return pageActions.includes(actionCode);
  };

  const canUseMcpTool = (toolCode: string) => {
    if (!permissions) return false;
    if (permissions.user.is_super_admin) return true;
    if (permissions.roles.some((r) => r.code === 'SUPER_ADMIN')) return true;
    
    return permissions.mcp_tool_permissions.includes(toolCode);
  };

  const hasRole = (roleCode: string) => {
    if (!permissions) return false;
    return permissions.roles.some((r) => r.code === roleCode);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setPermissions(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user: permissions?.user || null,
        roles: permissions?.roles || [],
        isLoading,
        canAccessPage,
        canUseMcpTool,
        hasRole,
        logout,
        refreshPermissions: fetchPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_super_admin: boolean;
  force_password_change?: boolean;
  is_active?: boolean;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
  is_active?: boolean;
  is_system_role?: boolean;
  parent_role_id?: string | null;
  display_order?: number;
  department?: string;
  children?: Role[];
}

interface PermissionsData {
  user: User;
  roles: Role[];
  navigation_permissions: Record<string, string[]>;
  mcp_tool_permissions: string[];
}

interface AuthContextType {
  user: User | null;
  roles: Role[];
  isLoading: boolean;
  canAccessNavigationItem: (navigationCode: string, actionCode?: string) => boolean;
  hasPermission: (permissionCode: string) => boolean;
  canUseMcpTool: (toolCode: string) => boolean;
  hasRole: (roleCode: string) => boolean;
  logout: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<PermissionsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = async () => {
    const token = sessionStorage.getItem('token');
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

  useEffect(() => {
    const handleUnload = () => {
      const token = sessionStorage.getItem('token');
      if (token) {
        // Use navigator.sendBeacon for reliable delivery across all browsers when unloading
        const formData = new FormData();
        formData.append('token', token);
        navigator.sendBeacon(`${import.meta.env.VITE_API_BASE_URL || ''}/api/auth/logout`, formData);
      }
    };
    
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  const canAccessNavigationItem = (navigationCode: string, actionCode = 'VIEW') => {
    if (!permissions) return false;
    if (permissions.user.is_super_admin) return true;
    if (permissions.roles.some((r) => r.code === 'SUPER_ADMIN')) return true;
    
    const pageActions = permissions.navigation_permissions[navigationCode];
    if (!pageActions) return false;
    
    return pageActions.includes(actionCode);
  };

  const hasPermission = (permissionCode: string) => {
    if (!permissions) return false;
    if (permissions.user.is_super_admin) return true;
    if (permissions.roles.some((r) => r.code === 'SUPER_ADMIN')) return true;
    
    const lastUnderscoreIndex = permissionCode.lastIndexOf('_');
    let navigationCode = permissionCode;
    let actionCode = 'PAGE_ACCESS';
    
    if (lastUnderscoreIndex !== -1) {
      navigationCode = permissionCode.substring(0, lastUnderscoreIndex);
      actionCode = permissionCode.substring(lastUnderscoreIndex + 1);
    }
    
    const actionMap: Record<string, string> = {
      "READ": "VIEW",
      "UPDATE": "UPDATE",
      "CREATE": "CREATE",
      "DELETE": "DELETE",
      "IMPORT": "CREATE",
      "EXPORT": "VIEW",
      "PROCESS": "UPDATE",
      "PAGE_ACCESS": "VIEW"
    };
    
    const dbActionCode = actionMap[actionCode] || actionCode;
    const pageActions = permissions.navigation_permissions[navigationCode];
    
    if (!pageActions) return false;
    return pageActions.includes(dbActionCode);
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

  const logout = async () => {
    const userEmail = permissions?.user?.email;
    const msIdToken = sessionStorage.getItem('ms_id_token');
    
    try {
      await apiClient.post('/api/auth/logout', {});
    } catch (e) {
      console.error('Failed to logout on backend', e);
    }
    
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('ms_id_token');
    setPermissions(null);
    
    // Redirect to Microsoft SSO logout to clear the Azure AD session
    const postLogoutUri = encodeURIComponent(window.location.origin + '/login');
    // We use the specific tenant ID for better logout routing
    let logoutUrl = `https://login.microsoftonline.com/793faa36-870a-465b-93be-d8d07da8a680/oauth2/v2.0/logout?post_logout_redirect_uri=${postLogoutUri}`;
    
    // Use id_token_hint if available (completely bypasses picker), fallback to logout_hint
    if (msIdToken) {
      logoutUrl += `&id_token_hint=${msIdToken}`;
    } else if (userEmail) {
      logoutUrl += `&logout_hint=${encodeURIComponent(userEmail)}`;
    }
    
    window.location.href = logoutUrl;
  };

  return (
    <AuthContext.Provider
      value={{
        user: permissions?.user || null,
        roles: permissions?.roles || [],
        isLoading,
        canAccessNavigationItem,
        hasPermission,
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

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, Loader2, ArrowUpDown, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import type { Role } from "@/lib/AuthContext";
import { useSearchParams } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function RoleNavigationPermissions() {
  const { canAccessNavigationItem } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(searchParams.get("roleId"));
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  
  // Left panel search
  const [roleSearchQuery, setRoleSearchQuery] = useState("");
  // Right panel search
  const [pageSearchQuery, setPageSearchQuery] = useState("");

  const { data: roles, isLoading: loadingRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => apiClient.get<Role[]>("/api/configuration/roles"),
  });

  const { data: pages, isLoading: loadingPages } = useQuery({
    queryKey: ["navigation-items"],
    queryFn: () => apiClient.get<any[]>("/api/configuration/navigation-items"),
  });

  const { data: actions, isLoading: loadingActions } = useQuery({
    queryKey: ["actions"],
    queryFn: () => apiClient.get<any[]>("/api/configuration/actions"),
  });

  const { data: rolePermissions, isLoading: loadingRolePermissions } = useQuery({
    queryKey: ["roleNavigationPermissions", selectedRoleId],
    queryFn: () => apiClient.get<any[]>(`/api/configuration/roles/${selectedRoleId}/navigation-permissions`),
    enabled: !!selectedRoleId,
  });

  // Hydrate local state from DB
  useEffect(() => {
    if (pages && actions && selectedRoleId) {
      const state: Record<string, Record<string, boolean>> = {};
      pages.forEach(p => {
        state[p.id] = {};
        actions.forEach(a => {
          state[p.id][a.id] = false;
        });
      });

      if (rolePermissions) {
        rolePermissions.forEach(rp => {
          if (state[rp.navigation_item_id]) {
            state[rp.navigation_item_id][rp.action_id] = rp.is_allowed;
          }
        });
      }
      setPermissions(state);
    }
  }, [pages, actions, rolePermissions, selectedRoleId]);

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });

  const sortedPages = useMemo(() => {
    if (!pages) return [];
    let sortableItems = [...pages.filter(p => p.is_active)];
    
    if (pageSearchQuery.trim()) {
      const lowerQuery = pageSearchQuery.toLowerCase();
      sortableItems = sortableItems.filter(p => 
        p.name.toLowerCase().includes(lowerQuery) || 
        p.code.toLowerCase().includes(lowerQuery)
      );
    }

    if (sortConfig !== null) {
      sortableItems.sort((a: any, b: any) => {
        let aValue = a[sortConfig.key] || "";
        let bValue = b[sortConfig.key] || "";
        
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [pages, sortConfig, pageSearchQuery]);

  const filteredRoles = useMemo(() => {
    if (!roles) return [];
    const activeRoles = roles.filter(r => r.is_active);
    if (!roleSearchQuery.trim()) return activeRoles;
    
    const lower = roleSearchQuery.toLowerCase();
    return activeRoles.filter(r => 
      r.name.toLowerCase().includes(lower) || 
      r.code.toLowerCase().includes(lower)
    );
  }, [roles, roleSearchQuery]);

  const requestSort = (key: string) => {
    setSortConfig({ key, direction: 'asc' });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any[] = [];
      Object.keys(permissions).forEach(pageId => {
        Object.keys(permissions[pageId]).forEach(actionId => {
          payload.push({
            navigation_item_id: pageId,
            action_id: actionId,
            is_allowed: permissions[pageId][actionId]
          });
        });
      });
      return apiClient.put(`/api/configuration/roles/${selectedRoleId}/navigation-permissions`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roleNavigationPermissions", selectedRoleId] });
      toast.success("Navigation permissions saved successfully");
    },
    onError: () => toast.error("Failed to save navigation permissions"),
  });

  const togglePermission = (pageId: string, actionId: string) => {
    setPermissions(prev => ({
      ...prev,
      [pageId]: {
        ...prev[pageId],
        [actionId]: !prev[pageId][actionId]
      }
    }));
  };

  const handleRoleSelect = (id: string) => {
    setSelectedRoleId(id);
    setSearchParams({ roleId: id });
  };

  if (loadingRoles || loadingPages || loadingActions) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const selectedRole = roles?.find(r => r.id === selectedRoleId);

  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out p-6 w-full">
      
      {/* Left Panel: Roles List */}
      <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4 lg:border-r border-slate-200 dark:border-zinc-800 lg:pr-6 pb-6 lg:pb-0 border-b lg:border-b-0 min-h-0">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">Roles</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400">Select a role to configure page access.</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 dark:text-zinc-400" />
          <Input 
            placeholder="Search roles..." 
            className="pl-9 h-10 bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 focus-visible:ring-blue-500/30 rounded-xl"
            value={roleSearchQuery}
            onChange={(e) => setRoleSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[300px]">
          {filteredRoles.length === 0 ? (
            <div className="text-center p-4 text-slate-500 text-sm">No roles found.</div>
          ) : (
            filteredRoles.map(role => (
              <button
                key={role.id}
                onClick={() => handleRoleSelect(role.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                  selectedRoleId === role.id 
                    ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700 ring-1 ring-blue-500/20'
                    : 'bg-white border-slate-200 hover:border-blue-300 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-700'
                }`}
              >
                <div className="font-semibold text-slate-900 dark:text-zinc-100 truncate text-sm">
                  {role.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">{role.code}</div>
                {role.is_system_role && (
                  <Badge variant="secondary" className="mt-2 text-[9px] h-4 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 uppercase font-bold tracking-wider">
                    System Role
                  </Badge>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Panel: Permissions Configuration */}
      <div className="flex-1 flex flex-col min-h-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">Role Navigation Permissions</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400">
             {selectedRole ? `Configuring permissions for ${selectedRole.name}` : "Select a role from the list to begin."}
          </p>
        </div>

        {selectedRoleId ? (
          <div className="flex-1 min-h-0 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 w-full mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-zinc-400" />
                <Input 
                  placeholder="Search pages..." 
                  className="pl-9 bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 focus-visible:ring-blue-500/30 rounded-xl"
                  value={pageSearchQuery}
                  onChange={(e) => setPageSearchQuery(e.target.value)}
                />
              </div>
              {loadingRolePermissions && (
                <div className="flex justify-end text-sm text-slate-500 items-center">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600 mr-2" /> Loading permissions...
                </div>
              )}
            </div>
            
            <div className={`flex-1 min-h-0 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden flex flex-col transition-opacity duration-200 ${loadingRolePermissions || saveMutation.isPending ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <div className="flex-1 overflow-y-auto relative">
                <Table>
                  <TableHeader className="bg-slate-50/80 dark:bg-zinc-950/90 sticky top-0 z-10 backdrop-blur-sm">
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors bg-inherit"
                        onClick={() => requestSort("name")}
                      >
                        <div className="flex items-center text-slate-900 dark:text-zinc-100 font-semibold">Page <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-slate-400" /></div>
                      </TableHead>
                      {actions?.map(action => (
                        <TableHead key={action.id} className="text-center font-semibold text-slate-900 dark:text-zinc-100 bg-inherit min-w-[100px]">
                          {action.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPages.length === 0 ? (
                       <TableRow>
                          <TableCell colSpan={actions ? actions.length + 1 : 2} className="h-24 text-center text-slate-500">
                             No pages found matching your search.
                          </TableCell>
                       </TableRow>
                    ) : (
                      sortedPages.map((page, _index) => (
                        <TableRow key={page.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50">
                          <TableCell className="font-medium text-slate-900 dark:text-zinc-200 border-r border-slate-100 dark:border-zinc-800/50">
                            {page.name}
                            <div className="text-[10px] text-slate-500 font-normal uppercase tracking-wider mt-0.5">{page.code}</div>
                          </TableCell>
                          {actions?.map(action => (
                            <TableCell key={action.id} className="text-center border-r border-slate-100 dark:border-zinc-800/50 last:border-r-0">
                              <input 
                                type="checkbox"
                                checked={permissions[page.id]?.[action.id] || false}
                                onChange={() => togglePermission(page.id, action.id)}
                                disabled={!canAccessNavigationItem("CONFIG_ROLE_PAGE_PERMISSIONS", "EDIT")}
                                className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {canAccessNavigationItem("CONFIG_ROLE_PAGE_PERMISSIONS", "EDIT") && (
              <div className="pt-4 flex justify-end">
                <Button 
                  onClick={() => saveMutation.mutate()} 
                  className="w-full sm:w-auto h-11 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
                  disabled={saveMutation.isPending || loadingRolePermissions}
                >
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Page Permissions
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex items-center justify-center mt-6">
             <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-slate-50 dark:bg-zinc-900/20 text-center max-w-md mx-auto">
               <div className="w-16 h-16 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                 <Check className="h-8 w-8 text-slate-300 dark:text-zinc-600" />
               </div>
               <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 mb-2">No Role Selected</h3>
               <p className="text-sm text-slate-500 dark:text-zinc-400">Choose a role from the list on the left to view and modify its page access permissions.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

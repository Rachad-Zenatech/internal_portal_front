import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowUpDown, Search } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");

  const { data: roles, isLoading: loadingRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => apiClient.get<Role[]>("/api/configuration/roles"),
  });

  const { data: pages, isLoading: loadingPages } = useQuery({
    queryKey: ["pages"],
    queryFn: () => apiClient.get<any[]>("/api/configuration/pages"),
  });

  const { data: actions, isLoading: loadingActions } = useQuery({
    queryKey: ["actions"],
    queryFn: () => apiClient.get<any[]>("/api/configuration/actions"),
  });

  const { data: rolePermissions, isLoading: loadingRolePermissions } = useQuery({
    queryKey: ["rolePagePermissions", selectedRoleId],
    queryFn: () => apiClient.get<any[]>(`/api/configuration/roles/${selectedRoleId}/page-permissions`),
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
          if (state[rp.page_id]) {
            state[rp.page_id][rp.action_id] = rp.is_allowed;
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
    
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
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
  }, [pages, sortConfig, searchQuery]);

  const requestSort = (key: string) => {
    setSortConfig({ key, direction: 'asc' });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any[] = [];
      Object.keys(permissions).forEach(pageId => {
        Object.keys(permissions[pageId]).forEach(actionId => {
          payload.push({
            page_id: pageId,
            action_id: actionId,
            is_allowed: permissions[pageId][actionId]
          });
        });
      });
      return apiClient.put(`/api/configuration/roles/${selectedRoleId}/page-permissions`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rolePagePermissions", selectedRoleId] });
      toast.success("Page permissions saved successfully");
    },
    onError: () => toast.error("Failed to save page permissions"),
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

  const handleRoleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedRoleId(id || null);
    if (id) setSearchParams({ roleId: id });
    else setSearchParams({});
  };

  if (loadingRoles || loadingPages || loadingActions) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // const selectedRole = roles?.find(r => r.id === selectedRoleId);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out p-6 w-full">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">Role Navigation Permissions</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400">Configure which pages and actions are accessible by each role.</p>
        </div>
        <div className="w-full max-w-full sm:max-w-2xl xl:max-w-3xl">
          <select 
            value={selectedRoleId || ""}
            onChange={handleRoleSelect}
            className="w-full h-10 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-900 dark:text-zinc-100"
          >
            <option value="">-- Choose a role --</option>
            {roles?.filter(r => r.is_active).map(role => (
              <option key={role.id} value={role.id}>
                {role.name} ({role.code}) {role.is_system_role ? "[SYSTEM]" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {selectedRoleId ? (
          <div className="flex-1 min-h-0 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 w-full mt-2">
            <div className="flex items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-zinc-400" />
                <Input 
                  placeholder="Search pages..." 
                  className="pl-9 bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 focus-visible:ring-blue-500/30"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {loadingRolePermissions && (
                <div className="flex justify-end">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                </div>
              )}
            </div>
            <div className={`flex-1 min-h-0 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden flex flex-col transition-opacity duration-200 ${loadingRolePermissions || saveMutation.isPending ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <Table>
                <TableHeader className="bg-slate-50/80 dark:bg-zinc-950/50">
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors"
                      onClick={() => requestSort("name")}
                    >
                      <div className="flex items-center">Page <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                    </TableHead>
                    {actions?.map(action => (
                      <TableHead key={action.id} className="text-center">
                        {action.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPages.map((page, _index) => (
                    <TableRow key={page.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50">
                      <TableCell className="font-medium text-slate-900 dark:text-zinc-200">
                        {page.name}
                        <div className="text-[10px] text-slate-500 font-normal uppercase tracking-wider">{page.code}</div>
                      </TableCell>
                      {actions?.map(action => (
                        <TableCell key={action.id} className="text-center">
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
                  ))}
                </TableBody>
              </Table>
            </div>

            {canAccessNavigationItem("CONFIG_ROLE_PAGE_PERMISSIONS", "EDIT") && (
              <div className="pt-6 flex justify-end">
                <Button 
                  onClick={() => saveMutation.mutate()} 
                  className="w-full md:w-auto h-11 px-8"
                  disabled={saveMutation.isPending || loadingRolePermissions}
                >
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Page Permissions
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex items-center justify-center text-slate-500 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-xl mt-4">
             Select a role to configure permissions
          </div>
        )}
      </div>
    </div>
  );
}

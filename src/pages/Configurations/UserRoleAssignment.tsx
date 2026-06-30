import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, Loader2, ArrowUpDown, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import type { User, Role } from "@/lib/AuthContext";
import { useSearchParams } from "react-router-dom";

export default function UserRoleAssignment() {
  const { canAccessNavigationItem } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [selectedUserId, setSelectedUserId] = useState<string | null>(searchParams.get("userId"));
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiClient.get<User[]>("/api/configuration/users"),
  });

  const { data: allRoles, isLoading: loadingRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => apiClient.get<Role[]>("/api/configuration/roles"),
  });

  const { data: userRoles, isLoading: loadingUserRoles } = useQuery({
    queryKey: ["userRoles", selectedUserId],
    queryFn: () => apiClient.get<any[]>(`/api/configuration/users/${selectedUserId}/roles`),
    enabled: !!selectedUserId,
  });

  // When userRoles is fetched, populate the selectedRoles state
  useEffect(() => {
    if (userRoles) {
      setSelectedRoles(new Set(userRoles.map(r => r.id)));
    } else {
      setSelectedRoles(new Set());
    }
  }, [userRoles]);

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });

  const sortedRoles = useMemo(() => {
    if (!allRoles) return [];
    let sortableItems = [...allRoles.filter(r => r.is_active)];
    
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      sortableItems = sortableItems.filter(r => 
        r.name.toLowerCase().includes(lowerQuery) || 
        (r.description && r.description.toLowerCase().includes(lowerQuery))
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
  }, [allRoles, sortConfig, searchQuery]);

  const requestSort = (key: string) => {
    setSortConfig({ key, direction: 'asc' });
  };

  const saveMutation = useMutation({
    mutationFn: () => apiClient.put(`/api/configuration/users/${selectedUserId}/roles`, {
      role_ids: Array.from(selectedRoles)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userRoles", selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Role assignments saved successfully");
    },
    onError: () => toast.error("Failed to save role assignments"),
  });

  const toggleRole = (roleId: string) => {
    const next = new Set(selectedRoles);
    if (next.has(roleId)) {
      next.delete(roleId);
    } else {
      next.add(roleId);
    }
    setSelectedRoles(next);
  };

  const handleUserSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedUserId(id || null);
    if (id) {
      setSearchParams({ userId: id });
    } else {
      setSearchParams({});
    }
  };

  if (loadingUsers || loadingRoles) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const selectedUser = users?.find(u => u.id === selectedUserId);
  const isSuperAdmin = selectedUser?.is_super_admin === true;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out p-6 w-full">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">User Role Assignment</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400">Assign or remove security roles for specific users.</p>
        </div>
        <div className="w-full max-w-full sm:max-w-2xl xl:max-w-3xl">
          <select 
            value={selectedUserId || ""}
            onChange={handleUserSelect}
            className="w-full h-10 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-900 dark:text-zinc-100"
          >
            <option value="">-- Choose a user --</option>
            {users?.map(user => (
              <option key={user.id} value={user.id}>
                {user.full_name || user.email} ({user.email}) {user.is_super_admin ? "[SUPER ADMIN]" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {selectedUserId ? (
          <div className="flex-1 min-h-0 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 w-full mt-2">
            <div className="flex items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-zinc-400" />
                <Input 
                  placeholder="Search roles..." 
                  className="pl-9 bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 focus-visible:ring-blue-500/30"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {loadingUserRoles && (
                <div className="flex justify-end">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                </div>
              )}
            </div>
            
            {isSuperAdmin && (
              <div className="p-4 rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 text-sm flex items-center">
                <span className="font-semibold mr-2">Note:</span> This user is a Super Admin and inherently has all permissions. Role assignments are disabled.
              </div>
            )}

            <div className={`flex-1 min-h-0 flex flex-col rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden transition-opacity duration-200 bg-white dark:bg-zinc-900 shadow-sm ${loadingUserRoles || saveMutation.isPending || isSuperAdmin ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <Table>
                <TableHeader className="bg-slate-50/80 dark:bg-zinc-950/50">
                  <TableRow>
                    <TableHead className="w-16 text-center">Assigned</TableHead>
                    <TableHead onClick={() => requestSort("name")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                      <div className="flex items-center">Role Name <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                    </TableHead>
                    <TableHead onClick={() => requestSort("description")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                      <div className="flex items-center">Description <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRoles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-slate-500">No active roles available.</TableCell>
                    </TableRow>
                  ) : (
                    sortedRoles.map(role => {
                      const isSelected = selectedRoles.has(role.id);
                      return (
                        <TableRow 
                          key={role.id} 
                          onClick={() => toggleRole(role.id)}
                          className="cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900/50"
                        >
                          <TableCell className="text-center">
                            <div className={`mx-auto flex-shrink-0 h-5 w-5 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-zinc-600'}`}>
                              {isSelected && <Check className="h-3.5 w-3.5" />}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {role.name}
                              {role.is_system_role && <Badge variant="secondary" className="text-[10px] h-4 bg-purple-100 text-purple-700">System</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-500 text-sm">
                            {role.description || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {canAccessNavigationItem("CONFIG_USER_ROLE_ASSIGNMENT", "EDIT") && !isSuperAdmin && (
              <div className="pt-6 flex justify-end">
                <Button 
                  onClick={() => saveMutation.mutate()} 
                  className="w-full md:w-auto h-11 px-8"
                  disabled={saveMutation.isPending || loadingUserRoles}
                >
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Assignments
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex items-center justify-center text-slate-500 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-xl mt-4">
             Select a user to configure assignments
          </div>
        )}
      </div>
    </div>
  );
}

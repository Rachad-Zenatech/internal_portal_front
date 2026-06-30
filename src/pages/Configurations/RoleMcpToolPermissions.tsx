import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Wrench, ArrowUpDown, Search } from "lucide-react";
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
import type { Role } from "@/lib/AuthContext";
import { useSearchParams } from "react-router-dom";

export default function RoleMcpToolPermissions() {
  const { canAccessNavigationItem } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(searchParams.get("roleId"));
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const { data: roles, isLoading: loadingRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => apiClient.get<Role[]>("/api/configuration/roles"),
  });

  const { data: mcpTools, isLoading: loadingTools } = useQuery({
    queryKey: ["mcpTools"],
    queryFn: () => apiClient.get<any[]>("/api/configuration/mcp-tools"),
  });

  const { data: rolePermissions, isLoading: loadingRolePermissions } = useQuery({
    queryKey: ["roleMcpPermissions", selectedRoleId],
    queryFn: () => apiClient.get<any[]>(`/api/configuration/roles/${selectedRoleId}/mcp-tool-permissions`),
    enabled: !!selectedRoleId,
  });

  // Hydrate local state from DB
  useEffect(() => {
    if (mcpTools && selectedRoleId) {
      const state: Record<string, boolean> = {};
      mcpTools.forEach(t => {
        state[t.id] = false;
      });

      if (rolePermissions) {
        rolePermissions.forEach(rp => {
          if (state[rp.mcp_tool_id] !== undefined) {
            state[rp.mcp_tool_id] = rp.is_allowed;
          }
        });
      }
      setPermissions(state);
    }
  }, [mcpTools, rolePermissions, selectedRoleId]);

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });

  const sortedTools = useMemo(() => {
    if (!mcpTools) return [];
    let sortableItems = [...mcpTools.filter(t => t.is_active)];

    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      sortableItems = sortableItems.filter(t => 
        t.name.toLowerCase().includes(lowerQuery) || 
        t.code.toLowerCase().includes(lowerQuery) ||
        (t.description && t.description.toLowerCase().includes(lowerQuery))
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
  }, [mcpTools, sortConfig, searchQuery]);

  const requestSort = (key: string) => {
    setSortConfig({ key, direction: 'asc' });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = Object.keys(permissions).map(toolId => ({
        mcp_tool_id: toolId,
        is_allowed: permissions[toolId]
      }));
      return apiClient.put(`/api/configuration/roles/${selectedRoleId}/mcp-tool-permissions`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roleMcpPermissions", selectedRoleId] });
      toast.success("MCP Tool permissions saved successfully");
    },
    onError: () => toast.error("Failed to save tool permissions"),
  });

  const togglePermission = (toolId: string) => {
    setPermissions(prev => ({
      ...prev,
      [toolId]: !prev[toolId]
    }));
  };

  const handleRoleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedRoleId(id || null);
    if (id) setSearchParams({ roleId: id });
    else setSearchParams({});
  };

  if (loadingRoles || loadingTools) {
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
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">Role MCP Tool Permissions</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400">Configure which MCP (AI Agent) tools are accessible by each role.</p>
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
                  placeholder="Search tools..." 
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
            <div className={`flex-1 min-h-0 flex flex-col rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden transition-opacity duration-200 ${loadingRolePermissions || saveMutation.isPending ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <Table>
                <TableHeader className="bg-slate-50/80 dark:bg-zinc-950/50">
                  <TableRow>
                    <TableHead className="w-16 text-center">Allowed</TableHead>
                    <TableHead onClick={() => requestSort("name")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                      <div className="flex items-center">Tool Name <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                    </TableHead>
                    <TableHead onClick={() => requestSort("code")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                      <div className="flex items-center">Code <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                    </TableHead>
                    <TableHead onClick={() => requestSort("description")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                      <div className="flex items-center">Description <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTools.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-slate-500">No active tools available.</TableCell>
                    </TableRow>
                  ) : (
                    sortedTools.map((tool) => (
                      <TableRow key={tool.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50">
                        <TableCell className="text-center">
                          <input
                            id={`tool-${tool.id}`}
                            type="checkbox"
                            checked={permissions[tool.id] || false}
                            onChange={() => togglePermission(tool.id)}
                            disabled={!canAccessNavigationItem("CONFIG_ROLE_MCP_TOOL_PERMISSIONS", "EDIT")}
                            className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 cursor-pointer disabled:opacity-50"
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center text-slate-900 dark:text-zinc-100">
                            <Wrench className="w-3.5 h-3.5 mr-2 text-slate-400" />
                            <label htmlFor={`tool-${tool.id}`} className="cursor-pointer">{tool.name}</label>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-[10px] text-slate-500 dark:text-zinc-400 mt-2 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded w-max">
                            {tool.code}
                          </code>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {tool.description || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {canAccessNavigationItem("CONFIG_ROLE_MCP_TOOL_PERMISSIONS", "EDIT") && (
              <div className="pt-6 flex justify-end">
                <Button 
                  onClick={() => saveMutation.mutate()} 
                  className="w-full md:w-auto h-11 px-8"
                  disabled={saveMutation.isPending || loadingRolePermissions}
                >
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Tool Permissions
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

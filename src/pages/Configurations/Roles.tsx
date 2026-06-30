import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Shield, Power, Ban, ChevronRight, ChevronDown, FolderOpen, Folder, Users, Key } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import type { Role } from "@/lib/AuthContext";
import { Link } from "react-router-dom";

// Recursive component for Tree Node
const TreeNode = ({ 
  role, 
  level, 
  selectedRole, 
  onSelect, 
  expandedNodes, 
  toggleNode 
}: { 
  role: Role; 
  level: number; 
  selectedRole: Role | null; 
  onSelect: (role: Role) => void;
  expandedNodes: Set<string>;
  toggleNode: (id: string, e: React.MouseEvent) => void;
}) => {
  const isExpanded = expandedNodes.has(role.id);
  const isSelected = selectedRole?.id === role.id;
  const hasChildren = role.children && role.children.length > 0;

  return (
    <div className="w-full">
      <div 
        className={`flex items-center py-2 px-2 rounded-md cursor-pointer group transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'hover:bg-slate-50 dark:hover:bg-zinc-800/50 text-slate-700 dark:text-zinc-300'}`}
        style={{ paddingLeft: `${(level * 16) + 8}px` }}
        onClick={() => onSelect(role)}
      >
        <div 
          className={`w-6 h-6 flex items-center justify-center mr-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 ${hasChildren ? 'cursor-pointer' : 'opacity-0'}`}
          onClick={(e) => {
            if (hasChildren) toggleNode(role.id, e);
          }}
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
        
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 mr-2 text-blue-500" />
        ) : (
          <Folder className="w-4 h-4 mr-2 text-blue-500" />
        )}
        
        <span className="text-sm font-medium truncate flex-1">{role.name}</span>
        
        {!role.is_active && (
          <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 h-4 bg-slate-100 text-slate-500">Inactive</Badge>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div className="flex flex-col w-full">
          {role.children!.map(child => (
            <TreeNode 
              key={child.id} 
              role={child} 
              level={level + 1} 
              selectedRole={selectedRole} 
              onSelect={onSelect} 
              expandedNodes={expandedNodes} 
              toggleNode={toggleNode} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function Roles() {
  const { canAccessNavigationItem } = useAuth();
  const queryClient = useQueryClient();

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    parent_role_id: "",
    display_order: 0,
    department: "",
    is_active: true,
  });

  const { data: roleTree, isLoading: isLoadingTree } = useQuery({
    queryKey: ["roles-tree"],
    queryFn: () => apiClient.get<Role[]>("/api/configuration/roles/tree"),
  });

  // Fetch flat roles for the parent dropdown
  const { data: flatRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => apiClient.get<Role[]>("/api/configuration/roles"),
  });

  // Auto-expand all on load
  useEffect(() => {
    if (roleTree) {
      const allIds = new Set<string>();
      const addIds = (nodes: Role[]) => {
        nodes.forEach(n => {
          allIds.add(n.id);
          if (n.children) addIds(n.children);
        });
      };
      addIds(roleTree);
      setExpandedNodes(allIds);
    }
  }, [roleTree]);

  const toggleNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiClient.post("/api/configuration/roles", {
      ...data,
      parent_role_id: data.parent_role_id || null
    }),
    onSuccess: (newRole: any) => {
      queryClient.invalidateQueries({ queryKey: ["roles-tree"] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Role created successfully");
      setIsEditing(false);
      setSelectedRole(newRole);
    },
    onError: (err: any) => toast.error(err.message || "Failed to create role"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string, payload: Partial<typeof formData> }) => 
      apiClient.put(`/api/configuration/roles/${data.id}`, {
        ...data.payload,
        parent_role_id: data.payload.parent_role_id || null
      }),
    onSuccess: (updatedRole: any) => {
      queryClient.invalidateQueries({ queryKey: ["roles-tree"] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Role updated successfully");
      setIsEditing(false);
      setSelectedRole(updatedRole);
    },
    onError: (err: any) => toast.error(err.message || "Failed to update role"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/configuration/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles-tree"] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Role deactivated/deleted successfully");
      setSelectedRole(null);
      setIsEditing(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete role"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole && isEditing && selectedRole.id !== "new") {
      updateMutation.mutate({ id: selectedRole.id, payload: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleAddRoot = () => {
    setSelectedRole({ id: "new", name: "New Root Role", code: "", is_active: true } as Role);
    setFormData({ name: "", code: "", description: "", parent_role_id: "", display_order: 0, department: "", is_active: true });
    setIsEditing(true);
  };

  const handleAddChild = () => {
    if (!selectedRole || selectedRole.id === "new") return;
    const parentId = selectedRole.id;
    setSelectedRole({ id: "new", name: "New Child Role", code: "", is_active: true } as Role);
    setFormData({ name: "", code: "", description: "", parent_role_id: parentId, display_order: 0, department: "", is_active: true });
    setIsEditing(true);
  };

  const startEdit = () => {
    if (!selectedRole) return;
    setFormData({ 
      name: selectedRole.name, 
      code: selectedRole.code, 
      description: selectedRole.description || "", 
      parent_role_id: selectedRole.parent_role_id || "",
      display_order: selectedRole.display_order || 0,
      department: selectedRole.department || "",
      is_active: selectedRole.is_active ?? true 
    });
    setIsEditing(true);
  };

  const confirmDelete = async () => {
    if (!selectedRole || selectedRole.id === "new") return;
    try {
      await deleteMutation.mutateAsync(selectedRole.id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const confirmDeactivate = async () => {
    if (!selectedRole || selectedRole.id === "new") return;
    try {
      await updateMutation.mutateAsync({
        id: selectedRole.id,
        payload: { is_active: !selectedRole.is_active }
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeactivateDialogOpen(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">Roles</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400">Manage organizational role hierarchy and security groups.</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-6">
        {/* Left Panel: Tree */}
        <div className="w-full md:w-1/3 flex flex-col rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm h-full">
          <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-950/50">
            <h3 className="font-semibold text-slate-800 dark:text-zinc-200">Role Hierarchy</h3>
            {canAccessNavigationItem("CONFIG_ROLES", "CREATE") && (
              <Button size="sm" variant="outline" onClick={handleAddRoot} className="h-8 text-xs">
                <Plus className="mr-1 h-3 w-3" /> Root
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {isLoadingTree ? (
              <div className="p-4 text-center text-slate-500 text-sm">Loading tree...</div>
            ) : roleTree && roleTree.length > 0 ? (
              roleTree.map(rootRole => (
                <TreeNode 
                  key={rootRole.id} 
                  role={rootRole} 
                  level={0}
                  selectedRole={selectedRole}
                  onSelect={(r) => { setSelectedRole(r); setIsEditing(false); }}
                  expandedNodes={expandedNodes}
                  toggleNode={toggleNode}
                />
              ))
            ) : (
              <div className="p-4 text-center text-slate-500 text-sm">No roles found.</div>
            )}
          </div>
        </div>

        {/* Right Panel: Details / Editor */}
        <div className="w-full md:w-2/3 flex flex-col rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm h-full">
          {!selectedRole ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-zinc-500 p-8 text-center flex-col">
              <Shield className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a role from the hierarchy to view details or edit.</p>
            </div>
          ) : isEditing ? (
            // Form Editor
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 dark:text-zinc-200">
                  {selectedRole.id === "new" ? "Create New Role" : "Edit Role"}
                </h3>
              </div>
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role Name</label>
                    <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Senior Accountant" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role Code</label>
                    <Input required disabled={selectedRole.id !== "new"} value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '_')})} placeholder="e.g. SENIOR_ACCOUNTANT" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Parent Role</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus-visible:ring-zinc-300"
                      value={formData.parent_role_id}
                      onChange={e => setFormData({...formData, parent_role_id: e.target.value})}
                    >
                      <option value="">-- None (Root Role) --</option>
                      {flatRoles?.map(r => (
                        <option key={r.id} value={r.id} disabled={r.id === selectedRole.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Department</label>
                    <Input value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} placeholder="e.g. Finance" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Display Order</label>
                    <Input type="number" required value={formData.display_order} onChange={e => setFormData({...formData, display_order: parseInt(e.target.value) || 0})} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Role responsibilities..." rows={3} />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="rounded border-slate-300 w-4 h-4 text-blue-600 focus:ring-blue-500" />
                  <label htmlFor="is_active" className="text-sm font-medium cursor-pointer">Active Role</label>
                </div>

                <div className="pt-6 flex gap-3 border-t border-slate-100 dark:border-zinc-800">
                  <Button type="button" variant="outline" onClick={() => {
                    if (selectedRole.id === "new") setSelectedRole(null);
                    setIsEditing(false);
                  }}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Role"}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            // View Details
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-start bg-slate-50/30 dark:bg-zinc-950/30">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">{selectedRole.name}</h3>
                    {selectedRole.is_system_role && <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"><Shield className="w-3 h-3 mr-1"/> System</Badge>}
                    {selectedRole.is_active ? 
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400">Active</Badge> : 
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400">Inactive</Badge>
                    }
                  </div>
                  <p className="text-slate-500 dark:text-zinc-400 text-sm font-mono bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded inline-block">{selectedRole.code}</p>
                </div>
                
                <div className="flex gap-2">
                  {canAccessNavigationItem("CONFIG_ROLES", "CREATE") && selectedRole.code !== "SUPER_ADMIN" && (
                    <Button variant="outline" size="sm" onClick={handleAddChild}>
                      <Plus className="w-4 h-4 mr-2" /> Add Child
                    </Button>
                  )}
                  {canAccessNavigationItem("CONFIG_ROLES", "EDIT") && selectedRole.code !== "SUPER_ADMIN" && (
                    <Button variant="default" size="sm" onClick={startEdit} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Edit className="w-4 h-4 mr-2" /> Edit
                    </Button>
                  )}
                </div>
              </div>

              <div className="p-6 flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-1">Department</h4>
                    <p className="text-slate-900 dark:text-zinc-200">{selectedRole.department || "—"}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-1">Display Order</h4>
                    <p className="text-slate-900 dark:text-zinc-200">{selectedRole.display_order}</p>
                  </div>
                </div>

                <div className="mb-8">
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-2">Description</h4>
                  <p className="text-slate-700 dark:text-zinc-300 text-sm bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-lg border border-slate-100 dark:border-zinc-800">
                    {selectedRole.description || <span className="italic text-slate-400">No description provided.</span>}
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-2">Quick Actions</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Link to="/configurations/user-role-assignment" className="flex items-center p-4 rounded-lg border border-slate-200 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors group">
                      <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-md mr-4 text-blue-600 dark:text-blue-400">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">Assign Users</div>
                        <div className="text-xs text-slate-500 mt-0.5">Manage user assignments</div>
                      </div>
                    </Link>
                    
                    <Link to="/configurations/role-navigation-permissions" className="flex items-center p-4 rounded-lg border border-slate-200 dark:border-zinc-800 hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors group">
                      <div className="bg-purple-100 dark:bg-purple-900/50 p-2 rounded-md mr-4 text-purple-600 dark:text-purple-400">
                        <Key className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-zinc-100 group-hover:text-purple-600 dark:group-hover:text-purple-400">Navigation Permissions</div>
                        <div className="text-xs text-slate-500 mt-0.5">Configure page access</div>
                      </div>
                    </Link>
                  </div>
                </div>

                <div className="mt-12 pt-6 border-t border-slate-200 dark:border-zinc-800 flex justify-end gap-3">
                  {canAccessNavigationItem("CONFIG_ROLES", "EDIT") && selectedRole.code !== "SUPER_ADMIN" && (
                    <Button variant="outline" className={selectedRole.is_active ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"} onClick={() => setIsDeactivateDialogOpen(true)}>
                      {selectedRole.is_active ? <Ban className="w-4 h-4 mr-2" /> : <Power className="w-4 h-4 mr-2" />}
                      {selectedRole.is_active ? "Deactivate Role" : "Activate Role"}
                    </Button>
                  )}
                  {canAccessNavigationItem("CONFIG_ROLES", "DELETE") && !selectedRole.is_system_role && (
                    <Button variant="outline" className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50" onClick={() => setIsDeleteDialogOpen(true)}>
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Role
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this role?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the role and remove it from all assigned users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleteMutation.isPending} className="bg-red-600 hover:bg-red-700 text-white">
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{selectedRole?.is_active ? "Deactivate Role" : "Activate Role"}</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedRole?.is_active 
                ? "This will deactivate the role. Users with this role may lose access to associated permissions."
                : "This will reactivate the role."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate} disabled={updateMutation.isPending} className={selectedRole?.is_active ? "bg-orange-600 hover:bg-orange-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}>
              {updateMutation.isPending ? "Updating..." : (selectedRole?.is_active ? "Deactivate" : "Activate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

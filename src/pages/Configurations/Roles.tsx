import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Plus, Edit, Trash2, Shield, ArrowUpDown, Power, Ban, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import type { Role } from "@/lib/AuthContext";

export default function Roles() {
  const { canAccessNavigationItem } = useAuth();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [roleToDeactivate, setRoleToDeactivate] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    is_active: true,
  });

  const { data: roles, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => apiClient.get<Role[]>("/api/configuration/roles"),
  });

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState("");

  const sortedRoles = useMemo(() => {
    if (!roles) return [];
    let sortableItems = [...roles];

    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      sortableItems = sortableItems.filter(r => 
        (r.name && r.name.toLowerCase().includes(lowerQuery)) || 
        (r.code && r.code.toLowerCase().includes(lowerQuery)) ||
        (r.description && r.description.toLowerCase().includes(lowerQuery))
      );
    }

    if (sortConfig !== null) {
      sortableItems.sort((a: any, b: any) => {
        let aValue = a[sortConfig.key] || "";
        let bValue = b[sortConfig.key] || "";
        
        if (typeof aValue === 'boolean') aValue = aValue ? 1 : 0;
        if (typeof bValue === 'boolean') bValue = bValue ? 1 : 0;
        
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [roles, sortConfig, searchQuery]);

  const requestSort = (key: string) => {
    setSortConfig({ key, direction: 'asc' });
  };

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiClient.post("/api/configuration/roles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Role created successfully");
      setIsDialogOpen(false);
    },
    onError: () => toast.error("Failed to create role"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string, payload: Partial<typeof formData> }) => 
      apiClient.put(`/api/configuration/roles/${data.id}`, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Role updated successfully");
      setIsDialogOpen(false);
    },
    onError: () => toast.error("Failed to update role"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/configuration/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Role deactivated/deleted successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete role"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, payload: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openCreateDialog = () => {
    setEditingRole(null);
    setFormData({ name: "", code: "", description: "", is_active: true });
    setIsDialogOpen(true);
  };

  const openEditDialog = (role: any) => {
    setEditingRole(role);
    setFormData({ 
      name: role.name, 
      code: role.code, 
      description: role.description || "", 
      is_active: role.is_active ?? true 
    });
    setIsDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!roleToDelete) return;
    try {
      await deleteMutation.mutateAsync(roleToDelete.id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleteDialogOpen(false);
      setRoleToDelete(null);
    }
  };

  const confirmDeactivate = async () => {
    if (!roleToDeactivate) return;
    try {
      await updateMutation.mutateAsync({
        id: roleToDeactivate.id,
        payload: { is_active: !roleToDeactivate.is_active }
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeactivateDialogOpen(false);
      setRoleToDeactivate(null);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">Roles</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400">Define and manage security roles for users.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-zinc-400" />
            <Input 
              placeholder="Search roles..." 
              className="pl-9 bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 focus-visible:ring-blue-500/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {canAccessNavigationItem("CONFIG_ROLES", "CREATE") && (
            <Button onClick={openCreateDialog} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Add Role
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm flex flex-col">
        <Table>
          <TableHeader className="bg-slate-50/80 dark:bg-zinc-950/50">
            <TableRow>
              <TableHead onClick={() => requestSort("name")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                <div className="flex items-center">Role Name <ArrowUpDown className="ml-2 h-4 w-4" /></div>
              </TableHead>
              <TableHead onClick={() => requestSort("code")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                <div className="flex items-center">Code <ArrowUpDown className="ml-2 h-4 w-4" /></div>
              </TableHead>
              <TableHead onClick={() => requestSort("description")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                <div className="flex items-center">Description <ArrowUpDown className="ml-2 h-4 w-4" /></div>
              </TableHead>
              <TableHead onClick={() => requestSort("is_active")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                <div className="flex items-center">Status <ArrowUpDown className="ml-2 h-4 w-4" /></div>
              </TableHead>
              <TableHead onClick={() => requestSort("is_system_role")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                <div className="flex items-center">System <ArrowUpDown className="ml-2 h-4 w-4" /></div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">Loading roles...</TableCell>
              </TableRow>
            ) : sortedRoles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">No roles found.</TableCell>
              </TableRow>
            ) : (
              sortedRoles.map((role: any) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell><code className="px-2 py-1 bg-slate-100 dark:bg-zinc-800 rounded text-xs">{role.code}</code></TableCell>
                  <TableCell className="text-slate-500 text-sm max-w-[200px] truncate">{role.description}</TableCell>
                  <TableCell>
                    {role.is_active ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {role.is_system_role ? (
                      <Shield className="h-4 w-4 text-purple-600" />
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {canAccessNavigationItem("CONFIG_ROLES", "EDIT") && (
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(role)}>
                        <Edit className="h-4 w-4 text-blue-600" />
                      </Button>
                    )}
                    {canAccessNavigationItem("CONFIG_ROLES", "EDIT") && (
                      <Button variant="ghost" size="icon" onClick={() => {
                        setRoleToDeactivate(role);
                        setIsDeactivateDialogOpen(true);
                      }} title={role.is_active ? "Deactivate" : "Activate"}>
                        {role.is_active ? <Ban className="h-4 w-4 text-orange-600" /> : <Power className="h-4 w-4 text-green-600" />}
                      </Button>
                    )}
                    {canAccessNavigationItem("CONFIG_ROLES", "DELETE") && !role.is_system_role && (
                      <Button variant="ghost" size="icon" onClick={() => {
                        setRoleToDelete(role);
                        setIsDeleteDialogOpen(true);
                      }}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Add New Role"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Role Name</label>
              <Input 
                required
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="Finance Manager"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role Code</label>
              <Input 
                required
                disabled={!!editingRole}
                value={formData.code} 
                onChange={e => setFormData({...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '_')})} 
                placeholder="FINANCE_MANAGER"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                placeholder="Can view and approve financial records..."
              />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <input 
                type="checkbox" 
                id="is_active"
                checked={formData.is_active}
                onChange={e => setFormData({...formData, is_active: e.target.checked})}
                className="rounded border-slate-300"
              />
              <label htmlFor="is_active" className="text-sm font-medium">Active Role</label>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingRole ? "Update Role" : "Create Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this role?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the role
              and remove it from all assigned users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {roleToDeactivate?.is_active ? "Deactivate Role" : "Activate Role"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {roleToDeactivate?.is_active 
                ? "This will deactivate the role. Users with this role may lose access to associated permissions."
                : "This will reactivate the role."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeactivate}
              disabled={updateMutation.isPending}
              className={roleToDeactivate?.is_active ? "bg-orange-600 hover:bg-orange-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}
            >
              {updateMutation.isPending ? "Updating..." : (roleToDeactivate?.is_active ? "Deactivate" : "Activate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Edit, Trash2, KeyRound, ArrowUpDown, Power, Ban, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import type { User } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Users() {
  const { canAccessNavigationItem } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    password: "",
    is_active: true,
    is_super_admin: false,
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiClient.get<User[]>("/api/configuration/users"),
  });

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'full_name', direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState("");

  const sortedUsers = useMemo(() => {
    if (!users) return [];
    let sortableItems = [...users];

    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      sortableItems = sortableItems.filter(u => 
        (u.full_name && u.full_name.toLowerCase().includes(lowerQuery)) || 
        u.email.toLowerCase().includes(lowerQuery)
      );
    }

    if (sortConfig !== null) {
      sortableItems.sort((a: any, b: any) => {
        let aValue = a[sortConfig.key] || "";
        let bValue = b[sortConfig.key] || "";
        
        // Handle boolean sorting natively
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
  }, [users, sortConfig, searchQuery]);

  const requestSort = (key: string) => {
    setSortConfig({ key, direction: 'asc' });
  };

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiClient.post("/api/configuration/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created successfully");
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to create user"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string, payload: Partial<typeof formData> }) => 
      apiClient.put(`/api/configuration/users/${data.id}`, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated successfully");
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to update user"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/configuration/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deactivated/deleted successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete user"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalEmail = formData.email.includes("@") ? formData.email : `${formData.email}@zenatech.com`;
    const payload = { ...formData, email: finalEmail };

    if (payload.password) {
      if (payload.password.length < 10) {
        toast.error("Password must be at least 10 characters long");
        return;
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(payload.password)) {
        toast.error("Password must contain at least 1 symbol");
        return;
      }
    }

    if (editingUser) {
      // Don't send password if empty
      if (!payload.password) {
        delete (payload as any).password;
      }
      updateMutation.mutate({ id: editingUser.id, payload });
    } else {
      createMutation.mutate(payload as typeof formData);
    }
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    setFormData({ email: "", full_name: "", password: "", is_active: true, is_super_admin: false });
    setIsDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteMutation.mutateAsync(userToDelete.id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const confirmDeactivate = async () => {
    if (!userToDeactivate) return;
    try {
      await updateMutation.mutateAsync({
        id: userToDeactivate.id,
        payload: { is_active: !userToDeactivate.is_active }
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeactivateDialogOpen(false);
      setUserToDeactivate(null);
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormData({ 
      email: user.email.replace(/@zenatech\.com$/, ""), 
      full_name: user.full_name || "", 
      password: "", 
      is_active: (user as any).is_active ?? true, 
      is_super_admin: user.is_super_admin 
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">Users</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400">Manage system users and their access.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-zinc-400" />
            <Input 
              placeholder="Search users..." 
              className="pl-9 bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 focus-visible:ring-blue-500/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {canAccessNavigationItem("CONFIG_USERS", "CREATE") && (
            <Button onClick={openCreateDialog} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Add User
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm flex flex-col">
        <Table>
          <TableHeader className="bg-slate-50/80 dark:bg-zinc-950/50">
            <TableRow>
              <TableHead onClick={() => requestSort("full_name")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                <div className="flex items-center">Name <ArrowUpDown className="ml-2 h-4 w-4" /></div>
              </TableHead>
              <TableHead onClick={() => requestSort("email")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                <div className="flex items-center">Email <ArrowUpDown className="ml-2 h-4 w-4" /></div>
              </TableHead>
              <TableHead onClick={() => requestSort("is_active")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                <div className="flex items-center">Status <ArrowUpDown className="ml-2 h-4 w-4" /></div>
              </TableHead>
              <TableHead onClick={() => requestSort("assigned_roles")} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                <div className="flex items-center">Roles <ArrowUpDown className="ml-2 h-4 w-4" /></div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">Loading users...</TableCell>
              </TableRow>
            ) : sortedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">No users found.</TableCell>
              </TableRow>
            ) : (
              sortedUsers.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name || "-"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.is_active ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.is_super_admin ? (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 mb-1 mr-1">Super Admin</Badge>
                    ) : user.assigned_roles && user.assigned_roles.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.assigned_roles.map((role: any) => (
                          <Badge key={role.id} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400">
                            {role.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500 text-sm italic">No Roles</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {canAccessNavigationItem("CONFIG_USER_ROLE_ASSIGNMENT", "VIEW") && (
                      <Button variant="outline" size="sm" onClick={() => navigate(`/configurations/user-role-assignment?userId=${user.id}`)}>
                        <KeyRound className="h-4 w-4 mr-1" /> Roles
                      </Button>
                    )}
                    {canAccessNavigationItem("CONFIG_USERS", "EDIT") && (
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}>
                        <Edit className="h-4 w-4 text-blue-600" />
                      </Button>
                    )}
                    {canAccessNavigationItem("CONFIG_USERS", "EDIT") && (
                      <Button variant="ghost" size="icon" onClick={() => {
                        setUserToDeactivate(user);
                        setIsDeactivateDialogOpen(true);
                      }} title={user.is_active ? "Deactivate" : "Activate"}>
                        {user.is_active ? <Ban className="h-4 w-4 text-orange-600" /> : <Power className="h-4 w-4 text-green-600" />}
                      </Button>
                    )}
                    {canAccessNavigationItem("CONFIG_USERS", "DELETE") && (
                      <Button variant="ghost" size="icon" onClick={() => {
                        setUserToDelete(user);
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
            <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input 
                value={formData.full_name} 
                onChange={e => setFormData({...formData, full_name: e.target.value})} 
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="flex rounded-md shadow-sm">
                <Input 
                  type="text"
                  required
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value.replace(/@.*$/, "")})} 
                  placeholder="john"
                  className="rounded-r-md rounded-tr-none rounded-br-none focus-visible:ring-0 focus-visible:ring-offset-0 border-r-0"
                />
                <span className="inline-flex items-center rounded-r-md border border-l-0 border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                  @zenatech.com
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password {editingUser && "(Leave blank to keep current)"}</label>
              <Input 
                type="password"
                required={!editingUser}
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                placeholder="••••••••"
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
              <label htmlFor="is_active" className="text-sm font-medium">Active Account</label>
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="is_super_admin"
                checked={formData.is_super_admin}
                onChange={e => setFormData({...formData, is_super_admin: e.target.checked})}
                className="rounded border-slate-300"
              />
              <label htmlFor="is_super_admin" className="text-sm font-medium text-purple-700 dark:text-purple-400">Super Admin Privileges</label>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingUser ? "Update User" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user
              account and remove their data from our servers.
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
              {userToDeactivate?.is_active ? "Deactivate User" : "Activate User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userToDeactivate?.is_active 
                ? "This will deactivate the user account. They will no longer be able to log in, but their data will be preserved."
                : "This will reactivate the user account, allowing them to log in again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeactivate}
              disabled={updateMutation.isPending}
              className={userToDeactivate?.is_active ? "bg-orange-600 hover:bg-orange-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}
            >
              {updateMutation.isPending ? "Updating..." : (userToDeactivate?.is_active ? "Deactivate" : "Activate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

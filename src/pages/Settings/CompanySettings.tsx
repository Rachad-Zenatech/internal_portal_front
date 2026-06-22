import { useState } from "react";
import type { Company, CompanyCreate } from "../../types/bank";
import { useCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany } from "../../hooks/useBank";
import { Plus, Edit2, Trash2, Search, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function CompanySettings() {
  const { data: companies = [], isLoading } = useCompanies();
  const createMutation = useCreateCompany();
  const updateMutation = useUpdateCompany();
  const deleteMutation = useDeleteCompany();

  const [searchQuery, setSearchQuery] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CompanyCreate>({
    name: "", entity: "", description: "", group: "DAAS", state: "", country: "",
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  const handleOpenModal = (company?: Company) => {
    if (company) {
      setEditingId(company.id);
      setFormData({
        name: company.name,
        entity: company.entity || "",
        description: company.description || "",
        group: company.group || "DAAS",
        state: company.state || "",
        country: company.country || "",
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", entity: "", description: "", group: "DAAS", state: "", country: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSaveClick = async () => {
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setIsDialogOpen(false);
      toast.success("Company saved successfully", { position: "top-center" });
    } catch (e: any) {
      toast.error("Error", { description: e.message });
    }
  };

  const handleDeleteClick = (company: Company) => {
    setCompanyToDelete(company);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!companyToDelete) return;
    try {
      await deleteMutation.mutateAsync(companyToDelete.id);
      toast.success("Company deleted", { position: "top-center" });
    } catch (e: any) {
      toast.error("Error", { description: e.message });
    }
    setIsDeleteDialogOpen(false);
    setCompanyToDelete(null);
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.entity || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.group || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.state || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.country || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Company Settings</h1>
          <p className="text-slate-500 mt-1">Manage the companies and entities within your organization.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              type="text" 
              placeholder="Search companies..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus size={16} /> Add Company
          </Button>
        </div>
      </div>

      {/* DATA TABLE */}
      <Card className="overflow-hidden p-0">
        <Table className="m-0 relative" containerClassName="max-h-[calc(100vh-16rem)]">
          <TableHeader className="sticky top-0 z-10 bg-slate-50 shadow-sm">
            <TableRow className="bg-slate-50 hover:bg-slate-50 border-t-0">
                <TableHead className="h-12 w-[250px]">Name</TableHead>
                <TableHead className="h-12 w-[150px]">Entity</TableHead>
                <TableHead className="h-12 w-[100px]">Group</TableHead>
                <TableHead className="h-12 w-[100px]">State</TableHead>
                <TableHead className="h-12 w-[100px]">Country</TableHead>
                <TableHead className="h-12 min-w-[200px]">Description</TableHead>
                <TableHead className="text-right h-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filteredCompanies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-12 text-center border-b-0">
                    <div className="flex flex-col items-center justify-center">
                      <h3 className="text-lg font-semibold text-foreground">No data</h3>
                      <p className="text-sm text-muted-foreground mt-1">No companies found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCompanies.map((c, index) => (
                  <TableRow key={c.id} className={index === filteredCompanies.length - 1 ? "border-b-0" : ""}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.entity || "-"}</TableCell>
                    <TableCell>{c.group || "-"}</TableCell>
                    <TableCell>{c.state || "-"}</TableCell>
                    <TableCell>{c.country || "-"}</TableCell>
                    <TableCell className="max-w-[250px] truncate" title={c.description || ""}>{c.description || "-"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenModal(c)}>
                        <Edit2 size={14} className="mr-1" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(c)}>
                        <Trash2 size={14} className="mr-1" /> Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
      </Card>

      {/* EDIT MODAL */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>{editingId ? "Edit Company" : "Add Company"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Entity</Label>
                <Input value={formData.entity || ""} onChange={e => setFormData({...formData, entity: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Group</Label>
                <select value={formData.group || "DAAS"} onChange={e => setFormData({...formData, group: e.target.value})} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="DAAS">DAAS</option>
                  <option value="SAAS">SAAS</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input value={formData.state || ""} onChange={e => setFormData({...formData, state: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input value={formData.country || ""} onChange={e => setFormData({...formData, country: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={formData.description || ""} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveClick}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" />Delete Company?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete <strong>{companyToDelete?.name}</strong>?<br /><br />This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCompanyToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete(); }} className="bg-red-600 hover:bg-red-700">Yes, Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

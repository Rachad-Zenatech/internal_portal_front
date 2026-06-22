import { useState } from "react";
import type { Bank, BankCreate } from "../../types/bank";
import { useBanks, useCreateBank, useUpdateBank, useDeleteBank } from "../../hooks/useBank";
import { Plus, Edit2, Trash2, Search, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed";
}

export default function BankSettings() {
  const { data: banks = [], isLoading } = useBanks();
  const createMutation = useCreateBank();
  const updateMutation = useUpdateBank();
  const deleteMutation = useDeleteBank();

  const [searchQuery, setSearchQuery] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<BankCreate>({
    name: "", type: "", notes: "",
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [bankToDelete, setBankToDelete] = useState<Bank | null>(null);

  const handleOpenModal = (bank?: Bank) => {
    if (bank) {
      setEditingId(bank.id);
      setFormData({
        name: bank.name,
        type: bank.type || "",
        notes: bank.notes || "",
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", type: "", notes: "" });
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
      toast.success("Bank saved successfully", { position: "top-center" });
    } catch (error) {
      toast.error("Error", { description: errorMessage(error) });
    }
  };

  const handleDeleteClick = (bank: Bank) => {
    setBankToDelete(bank);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!bankToDelete) return;
    try {
      await deleteMutation.mutateAsync(bankToDelete.id);
      toast.success("Bank deleted", { position: "top-center" });
    } catch (error) {
      toast.error("Error", { description: errorMessage(error) });
    }
    setIsDeleteDialogOpen(false);
    setBankToDelete(null);
  };

  const filteredBanks = banks.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (b.type || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
    (b.notes || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank Settings</h1>
          <p className="text-slate-500 mt-1">Manage the banks used across the organization.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              type="text" 
              placeholder="Search banks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus size={16} /> Add Bank
          </Button>
        </div>
      </div>

      {/* DATA TABLE */}
      <Card className="overflow-hidden p-0">
        <Table className="m-0 relative" containerClassName="max-h-[calc(100vh-16rem)]">
          <TableHeader className="sticky top-0 z-10 bg-slate-50 shadow-sm">
            <TableRow className="bg-slate-50 hover:bg-slate-50 border-t-0">
                <TableHead className="h-12 w-[250px]">Name</TableHead>
                <TableHead className="h-12 w-[150px]">Type</TableHead>
                <TableHead className="h-12">Notes</TableHead>
                <TableHead className="text-right h-12 w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filteredBanks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="p-12 text-center border-b-0">
                    <div className="flex flex-col items-center justify-center">
                      <h3 className="text-lg font-semibold text-foreground">No data</h3>
                      <p className="text-sm text-muted-foreground mt-1">No banks found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBanks.map((b, index) => (
                  <TableRow key={b.id} className={index === filteredBanks.length - 1 ? "border-b-0" : ""}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>{b.type || "-"}</TableCell>
                    <TableCell className="text-slate-500">{b.notes || "-"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenModal(b)}>
                        <Edit2 size={14} className="mr-1" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(b)}>
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
          <DialogHeader><DialogTitle>{editingId ? "Edit Bank" : "Add Bank"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Input value={formData.type || ""} onChange={e => setFormData({...formData, type: e.target.value})} placeholder="" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={formData.notes || ""} onChange={e => setFormData({...formData, notes: e.target.value})} />
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
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" />Delete Bank?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete <strong>{bankToDelete?.name}</strong>?<br /><br />This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBankToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete(); }} className="bg-red-600 hover:bg-red-700">Yes, Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

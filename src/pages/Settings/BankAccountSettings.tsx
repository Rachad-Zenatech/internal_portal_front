import { useState, useEffect } from "react";
import { bankService, bankAccountService, companyService } from "../../services/bankService";
import type { BankAccountWithDetails, BankAccountCreate, BankAccountUpdate, Bank, Company } from "../../types/bank";
import { Plus, Edit2, Trash2, Search, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function BankAccountSettings() {
  const [accounts, setAccounts] = useState<BankAccountWithDetails[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<BankAccountCreate>({
    company_id: 0, bank_id: 0, account_number: "",
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<BankAccountWithDetails | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [accs, comps, bnks] = await Promise.all([
        bankAccountService.getBankAccounts(),
        companyService.getCompanies(),
        bankService.getBanks()
      ]);
      setAccounts(accs);
      setCompanies(comps);
      setBanks(bnks);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenModal = (account?: BankAccountWithDetails) => {
    if (account) {
      setEditingId(account.id);
      setFormData({
        company_id: account.company_id,
        bank_id: account.bank_id,
        account_number: account.account_number,
      });
    } else {
      setEditingId(null);
      setFormData({ company_id: 0, bank_id: 0, account_number: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSaveClick = async () => {
    try {
      if (editingId) await bankAccountService.updateBankAccount(editingId, formData);
      else await bankAccountService.createBankAccount(formData);
      setIsDialogOpen(false);
      toast.success("Account saved successfully", { position: "top-center" });
      loadData();
    } catch (e: any) {
      toast.error("Error", { description: e.message });
    }
  };

  const handleDeleteClick = (account: BankAccountWithDetails) => {
    setAccountToDelete(account);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!accountToDelete) return;
    try {
      await bankAccountService.deleteBankAccount(accountToDelete.id);
      toast.success("Account deleted", { position: "top-center" });
      loadData();
    } catch (e: any) {
      toast.error("Error", { description: e.message });
    }
    setIsDeleteDialogOpen(false);
    setAccountToDelete(null);
  };

  const filteredAccounts = accounts.filter(a => 
    a.company_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.bank_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.account_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.bank_type || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank Account Settings</h1>
          <p className="text-slate-500 mt-1">Manage bank accounts linked to your companies and banks.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              type="text" 
              placeholder="Search accounts..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus size={16} /> Add Account
          </Button>
        </div>
      </div>

      {/* DATA TABLE */}
      <Card className="overflow-hidden p-0">
        <Table className="m-0 relative" containerClassName="max-h-[calc(100vh-16rem)]">
          <TableHeader className="sticky top-0 z-10 bg-slate-50 shadow-sm">
            <TableRow className="bg-slate-50 hover:bg-slate-50 border-t-0">
                <TableHead className="h-12 w-[250px]">Company</TableHead>
                <TableHead className="h-12 w-[250px]">Bank</TableHead>
                <TableHead className="h-12">Account Number</TableHead>
                <TableHead className="text-right h-12 w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground border-b-0">
                    No bank accounts found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAccounts.map((a, index) => (
                  <TableRow key={a.id} className={index === filteredAccounts.length - 1 ? "border-b-0" : ""}>
                    <TableCell className="font-medium">{a.company_name}</TableCell>
                    <TableCell>{a.bank_name}</TableCell>
                    <TableCell className="font-mono text-sm text-slate-600">{a.account_number}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenModal(a)}>
                        <Edit2 size={14} className="mr-1" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(a)}>
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
          <DialogHeader><DialogTitle>{editingId ? "Edit Account" : "Add Account"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Company *</Label>
              <select value={formData.company_id || ""} onChange={e => setFormData({...formData, company_id: Number(e.target.value)})} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option value="" disabled>Select a company</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Bank *</Label>
              <select value={formData.bank_id || ""} onChange={e => setFormData({...formData, bank_id: Number(e.target.value)})} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option value="" disabled>Select a bank</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Account Number (last 4 digits) *</Label>
              <Input 
                value={formData.account_number} 
                maxLength={4}
                placeholder="e.g. 1234"
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  setFormData({...formData, account_number: val});
                }} 
              />
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
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" />Delete Account?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this account (<strong>{accountToDelete?.account_number}</strong>)?<br /><br />This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAccountToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete(); }} className="bg-red-600 hover:bg-red-700">Yes, Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState } from "react";
import type { ChartOfAccount } from "@/types/chartOfAccount";
import { useDeleteChartOfAccount, useUpdateChartOfAccount } from "@/hooks/useChartOfAccount";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface COATableProps {
  result: any;
  loadingData: boolean;
}

export default function COATable({ result, loadingData }: COATableProps) {
  const { mutate: deleteAccount } = useDeleteChartOfAccount();
  const { mutate: updateAccount } = useUpdateChartOfAccount();

  // Edit State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<ChartOfAccount>({
    id: 0, account_number: "", account_type: "", detail_type: "", account_name: "",
  });

  // Delete State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<any>(null);

  const handleEditClick = (account: ChartOfAccount) => {
    setEditForm({ ...account });
    setIsDialogOpen(true);
  };

  const handleSaveClick = () => {
    updateAccount(editForm, {
      onSuccess: (data) => {
        toast.success(data.message, { position: "top-center" });
        setIsDialogOpen(false);
      },
      onError: (error: Error) => {
        toast.error("Failed to Update", { description: error.message });
      }
    });
  };

  const handleDeleteClick = (account: any) => {
    setAccountToDelete(account);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (accountToDelete?.id !== undefined) deleteAccount(accountToDelete.id);
    setIsDeleteDialogOpen(false);
    setAccountToDelete(null);
  };

  return (
    <>
      <Card className="overflow-hidden p-0">
        <Table className="m-0 relative" containerClassName="max-h-[calc(100vh-16rem)]">
          <TableHeader className="sticky top-0 z-10 bg-slate-50 shadow-sm">
            <TableRow className="bg-slate-50 hover:bg-slate-50 border-t-0">
                <TableHead className="w-[150px] h-12">Account #</TableHead>
                <TableHead className="h-12">Account Name</TableHead>
                <TableHead className="h-12">Type</TableHead>
                <TableHead className="h-12">Detail Type</TableHead>
                <TableHead className="text-right h-12">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingData ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : result?.chart_of_accounts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground border-b-0">
                    No accounts found.
                  </TableCell>
                </TableRow>
              ) : (
                result?.chart_of_accounts?.map((account: any, index: number) => (
                  <TableRow 
                    key={account.id} 
                    // Remove bottom border on the very last row so it doesn't double up with the Card's bottom border
                    className={index === result.chart_of_accounts.length - 1 ? "border-b-0" : ""}
                  >
                    <TableCell className="font-medium">{account.account_number}</TableCell>
                    <TableCell>{account.account_name}</TableCell>
                    <TableCell>{account.account_type}</TableCell>
                    <TableCell>{account.detail_type}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditClick(account)}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(account)}>Remove</Button>
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
          <DialogHeader><DialogTitle>Edit Account</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Account #</Label><Input value={editForm.account_number} onChange={(e) => setEditForm({ ...editForm, account_number: e.target.value })} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Type</Label><Input value={editForm.account_type} onChange={(e) => setEditForm({ ...editForm, account_type: e.target.value })} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Detail</Label><Input value={editForm.detail_type} onChange={(e) => setEditForm({ ...editForm, detail_type: e.target.value })} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Name</Label><Input value={editForm.account_name} onChange={(e) => setEditForm({ ...editForm, account_name: e.target.value })} className="col-span-3" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveClick}>Save changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" />Delete Account?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete account <strong>{accountToDelete?.account_number} - {accountToDelete?.account_name}</strong>?<br /><br />This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAccountToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete(); }} className="bg-red-600 hover:bg-red-700">Yes, Delete Account</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
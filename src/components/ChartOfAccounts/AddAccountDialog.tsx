import { useState } from "react";
import type { ChartOfAccount } from "@/types/chartOfAccount";
import { useInsertChartOfAccount } from "@/hooks/useChartOfAccount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

export default function AddAccountDialog() {
  const { mutate, isPending: insertingData } = useInsertChartOfAccount();
  const [open, setOpen] = useState(false);
  const [newAccount, setNewAccount] = useState<ChartOfAccount>({
    account_number: "", account_type: "", detail_type: "", account_name: "",
  });

  const addAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutate(newAccount, {
      onSuccess: () => {
        setNewAccount({ account_number: "", account_type: "", detail_type: "", account_name: "" });
        toast("Account has been created", { description: "Your new account has been saved successfully.", position: "top-center" });
        setOpen(false);
      },
      onError: (error: Error) => {
        toast.error("Insert Failed", { description: error.message || "There was an issue saving the account.", position: "top-center" });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Chart of Account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Account</DialogTitle>
          <DialogDescription>Manually create a single ledger account entry.</DialogDescription>
        </DialogHeader>
        <form onSubmit={addAccount} className="flex flex-col gap-6 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input placeholder="Account Number" value={newAccount.account_number} disabled={insertingData} onChange={(e) => setNewAccount({ ...newAccount, account_number: e.target.value })} required />
            <Input placeholder="Account Name" value={newAccount.account_name} disabled={insertingData} onChange={(e) => setNewAccount({ ...newAccount, account_name: e.target.value })} required />
            <Input placeholder="Account Type" value={newAccount.account_type} disabled={insertingData} onChange={(e) => setNewAccount({ ...newAccount, account_type: e.target.value })} required />
            <Input placeholder="Detail Type" value={newAccount.detail_type} disabled={insertingData} onChange={(e) => setNewAccount({ ...newAccount, detail_type: e.target.value })} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={insertingData}>
              {insertingData ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</> : "Add Account"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import type { ChartOfAccount } from "@/types/chartOfAccount";
import { useInsertChartOfAccount } from "@/hooks/useChartOfAccount";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AddAccountCard() {
  const { mutate, isPending: insertingData } = useInsertChartOfAccount();
  const [newAccount, setNewAccount] = useState<ChartOfAccount>({
    account_number: "", account_type: "", detail_type: "", account_name: "",
  });

  const addAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutate(newAccount, {
      onSuccess: () => {
        setNewAccount({ account_number: "", account_type: "", detail_type: "", account_name: "" });
        toast("Account has been created", { description: "Your new account has been saved successfully.", position: "top-center" });
      },
      onError: (error: Error) => {
        toast.error("Insert Failed", { description: error.message || "There was an issue saving the account.", position: "top-center" });
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Account</CardTitle>
        <CardDescription>Manually create a single ledger account entry.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={addAccount} className="flex flex-col h-[184px] justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input placeholder="Account Number" value={newAccount.account_number} disabled={insertingData} onChange={(e) => setNewAccount({ ...newAccount, account_number: e.target.value })} />
            <Input placeholder="Account Name" value={newAccount.account_name} disabled={insertingData} onChange={(e) => setNewAccount({ ...newAccount, account_name: e.target.value })} />
            <Input placeholder="Account Type" value={newAccount.account_type} disabled={insertingData} onChange={(e) => setNewAccount({ ...newAccount, account_type: e.target.value })} />
            <Input placeholder="Detail Type" value={newAccount.detail_type} disabled={insertingData} onChange={(e) => setNewAccount({ ...newAccount, detail_type: e.target.value })} />
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={insertingData} variant="secondary" className="w-full sm:w-auto">
              {insertingData ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</> : "Add Account"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
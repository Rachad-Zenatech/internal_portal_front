// src/pages/ChartOfAccounts.tsx

import { useEffect, useState } from "react";
import type { ChartOfAccount, ChartOfAccounts } from "@/types/chartOfAccount";
import {
  useChartOfAccounts,
  useInsertChartOfAccount,
} from "@/hooks/useChartOfAccount";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ChartOfAccounts() {
  const { data: result, isPending: loadingData, error } = useChartOfAccounts();
  const { mutate, isPending: insertingData } = useInsertChartOfAccount();
  const [newAccount, setNewAccount] = useState<ChartOfAccount>({
    account_number: "",
    account_type: "",
    detail_type: "",
    account_name: "",
  });

  const addAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutate(newAccount, {
      onSuccess: () => {
        setNewAccount({
          account_number: "",
          account_type: "",
          detail_type: "",
          account_name: "",
        });

        toast("Account Created",{
          description: "Your new account has been saved successfully.",
        });
      },
      onError: (error: Error) => {
        // ✅ Failed Toast
        toast.error("Insert Failed", {
          description:
            error.message || "There was an issue saving the account.",
        });
      },
    });
  };

  // async function addAccount() {
  //   const account: ChartAccount = {
  //     id: Date.now(),
  //     ...newAccount,
  //   };

  //   Later:
  //   await fetch("http://localhost:8000/chart-of-accounts", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify(newAccount),
  //   });

  //   setAccounts((current) => [...current, account]);
  // }

  async function deleteAccount(id: number) {
    // Later:
    // await fetch(`http://localhost:8000/chart-of-accounts/${id}`, {
    //   method: "DELETE",
    // });
    // setAccounts((current) =>
    //   current.filter((account) => account.id !== id)
    // );
  }

  async function replaceChartOfAccounts(file: File | null) {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    // Later:
    // await fetch("http://localhost:8000/chart-of-accounts/replace", {
    //   method: "POST",
    //   body: formData,
    // });

    console.log("Replace COA with:", file.name);
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chart of Accounts</h1>

          <p className="text-slate-500">
            Manage the permanent account list used by the accounting system.
          </p>
        </div>

        <label className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Replace Full COA
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) =>
              replaceChartOfAccounts(e.target.files?.[0] ?? null)
            }
          />
        </label>
      </div>

      <div className="mb-6 rounded-xl border bg-white p-6">
        <form
          onSubmit={addAccount}
          className="mb-6 rounded-xl border bg-white p-6"
        >
          <h2 className="mb-4 text-xl font-semibold">Add New Account</h2>

          <div className="grid grid-cols-5 gap-4">
            <Input
              placeholder="Account Number"
              value={newAccount.account_number} // Fixed: changed from account_number to accountNumber
              disabled={insertingData} // Locks input while loading
              onChange={(e) =>
                setNewAccount({
                  ...newAccount,
                  account_number: e.target.value,
                })
              }
            />

            <Input
              placeholder="Account Type"
              value={newAccount.account_type}
              disabled={insertingData}
              onChange={(e) =>
                setNewAccount({
                  ...newAccount,
                  account_type: e.target.value,
                })
              }
            />

            <Input
              placeholder="Detail Type"
              value={newAccount.detail_type}
              disabled={insertingData}
              onChange={(e) =>
                setNewAccount({
                  ...newAccount,
                  detail_type: e.target.value,
                })
              }
            />

            <Input
              placeholder="Account Name"
              value={newAccount.account_name}
              disabled={insertingData}
              onChange={(e) =>
                setNewAccount({
                  ...newAccount,
                  account_name: e.target.value,
                })
              }
            />

            <Button type="submit" disabled={insertingData}>
              {/* If saving, show a spinner. Otherwise, show "Add Account" */}
              {insertingData ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Account"
              )}
            </Button>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <Table>
          {/* TABLE HEADER */}
          <TableHeader>
            {/* Added hover:bg-slate-100 so the header doesn't change color when your mouse moves over it */}
            <TableRow className="bg-slate-100 hover:bg-slate-100">
              <TableHead>Account #</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Detail Type</TableHead>
              <TableHead>Account Name</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>

          {/* TABLE BODY (Includes Skeleton from previous step) */}
          <TableBody>
            {loadingData ? (
              // LOADING STATE
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-16 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : result?.chart_of_accounts?.length === 0 ? (
              // EMPTY STATE
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No accounts found.
                </TableCell>
              </TableRow>
            ) : (
              // DATA STATE
              result?.chart_of_accounts?.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">
                    {account.account_number}
                  </TableCell>
                  <TableCell>{account.account_type}</TableCell>
                  <TableCell>{account.detail_type}</TableCell>
                  <TableCell>{account.account_name}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteAccount(account.id)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

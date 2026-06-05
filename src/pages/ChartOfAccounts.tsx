// src/pages/ChartOfAccounts.tsx

import { useEffect, useState } from "react";

interface ChartAccount {
  id: number;
  accountNumber: string;
  accountType: string;
  detailType: string;
  accountName: string;
}

const mockAccounts: ChartAccount[] = [
  {
    id: 1,
    accountNumber: "1000",
    accountType: "Bank",
    detailType: "Checking",
    accountName: "BOA - 7458 (Pace Plus)",
  },
  {
    id: 2,
    accountNumber: "1005",
    accountType: "Bank",
    detailType: "Checking",
    accountName: "BOA - 9016 (ZooOffice)",
  },
  {
    id: 3,
    accountNumber: "1010",
    accountType: "Bank",
    detailType: "Checking",
    accountName: "BOA - 5974 (PsPortals)",
  },
];

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [newAccount, setNewAccount] = useState({
    accountNumber: "",
    accountType: "",
    detailType: "",
    accountName: "",
  });

  useEffect(() => {
    loadChartOfAccounts();
  }, []);

  async function loadChartOfAccounts() {
    // Later replace this with FastAPI:
    // const res = await fetch("http://localhost:8000/chart-of-accounts");
    // const data = await res.json();
    // setAccounts(data);

    setAccounts(mockAccounts);
  }

  async function addAccount() {
    if (!newAccount.accountNumber || !newAccount.accountName) {
      return;
    }

    const account: ChartAccount = {
      id: Date.now(),
      ...newAccount,
    };

    // Later:
    // await fetch("http://localhost:8000/chart-of-accounts", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(newAccount),
    // });

    setAccounts((current) => [...current, account]);

    setNewAccount({
      accountNumber: "",
      accountType: "",
      detailType: "",
      accountName: "",
    });
  }

  async function deleteAccount(id: number) {
    // Later:
    // await fetch(`http://localhost:8000/chart-of-accounts/${id}`, {
    //   method: "DELETE",
    // });

    setAccounts((current) =>
      current.filter((account) => account.id !== id)
    );
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
          <h1 className="text-3xl font-bold">
            Chart of Accounts
          </h1>

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
        <h2 className="mb-4 text-xl font-semibold">
          Add New Account
        </h2>

        <div className="grid grid-cols-5 gap-4">
          <input
            placeholder="Account Number"
            value={newAccount.accountNumber}
            onChange={(e) =>
              setNewAccount({
                ...newAccount,
                accountNumber: e.target.value,
              })
            }
            className="rounded-lg border p-2"
          />

          <input
            placeholder="Account Type"
            value={newAccount.accountType}
            onChange={(e) =>
              setNewAccount({
                ...newAccount,
                accountType: e.target.value,
              })
            }
            className="rounded-lg border p-2"
          />

          <input
            placeholder="Detail Type"
            value={newAccount.detailType}
            onChange={(e) =>
              setNewAccount({
                ...newAccount,
                detailType: e.target.value,
              })
            }
            className="rounded-lg border p-2"
          />

          <input
            placeholder="Account Name"
            value={newAccount.accountName}
            onChange={(e) =>
              setNewAccount({
                ...newAccount,
                accountName: e.target.value,
              })
            }
            className="rounded-lg border p-2"
          />

          <button
            onClick={addAccount}
            className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
          >
            Add Account
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left">Account #</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Detail Type</th>
              <th className="p-3 text-left">Account Name</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody>
            {accounts.map((account) => (
              <tr key={account.id} className="border-t">
                <td className="p-3">{account.accountNumber}</td>
                <td className="p-3">{account.accountType}</td>
                <td className="p-3">{account.detailType}</td>
                <td className="p-3">{account.accountName}</td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => deleteAccount(account.id)}
                    className="rounded bg-red-100 px-3 py-1 text-red-700 hover:bg-red-200"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
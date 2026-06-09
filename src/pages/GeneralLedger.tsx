// src/pages/GeneralLedger.tsx

import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

const companies = [
  {
    id: 1,
    name: "LTD King",
    entity: "ZT",
    banks: [
      {
        id: 1,
        name: "Vystar",
        accounts: [
          {
            id: 1,
            name: "Checking",
            accountCode: "1001",
          },
        ],
      },
      {
        id: 2,
        name: "Ameris",
        accounts: [
          {
            id: 2,
            name: "Operating",
            accountCode: "1004",
          },
        ],
      },
    ],
  },
  {
    id: 2,
    name: "Drone as a Service - CK",
    entity: "ZT",
    banks: [
      {
        id: 3,
        name: "Central Bank",
        accounts: [
          {
            id: 3,
            name: "Checking",
            accountCode: "1000",
          },
        ],
      },
    ],
  },
];

const transactions = [
  {
    companyId: 1,
    date: "01/07/2026",
    type: "Check",
    name: "Construction Connect",
    memo: "CONSTRUCTCONNECT",
    glAccount: "6390 - Dues and Subscriptions",
    amount: -739.06,
  },
  {
    companyId: 1,
    date: "01/12/2026",
    type: "Deposit",
    name: "CDM CONSTRUCTORS",
    memo: "Deposit Payee",
    glAccount: "1120 - Undeposited Funds",
    amount: 1885.0,
  },
  {
    companyId: 2,
    date: "01/15/2026",
    type: "Check",
    name: "Tax Collector",
    memo: "State of Florida",
    glAccount: "6900 - Tax Expense",
    amount: -1.08,
  },
];

export default function GeneralLedger() {
  const [companyId, setCompanyId] = useState("");
  const [bankId, setBankId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [month, setMonth] = useState("");
  const [viewMonth, setViewMonth] = useState("");
  const [viewCompanyId, setViewCompanyId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedCompany = companies.find(
    (company) => company.id === Number(companyId)
  );

  const selectedBank = selectedCompany?.banks.find(
    (bank) => bank.id === Number(bankId)
  );

  const selectedViewCompany = companies.find(
    (company) => company.id === Number(viewCompanyId)
  );

  const companiesToShow = viewCompanyId
    ? companies.filter((company) => company.id === Number(viewCompanyId))
    : companies;

  const handleUpload = () => {
    if (!companyId || !bankId || !bankAccountId || !month || !file) {
      alert("Please select company, bank, bank account, month, and file.");
      return;
    }

    const formData = new FormData();

    formData.append("company_id", companyId);
    formData.append("bank_id", bankId);
    formData.append("bank_account_id", bankAccountId);
    formData.append("month", month);
    formData.append("file", file);

    console.log("Ready to upload:", {
      companyId,
      bankId,
      bankAccountId,
      month,
      fileName: file.name,
    });
  };

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">General Ledger</h1>

        <p className="text-muted-foreground">
          Upload bank transactions for a company and bank account.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-6 p-6">
          <div>
            <h2 className="text-xl font-semibold">Upload Monthly Statement</h2>

            <p className="text-sm text-muted-foreground">
              Select a company, bank, bank account, month, and statement file to
              upload.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-6">
            <div>
              <label className="mb-2 block text-sm font-medium">Company</label>

              <select
                className="w-full rounded-md border p-2"
                value={companyId}
                onChange={(e) => {
                  setCompanyId(e.target.value);
                  setBankId("");
                  setBankAccountId("");
                }}
              >
                <option value="">Select Company</option>

                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name} ({company.entity})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Bank</label>

              <select
                className="w-full rounded-md border p-2"
                value={bankId}
                onChange={(e) => {
                  setBankId(e.target.value);
                  setBankAccountId("");
                }}
                disabled={!selectedCompany}
              >
                <option value="">Select Bank</option>

                {selectedCompany?.banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Bank Account
              </label>

              <select
                className="w-full rounded-md border p-2"
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                disabled={!selectedBank}
              >
                <option value="">Select Bank Account</option>

                {selectedBank?.accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountCode} - {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Upload Month
              </label>

              <input
                type="month"
                className="w-full rounded-md border p-2"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Upload File
              </label>

              <div className="flex items-center gap-2 rounded-md border p-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse
                </Button>

                <span className="truncate text-sm text-muted-foreground">
                  {file?.name || "No file selected"}
                </span>
              </div>
            </div>

            <div className="flex items-end">
              <Button className="w-full" onClick={handleUpload}>
                Upload & Extract
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                General Ledger Transactions
              </h2>

              <p className="text-sm text-muted-foreground">
                Showing:{" "}
                <strong>
                  {selectedViewCompany
                    ? selectedViewCompany.name
                    : "All Companies"}
                </strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                className="rounded-md border p-2"
                value={viewCompanyId}
                onChange={(e) => setViewCompanyId(e.target.value)}
              >
                <option value="">All Companies</option>

                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name} ({company.entity})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />

                <input
                  type="month"
                  className="rounded-md border p-2"
                  value={viewMonth}
                  onChange={(e) => setViewMonth(e.target.value)}
                />
              </div>

              <Button variant="outline">Export Excel</Button>
            </div>
          </div>

          <div className="space-y-6">
            {companiesToShow.map((company) => {
              const companyTransactions = transactions.filter(
                (transaction) => transaction.companyId === company.id
              );

              const companyTotal = companyTransactions.reduce(
                (sum, transaction) => sum + transaction.amount,
                0
              );

              return (
                <Card key={company.id}>
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold">{company.name}</h3>

                      <p className="text-sm text-muted-foreground">
                        Entity: {company.entity}
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="pb-3">Date</th>
                            <th className="pb-3">Type</th>
                            <th className="pb-3">Name</th>
                            <th className="pb-3">Memo</th>
                            <th className="pb-3">GL Account</th>
                            <th className="pb-3 text-right">Amount</th>
                          </tr>
                        </thead>

                        <tbody>
                          {companyTransactions.length > 0 ? (
                            companyTransactions.map((transaction, index) => (
                              <tr key={index} className="border-b">
                                <td className="py-3">{transaction.date}</td>
                                <td>{transaction.type}</td>
                                <td>{transaction.name}</td>
                                <td>{transaction.memo}</td>
                                <td>{transaction.glAccount}</td>
                                <td className="text-right">
                                  {transaction.amount.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={6}
                                className="py-6 text-center text-muted-foreground"
                              >
                                No transactions found for this company.
                              </td>
                            </tr>
                          )}
                        </tbody>

                        <tfoot>
                          <tr className="border-t font-semibold">
                            <td colSpan={5} className="pt-4">
                              Total
                            </td>

                            <td className="pt-4 text-right">
                              {companyTotal.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
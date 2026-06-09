// src/pages/TrialBalance.tsx

import { useEffect, useState } from "react";

interface TrialBalanceRow {
  accountNumber: string;
  accountName: string;
  debit: number;
  credit: number;
}

interface TrialBalanceResponse {
  company: string;
  fiscalYear: number;
  period: string;
  rows: TrialBalanceRow[];
}

const companies = [
  { id: "LE", name: "Lescure Engineers" },
  { id: "ZT", name: "ZenaTech" },
];

export default function TrialBalance() {
  const [company, setCompany] = useState("LE");

  const [trialBalance, setTrialBalance] =
    useState<TrialBalanceResponse>({
      company: "LE",
      fiscalYear: 2026,
      period: "Q1",
      rows: [],
    });

  const selectedCompany = companies.find(
    (item) => item.id === company
  );

  useEffect(() => {
    loadTrialBalance();
  }, [company]);

  async function loadTrialBalance() {
    if (company === "LE") {
      setTrialBalance({
        company: "Lescure Engineers",
        fiscalYear: 2026,
        period: "Q1",
        rows: [
          {
            accountNumber: "1000",
            accountName: "Cash",
            debit: 15000,
            credit: 0,
          },
          {
            accountNumber: "2000",
            accountName: "Accounts Payable",
            debit: 0,
            credit: 5000,
          },
        ],
      });
    }

    if (company === "ZT") {
      setTrialBalance({
        company: "ZenaTech",
        fiscalYear: 2026,
        period: "Q1",
        rows: [
          {
            accountNumber: "1000",
            accountName: "Cash",
            debit: 35000,
            credit: 0,
          },
          {
            accountNumber: "1200",
            accountName: "Accounts Receivable",
            debit: 12000,
            credit: 0,
          },
          {
            accountNumber: "4000",
            accountName: "Revenue",
            debit: 0,
            credit: 47000,
          },
        ],
      });
    }
  }

  const totalDebit = trialBalance.rows.reduce(
    (sum, row) => sum + row.debit,
    0
  );

  const totalCredit = trialBalance.rows.reduce(
    (sum, row) => sum + row.credit,
    0
  );

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">
          Trial Balance
        </h1>

        <p className="text-slate-500">
          Select a company to view its trial balance.
        </p>
      </div>

      <div className="w-full max-w-md">
        <label className="mb-2 block text-sm font-medium">
          Company
        </label>

        <select
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="w-full rounded-lg border p-2"
        >
          {companies.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b bg-slate-50 p-4">
          <h2 className="text-xl font-semibold">
            {selectedCompany?.name} Trial Balance
          </h2>

          <p className="text-sm text-slate-500">
            Fiscal Year {trialBalance.fiscalYear} • Period{" "}
            {trialBalance.period}
          </p>
        </div>

        <table className="w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left">Account</th>
              <th className="p-3 text-left">Description</th>
              <th className="p-3 text-right">Debit</th>
              <th className="p-3 text-right">Credit</th>
            </tr>
          </thead>

          <tbody>
            {trialBalance.rows.map((row) => (
              <tr key={row.accountNumber} className="border-b">
                <td className="p-3">
                  {row.accountNumber}
                </td>

                <td className="p-3">
                  {row.accountName}
                </td>

                <td className="p-3 text-right">
                  {row.debit.toLocaleString()}
                </td>

                <td className="p-3 text-right">
                  {row.credit.toLocaleString()}
                </td>
              </tr>
            ))}

            <tr className="bg-slate-50 font-bold">
              <td colSpan={2} className="p-3">
                Totals
              </td>

              <td className="p-3 text-right">
                {totalDebit.toLocaleString()}
              </td>

              <td className="p-3 text-right">
                {totalCredit.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
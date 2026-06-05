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

export default function TrialBalance() {
  const [company, setCompany] = useState("LE");

  const [trialBalance, setTrialBalance] =
    useState<TrialBalanceResponse>({
      company: "LE",
      fiscalYear: 2026,
      period: "Q1",
      rows: [],
    });

  useEffect(() => {
    loadTrialBalance();
  }, [company]);

  async function loadTrialBalance() {
    // Later this will call FastAPI
    setTrialBalance({
      company: company,
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

  const totalDebit = trialBalance.rows.reduce(
    (sum, row) => sum + row.debit,
    0
  );

  const totalCredit = trialBalance.rows.reduce(
    (sum, row) => sum + row.credit,
    0
  );

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Trial Balance
          </h1>

          <p className="text-slate-500">
            View company trial balances.
          </p>
        </div>
      </div>

      <div className="mb-6">
        <select
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="rounded-lg border p-2"
        >
          <option value="LE">
            Lescure Engineers
          </option>

          <option value="ZT">
            ZenaTech
          </option>

          <option value="CONSOLIDATED">
            Consolidated
          </option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left">
                Account
              </th>

              <th className="p-3 text-left">
                Description
              </th>

              <th className="p-3 text-right">
                Debit
              </th>

              <th className="p-3 text-right">
                Credit
              </th>
            </tr>
          </thead>

          <tbody>
            {trialBalance.rows.map((row) => (
              <tr key={row.accountNumber}>
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

            <tr className="border-t bg-slate-50 font-bold">
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
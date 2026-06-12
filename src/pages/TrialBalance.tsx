// src/pages/TrialBalance.tsx

import { useEffect, useState } from "react";
import {
  GLService,
  type CompanyGLCard,
  type TrialBalance as TrialBalanceData,
} from "../services/glService";

const PERIODS = ["q1", "q2", "q3", "q4", "year"];

export default function TrialBalance() {
  const [companies, setCompanies] = useState<CompanyGLCard[]>([]);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [period, setPeriod] = useState("q1");
  const [year, setYear] = useState(2026);

  const [trialBalance, setTrialBalance] = useState<TrialBalanceData | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  // Load the company list once (reuses the GL dashboard cards endpoint).
  useEffect(() => {
    GLService.getCompanyCards({ period: "q1", year: 2026 })
      .then((cards) => {
        setCompanies(cards);
        if (cards.length > 0) setCompanyId(cards[0].company_id);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load companies")
      );
  }, []);

  // Load the trial balance whenever the company/period/year changes.
  useEffect(() => {
    if (companyId == null) return;

    setError(null);
    GLService.getTrialBalance({ companyId, period, year })
      .then(setTrialBalance)
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Failed to load trial balance"
        )
      );
  }, [companyId, period, year]);

  const rows = trialBalance?.rows ?? [];
  const totalDebit = trialBalance?.totals.debit ?? 0;
  const totalCredit = trialBalance?.totals.credit ?? 0;

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">Trial Balance</h1>
        <p className="text-slate-500">
          Select a company to view its trial balance from saved GL imports.
        </p>
      </div>

      <div className="grid w-full max-w-3xl gap-4 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium">Company</label>
          <select
            value={companyId ?? ""}
            onChange={(e) => setCompanyId(Number(e.target.value))}
            className="w-full rounded-lg border p-2"
          >
            {companies.map((item) => (
              <option key={item.company_id} value={item.company_id}>
                {item.company_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Period</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full rounded-lg border p-2"
          >
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {p.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-full rounded-lg border p-2"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b bg-slate-50 p-4">
          <h2 className="text-xl font-semibold">
            {trialBalance?.company_name ?? "—"} Trial Balance
          </h2>
          <p className="text-sm text-slate-500">
            {trialBalance?.period_label ?? `${period.toUpperCase()} ${year}`}
          </p>
        </div>

        <table className="w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left">Account</th>
              <th className="p-3 text-left">Description</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-right">Debit</th>
              <th className="p-3 text-right">Credit</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  No saved GL data for this company and period.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.account_number} className="border-b">
                  <td className="p-3">{row.account_number}</td>
                  <td className="p-3">{row.account_name}</td>
                  <td className="p-3">{row.account_type ?? "-"}</td>
                  <td className="p-3 text-right">
                    {row.debit.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="p-3 text-right">
                    {row.credit.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))
            )}

            <tr className="bg-slate-50 font-bold">
              <td colSpan={3} className="p-3">
                Totals
              </td>
              <td className="p-3 text-right">
                {totalDebit.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="p-3 text-right">
                {totalCredit.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

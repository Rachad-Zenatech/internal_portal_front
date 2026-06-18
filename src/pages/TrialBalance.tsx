// src/pages/TrialBalance.tsx

import { useEffect, useState } from "react";
import {
  GLService,
  type CompanyGLCard,
  type TrialBalance as TrialBalanceData,
} from "../services/glService";
import ConsolidatedTrialBalance from "./ConsolidatedTrailBalance";

const PERIODS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december", "q1", "q2", "q3", "q4", "year"];

export default function TrialBalance() {
  const [companies, setCompanies] = useState<CompanyGLCard[]>([]);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [period, setPeriod] = useState("q1");
  const [year, setYear] = useState(2026);

  const [activeTab, setActiveTab] = useState('trial');
  const [error, setError] = useState<string | null>(null);

  const [trialBalance, setTrialBalance] = useState<TrialBalanceData | null>(null);

  // Load the company list once (reuses the GL dashboard cards endpoint).
  // Initialize state from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const periodParam = params.get('period');
    const yearParam = params.get('year');
    const companyParam = params.get('companyId');

    if (periodParam) setPeriod(periodParam as any);
    if (yearParam && !isNaN(Number(yearParam))) setYear(Number(yearParam));
    if (companyParam && !isNaN(Number(companyParam))) setCompanyId(Number(companyParam));
  }, []);

  // Sync URL when state changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (companyId !== null) params.set('companyId', String(companyId));
    params.set('period', period);
    params.set('year', String(year));
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [companyId, period, year]);

  // Load the company list once (reuses the GL dashboard cards endpoint).
  useEffect(() => {
    GLService.getCompanyCards({ period, year })
      .then((cards) => {
        setCompanies(cards);
        if (cards.length > 0 && companyId === null) setCompanyId(cards[0].company_id);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load companies")
      );
  }, [period, year]);

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
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('trial')}
          className={`relative px-6 py-3 text-sm font-semibold transition-colors duration-200 focus:outline-none
            ${activeTab === 'trial'
              ? 'text-blue-600 dark:text-foreground after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-blue-600'
              : 'text-gray-500 hover:text-gray-800 dark:text-foreground dark:hover:text-foreground'
            }`}
        >
          Trial Balance
        </button>
        <button
          onClick={() => setActiveTab('consolidated')}
          className={`relative px-6 py-3 text-sm font-semibold transition-colors duration-200 focus:outline-none
            ${activeTab === 'consolidated'
              ? 'text-blue-600 dark:text-foreground after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-blue-600'
              : 'text-gray-500 hover:text-gray-800 dark:text-foreground dark:hover:text-foreground'
            }`}
        >
          Consolidated
        </button>
      </div>
      {activeTab === 'trial' && (
        <div className="grid w-full max-w-4xl gap-4 md:grid-cols-3">
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
              <optgroup label="Months">
                {PERIODS.filter(p => !p.startsWith('q') && p !== 'year' && p !== 'custom').map(p => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Quarters">
                {PERIODS.filter(p => p.startsWith('q')).map(p => (
                  <option key={p} value={p}>
                    {p.toUpperCase()}
                  </option>
                ))}
              </optgroup>
              <option value="year">Year</option>
              <option value="custom">Custom</option>
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
      )}

      {
        error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )
      }



      {
        activeTab === 'trial' ? (
          <>
            <div className="border-b bg-slate-50 p-4">
              <h2 className="text-xl font-semibold">
                {trialBalance?.company_name ?? "—"} Trial Balance
              </h2>
              <p className="text-sm text-slate-500">
                {trialBalance?.period_label ?? `${period.toUpperCase()} ${year}`}
              </p>
            </div>

            <table className="w-full table-fixed">
              <thead className="sticky top-0 z-10 bg-slate-100">
                <tr>
                  <th className="p-3 text-left w-1/5">Account</th>
                  <th className="p-3 text-left w-1/5">Description</th>
                  <th className="p-3 text-left w-1/5">Type</th>
                  <th className="p-3 text-right w-1/5">Debit</th>
                  <th className="p-3 text-right w-1/5">Credit</th>
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
                  <td colSpan={3} className="p-3">Totals</td>
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
          </>
        ) : (
          <ConsolidatedTrialBalance />
        )
      }
    </div >
  );
}

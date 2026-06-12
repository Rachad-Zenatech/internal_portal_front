// src/pages/ConsolidatedTrialBalance.tsx

import { useEffect, useMemo, useState } from "react";
import {
  GLService,
  type ConsolidatedCompany,
  type ConsolidatedReconciliation,
  type ReconcilingItem,
} from "../services/glService";

const QUARTERS = [1, 2, 3, 4];

// The view selector encodes one of: all companies, a single entity, or a
// single company. Value format: "all" | "entity:<entity>" | "company:<id>".
type View = string;

function money(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ConsolidatedTrialBalance() {
  const [year, setYear] = useState(2026);
  const [quarter, setQuarter] = useState(1);
  const [view, setView] = useState<View>("all");

  const [data, setData] = useState<ConsolidatedReconciliation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    GLService.getConsolidated({ year, quarter })
      .then(setData)
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load consolidated reconciliation"
        )
      );
  }, [year, quarter]);

  const companies = data?.companies ?? [];

  const entities = useMemo(() => {
    const set = new Set<string>();
    companies.forEach((c) => {
      if (c.entity) set.add(c.entity);
    });
    return Array.from(set).sort();
  }, [companies]);

  // The companies in scope for the current view selection.
  const selected = useMemo(() => {
    if (view === "all") return companies;
    if (view.startsWith("entity:")) {
      const entity = view.slice("entity:".length);
      return companies.filter((c) => c.entity === entity);
    }
    if (view.startsWith("company:")) {
      const id = Number(view.slice("company:".length));
      return companies.filter((c) => c.company_id === id);
    }
    return companies;
  }, [companies, view]);

  // Aggregate balances + reconciling items across the selected companies.
  const summary = useMemo(() => {
    const bookBalance = selected.reduce((s, c) => s + c.book_balance, 0);
    const bankBalance = selected.reduce((s, c) => s + c.bank_balance, 0);
    const inBankNotInBooks = selected.flatMap((c) => c.in_bank_not_in_books);
    const inBooksNotInBank = selected.flatMap((c) => c.in_books_not_in_bank);
    const inBankTotal = inBankNotInBooks.reduce((s, i) => s + i.amount, 0);
    const inBooksTotal = inBooksNotInBank.reduce((s, i) => s + i.amount, 0);

    // Reconciliation proof: book balance adjusted for items that cleared the
    // bank but aren't yet booked should tie to the bank balance adjusted for
    // items booked but not yet cleared.
    const adjustedBook = bookBalance + inBankTotal;
    const adjustedBank = bankBalance - inBooksTotal;

    return {
      bookBalance,
      bankBalance,
      difference: bankBalance - bookBalance,
      inBankNotInBooks,
      inBooksNotInBank,
      inBankTotal,
      inBooksTotal,
      adjustedBook,
      adjustedBank,
      tiesOut: Math.abs(adjustedBank - adjustedBook) < 0.01,
    };
  }, [selected]);

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">Consolidated Trial Balance</h1>
        <p className="text-slate-500">
          GL (book) vs bank across all companies — view by entity or a single
          company, with reconciliation proof.
        </p>
      </div>

      {/* Controls */}
      <div className="grid w-full max-w-4xl gap-4 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium">View</label>
          <select
            value={view}
            onChange={(e) => setView(e.target.value)}
            className="w-full rounded-md border p-2"
          >
            <option value="all">All Companies (consolidated)</option>
            {entities.length > 0 && (
              <optgroup label="By Entity">
                {entities.map((ent) => (
                  <option key={ent} value={`entity:${ent}`}>
                    Entity: {ent}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="By Company">
              {companies.map((c) => (
                <option key={c.company_id} value={`company:${c.company_id}`}>
                  {c.company_name}
                  {c.entity ? ` (${c.entity})` : ""}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Quarter</label>
          <select
            value={quarter}
            onChange={(e) => setQuarter(Number(e.target.value))}
            className="w-full rounded-md border p-2"
          >
            {QUARTERS.map((q) => (
              <option key={q} value={q}>
                Q{q}
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
            className="w-full rounded-md border p-2"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Per-company balances */}
      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b bg-slate-50 p-4">
          <h2 className="text-xl font-semibold">
            Book vs Bank — {data?.period_label ?? `Q${quarter} ${year}`}
          </h2>
        </div>

        <table className="w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left">Company</th>
              <th className="p-3 text-left">Entity</th>
              <th className="p-3 text-right">Book Balance</th>
              <th className="p-3 text-right">Bank Balance</th>
              <th className="p-3 text-right">Difference</th>
            </tr>
          </thead>
          <tbody>
            {selected.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  No data for this selection.
                </td>
              </tr>
            ) : (
              selected.map((c: ConsolidatedCompany) => (
                <tr key={c.company_id} className="border-b">
                  <td className="p-3">{c.company_name}</td>
                  <td className="p-3">{c.entity ?? "-"}</td>
                  <td className="p-3 text-right">{money(c.book_balance)}</td>
                  <td className="p-3 text-right">{money(c.bank_balance)}</td>
                  <td className="p-3 text-right">{money(c.difference)}</td>
                </tr>
              ))
            )}
            <tr className="bg-slate-50 font-bold">
              <td colSpan={2} className="p-3">
                Totals
              </td>
              <td className="p-3 text-right">{money(summary.bookBalance)}</td>
              <td className="p-3 text-right">{money(summary.bankBalance)}</td>
              <td className="p-3 text-right">{money(summary.difference)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Reconciliation proof */}
      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b bg-slate-50 p-4">
          <h2 className="text-xl font-semibold">Reconciliation Proof</h2>
        </div>
        <table className="w-full">
          <tbody>
            <tr className="border-b">
              <td className="p-3">Ending Book Balance</td>
              <td className="p-3 text-right">{money(summary.bookBalance)}</td>
            </tr>
            <tr className="border-b">
              <td className="p-3">+ In bank, not yet in books</td>
              <td className="p-3 text-right">{money(summary.inBankTotal)}</td>
            </tr>
            <tr className="border-b font-semibold">
              <td className="p-3">Adjusted Book Balance</td>
              <td className="p-3 text-right">{money(summary.adjustedBook)}</td>
            </tr>
            <tr className="border-b">
              <td className="p-3">Ending Bank Balance</td>
              <td className="p-3 text-right">{money(summary.bankBalance)}</td>
            </tr>
            <tr className="border-b">
              <td className="p-3">− In books, not in bank</td>
              <td className="p-3 text-right">{money(summary.inBooksTotal)}</td>
            </tr>
            <tr className="border-b font-semibold">
              <td className="p-3">Adjusted Bank Balance</td>
              <td className="p-3 text-right">{money(summary.adjustedBank)}</td>
            </tr>
            <tr
              className={`font-bold ${
                summary.tiesOut ? "text-green-700" : "text-red-700"
              }`}
            >
              <td className="p-3">
                {summary.tiesOut ? "✓ Reconciled" : "✗ Out of balance"}
              </td>
              <td className="p-3 text-right">
                {money(summary.adjustedBank - summary.adjustedBook)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Reconciling item detail */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ReconcilingTable
          title="In Bank, Not Yet in Books"
          subtitle="Cleared the bank — not yet recorded in the GL."
          items={summary.inBankNotInBooks}
        />
        <ReconcilingTable
          title="In Books, Not in Bank"
          subtitle="Recorded in the GL — not yet cleared (outstanding)."
          items={summary.inBooksNotInBank}
        />
      </div>
    </div>
  );
}

function ReconcilingTable({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: ReconcilingItem[];
}) {
  const total = items.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="border-b bg-slate-50 p-4">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="p-2 text-left">Date</th>
            <th className="p-2 text-left">Description</th>
            <th className="p-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={3} className="p-4 text-center text-slate-500">
                Nothing outstanding.
              </td>
            </tr>
          ) : (
            items.map((i, idx) => (
              <tr key={idx} className="border-b">
                <td className="p-2">{i.date ?? "-"}</td>
                <td className="p-2">{i.description}</td>
                <td className="p-2 text-right">{money(i.amount)}</td>
              </tr>
            ))
          )}
          <tr className="bg-slate-50 font-semibold">
            <td colSpan={2} className="p-2">
              Total ({items.length})
            </td>
            <td className="p-2 text-right">{money(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

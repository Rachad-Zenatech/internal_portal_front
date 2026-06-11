// src/pages/CompanyGeneralLedger.tsx

import { useEffect, useMemo, useState } from "react";
import {
  GLService,
  type CompanyLedger,
  type GLAccountGroup,
  type GLImportVisual,
} from "../services/glService";

export default function CompanyGeneralLedger() {
  const companyId = Number(window.location.pathname.split("/").pop());

  const params = new URLSearchParams(window.location.search);
  const period = params.get("period") || "q1";
  const year = Number(params.get("year") || 2026);

  const [data, setData] = useState<CompanyLedger | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"all" | "bank">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadCompanyLedger();
  }, [companyId, period, year]);

  async function loadCompanyLedger() {
    setError(null);
    try {
      const ledger = await GLService.getCompanyLedger({
        companyId,
        period,
        year,
      });
      setData(ledger);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load company ledger"
      );
    }
  }

  const imports = data?.imports ?? [];

  const filteredImports = useMemo(() => {
    if (!search.trim()) return imports;

    const term = search.toLowerCase();

    return imports.map((item) => ({
      ...item,
      accounts: item.accounts
        .map((account) => ({
          ...account,
          transactions: account.transactions.filter((txn) => {
            return (
              txn.name?.toLowerCase().includes(term) ||
              txn.memo?.toLowerCase().includes(term) ||
              txn.transaction_type?.toLowerCase().includes(term) ||
              txn.transaction_number?.toLowerCase().includes(term) ||
              account.account_name.toLowerCase().includes(term) ||
              account.account_number.toLowerCase().includes(term) ||
              txn.split_account_name?.toLowerCase().includes(term) ||
              txn.split_account_number?.toLowerCase().includes(term)
            );
          }),
        }))
        .filter((account) => account.transactions.length > 0),
    }));
  }, [imports, search]);

  if (error) {
    return (
      <main className="space-y-4 p-6">
        <button
          className="text-sm text-gray-500"
          onClick={() => window.location.assign("/general-ledger")}
        >
          ← Back to General Ledger Dashboard
        </button>
        <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </section>
      </main>
    );
  }

  if (!data) {
    return <main className="p-6">Loading...</main>;
  }

  return (
    <main className="space-y-6 p-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <button
            className="mb-2 text-sm text-gray-500"
            onClick={() => window.location.assign("/general-ledger")}
          >
            ← Back to General Ledger Dashboard
          </button>

          <h1 className="text-2xl font-semibold">{data.company_name}</h1>
          <p className="text-sm text-gray-500">
            {data.entity || "No Entity"} · {data.period_label}
          </p>
        </div>

        <button
          className="rounded-md bg-black px-4 py-2 text-white"
          onClick={() =>
            window.location.assign(
              `/general-ledger/upload?company_id=${data.company_id}`
            )
          }
        >
          Upload GL for Company
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric label="Imports" value={imports.length} />
        <Metric
          label="Entries"
          value={imports.reduce((sum, item) => sum + item.gl_entries, 0)}
        />
        <Metric
          label="Lines"
          value={imports.reduce((sum, item) => sum + item.gl_entry_lines, 0)}
        />
        <Metric
          label="Bank Lines"
          value={imports.reduce((sum, item) => sum + item.bank_lines, 0)}
        />
      </section>

      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium">Search Transactions</span>
            <input
              className="w-full rounded-md border px-3 py-2"
              placeholder="Search name, memo, account, num..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">View</span>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as "all" | "bank")}
            >
              <option value="all">All Accounts</option>
              <option value="bank">Bank Accounts Only</option>
            </select>
          </label>
        </div>
      </section>

      {filteredImports.length === 0 ? (
        <EmptyState text="No transactions found for this company and period." />
      ) : (
        <section className="space-y-6">
          {filteredImports.map((item) => (
            <GLImportVisualCard key={item.id} item={item} viewMode={viewMode} />
          ))}
        </section>
      )}
    </main>
  );
}

function GLImportVisualCard({
  item,
  viewMode,
}: {
  item: GLImportVisual;
  viewMode: "all" | "bank";
}) {
  const accounts =
    viewMode === "bank"
      ? item.accounts.filter((account) => account.is_bank_account)
      : item.accounts;

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{item.filename}</h2>
          <p className="text-sm text-gray-500">
            {item.format_name} · Imported{" "}
            {new Date(item.imported_at).toLocaleString()}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-right text-sm">
          <Info label="Entries" value={String(item.gl_entries)} />
          <Info label="Lines" value={String(item.gl_entry_lines)} />
          <Info label="Bank Lines" value={String(item.bank_lines)} />
        </div>
      </div>

      {accounts.length === 0 ? (
        <EmptyState text="No accounts match this view." />
      ) : (
        <div className="space-y-4 p-4">
          {accounts.map((account) => (
            <AccountTransactionGroup
              key={`${item.id}-${account.account_number}`}
              account={account}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AccountTransactionGroup({ account }: { account: GLAccountGroup }) {
  return (
    <div className="rounded-md border">
      <div className="flex flex-col gap-2 border-b bg-gray-50 p-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-medium">
            {account.account_number} · {account.account_name}
          </p>
          <p className="text-xs text-gray-500">
            {account.account_type || "Unknown account type"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {account.is_bank_account && (
            <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
              Bank Account
            </span>
          )}

          <span className="text-sm font-semibold">
            {formatMoney(account.total_amount)}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <Th>Date</Th>
              <Th>Type</Th>
              <Th>Num</Th>
              <Th>Name</Th>
              <Th>Memo</Th>
              <Th>Split Account</Th>
              <Th align="right">Amount</Th>
              <Th align="right">Balance</Th>
              <Th>Status</Th>
            </tr>
          </thead>

          <tbody>
            {account.transactions.map((txn) => (
              <tr key={txn.entry_id} className="border-b last:border-b-0">
                <Td>{txn.entry_date || "-"}</Td>
                <Td>{txn.transaction_type || "-"}</Td>
                <Td>{txn.transaction_number || "-"}</Td>
                <Td>{txn.name || "-"}</Td>
                <Td>{txn.memo || "-"}</Td>
                <Td>
                  {txn.split_account_number
                    ? `${txn.split_account_number} · ${
                        txn.split_account_name || ""
                      }`
                    : "-"}
                </Td>
                <Td align="right">{formatMoney(txn.amount)}</Td>
                <Td align="right">
                  {txn.balance_after == null
                    ? "-"
                    : formatMoney(txn.balance_after)}
                </Td>
                <Td>
                  {txn.is_bank_line ? (
                    <Badge tone="green">Bank Line</Badge>
                  ) : (
                    <Badge tone="gray">GL Line</Badge>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "green" | "gray";
}) {
  const className =
    tone === "green"
      ? "bg-green-100 text-green-700"
      : "bg-gray-100 text-gray-700";

  return (
    <span className={`rounded-full px-2 py-1 text-xs ${className}`}>
      {children}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border bg-white p-8 text-center text-sm text-gray-500">
      {text}
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`whitespace-nowrap px-3 py-2 text-${align} font-medium text-gray-600`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td className={`whitespace-nowrap px-3 py-2 text-${align}`}>
      {children}
    </td>
  );
}

function formatMoney(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
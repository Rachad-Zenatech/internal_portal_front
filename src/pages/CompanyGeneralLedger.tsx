// src/pages/CompanyGeneralLedger.tsx

import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useCompanyLedger } from "@/hooks/useGL";
import type { GLAccountGroup, GLImportVisual } from "@/types/gl";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatMoney(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatOptionalMoney(value: number | null | undefined) {
  return value == null ? "-" : formatMoney(value);
}

function getAccountClosingBalance(account: GLAccountGroup) {
  const lastWithBalance = [...account.transactions]
    .reverse()
    .find((txn) => txn.balance_after != null);

  if (lastWithBalance?.balance_after != null) {
    return lastWithBalance.balance_after;
  }

  if (account.beginning_balance != null) {
    return account.beginning_balance + account.total_amount;
  }

  return account.total_amount;
}

export default function CompanyGeneralLedger() {
  const { companyId: idParam } = useParams<{ companyId: string }>();
  const companyId = Number(idParam);

  const initialParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialPeriod = initialParams.get("period") || "q1";
  const initialYear = Number(initialParams.get("year") || 2026);

  const [period, setPeriod] = useState<string>(initialPeriod);
  const [year, setYear] = useState<number>(initialYear);
  const [viewMode, setViewMode] = useState<"all" | "bank">("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useCompanyLedger(companyId, period, year);

  useEffect(() => {
    const newParams = new URLSearchParams(window.location.search);
    newParams.set("period", period);
    newParams.set("year", String(year));
    window.history.replaceState(null, "", `${window.location.pathname}?${newParams.toString()}`);
  }, [period, year]);

  const imports = useMemo(() => data?.imports ?? [], [data?.imports]);

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
      <main className="space-y-4 p-6 max-w-[1600px] mx-auto">
        <button
          className="text-sm text-muted-foreground hover:underline"
          onClick={() => window.location.assign("/general-ledger")}
        >
          ← Back to General Ledger Dashboard
        </button>
        <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error.message || "Failed to load company ledger"}
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6 max-w-[1600px] mx-auto">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <button
            className="mb-2 text-sm text-muted-foreground hover:underline"
            onClick={() => window.location.assign("/general-ledger")}
          >
            ← Back to General Ledger Dashboard
          </button>

          <h1 className="text-3xl font-bold tracking-tight">
            {data ? `${data.company_name} ${data.entity ? `(${data.entity})` : ""}` : "Loading..."}
          </h1>
          <p className="text-sm text-muted-foreground">
            {data ? data.period_label : "..."}
          </p>
        </div>

        <Button
          disabled={!data}
          onClick={() =>
            window.location.assign(
              `/general-ledger/upload?company_id=${data?.company_id}`
            )
          }
        >
          Upload GL for Company
        </Button>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Imports" value={imports.length} />
        <MetricCard
          label="Entries"
          value={imports.reduce((sum, item) => sum + item.gl_entries, 0)}
        />
        <MetricCard
          label="Lines"
          value={imports.reduce((sum, item) => sum + item.gl_entry_lines, 0)}
        />
        <MetricCard
          label="Bank Lines"
          value={imports.reduce((sum, item) => sum + item.bank_lines, 0)}
        />
      </section>

      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-5">
          <div className="space-y-2 md:col-span-2">
            <Label>Search Transactions</Label>
            <Input
              placeholder="Search name, memo, account, num..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Period</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Months</SelectLabel>
                  <SelectItem value="january">January</SelectItem>
                  <SelectItem value="february">February</SelectItem>
                  <SelectItem value="march">March</SelectItem>
                  <SelectItem value="april">April</SelectItem>
                  <SelectItem value="may">May</SelectItem>
                  <SelectItem value="june">June</SelectItem>
                  <SelectItem value="july">July</SelectItem>
                  <SelectItem value="august">August</SelectItem>
                  <SelectItem value="september">September</SelectItem>
                  <SelectItem value="october">October</SelectItem>
                  <SelectItem value="november">November</SelectItem>
                  <SelectItem value="december">December</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Quarters</SelectLabel>
                  <SelectItem value="q1">Q1</SelectItem>
                  <SelectItem value="q2">Q2</SelectItem>
                  <SelectItem value="q3">Q3</SelectItem>
                  <SelectItem value="q4">Q4</SelectItem>
                </SelectGroup>
                <SelectItem value="year">Year</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Year</Label>
            <Select value={String(year)} onValueChange={(val) => setYear(Number(val))}>
              <SelectTrigger>
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>View</Label>
            <Select value={viewMode} onValueChange={(val) => setViewMode(val as "all" | "bank")}>
              <SelectTrigger>
                <SelectValue placeholder="Select View" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                <SelectItem value="bank">Bank Accounts Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          Loading company ledger...
        </div>
      ) : filteredImports.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          No transactions found for this company and period.
        </div>
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
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b p-4 bg-muted/20 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">{item.filename}</h2>
            <p className="text-sm text-muted-foreground">
              {item.format_name} · Imported{" "}
              {new Date(item.imported_at).toLocaleString()}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-right text-sm">
            <InfoStat label="Entries" value={String(item.gl_entries)} />
            <InfoStat label="Lines" value={String(item.gl_entry_lines)} />
            <InfoStat label="Bank Lines" value={String(item.bank_lines)} />
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No accounts match this view.
          </div>
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
      </CardContent>
    </Card>
  );
}

function AccountTransactionGroup({ account }: { account: GLAccountGroup }) {
  const closingBalance = getAccountClosingBalance(account);

  return (
    <div className="rounded-md border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col gap-2 border-b bg-muted/40 p-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-medium">
            {account.account_number} · {account.account_name}
          </p>
          <p className="text-xs text-muted-foreground">
            {account.account_type || "Unknown account type"}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {account.is_bank_account && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
              Bank Account
            </Badge>
          )}

          <AccountBalanceStat
            label="Beginning"
            value={account.beginning_balance}
          />
          <AccountBalanceStat label="Activity" value={account.total_amount} />
          <AccountBalanceStat label="Closing" value={closingBalance} />
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-muted/50 z-10 shadow-sm">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Num</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Memo</TableHead>
              <TableHead>Split Account</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="bg-blue-50/40 font-medium">
              <TableCell colSpan={7} className="text-right text-muted-foreground">
                Beginning Balance
              </TableCell>
              <TableCell className="text-right">
                {formatOptionalMoney(account.beginning_balance)}
              </TableCell>
              <TableCell />
            </TableRow>

            {account.transactions.map((txn) => (
              <TableRow key={txn.entry_id}>
                <TableCell className="whitespace-nowrap">{txn.entry_date || "-"}</TableCell>
                <TableCell className="whitespace-nowrap">{txn.transaction_type || "-"}</TableCell>
                <TableCell className="whitespace-nowrap">{txn.transaction_number || "-"}</TableCell>
                <TableCell className="whitespace-nowrap">{txn.name || "-"}</TableCell>
                <TableCell className="max-w-[200px] truncate" title={txn.memo || ""}>
                  {txn.memo || "-"}
                </TableCell>
                <TableCell className="max-w-[200px] truncate" title={txn.split_account_name || ""}>
                  {txn.split_account_number
                    ? `${txn.split_account_number} · ${txn.split_account_name || ""}`
                    : "-"}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">{formatMoney(txn.amount)}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {txn.balance_after == null ? "-" : formatMoney(txn.balance_after)}
                </TableCell>
                <TableCell>
                  {txn.is_bank_line ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">Bank Line</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100">GL Line</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
            
            <TableRow className="border-t-2 bg-muted/40 font-semibold">
              <TableCell colSpan={7} className="text-right text-muted-foreground">
                Closing Balance
              </TableCell>
              <TableCell className="text-right">
                {formatMoney(closingBalance)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AccountBalanceStat({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <span className="text-right text-sm">
      <span className="block text-xs uppercase text-muted-foreground">{label}</span>
      <span className="font-semibold">
        {formatOptionalMoney(value)}
      </span>
    </span>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

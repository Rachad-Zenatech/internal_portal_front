// src/pages/TrialBalance.tsx

import { useEffect, useState, useMemo } from "react";
import { useCompanyCards, useTrialBalance } from "@/hooks/useGL";
import ConsolidatedTrialBalance from "./ConsolidatedTrailBalance";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

const PERIODS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december", "q1", "q2", "q3", "q4", "year", "custom"] as const;
type PeriodType = (typeof PERIODS)[number];

function formatMoney(value: number) {
  if (value === 0) return "-";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function TrialBalance() {
  const [period, setPeriod] = useState<PeriodType>("year");
  const [year, setYear] = useState<number>(2026);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"trial" | "consolidated">("trial");

  const { data: cards = [], isLoading: loadingCards, error: cardsError } = useCompanyCards(period, year);

  const companies = useMemo(() => {
    const seen = new Map<number, { company_id: number; company_name: string }>();
    for (const card of cards) {
      if (!seen.has(card.company_id)) {
        seen.set(card.company_id, {
          company_id: card.company_id,
          company_name: card.company_name,
        });
      }
    }
    return Array.from(seen.values());
  }, [cards]);

  useEffect(() => {
    if (companies.length > 0 && companyId === null) {
      setCompanyId(companies[0].company_id);
    }
  }, [companies, companyId]);

  const { data: trialBalance, isLoading: loadingTB, error: tbError } = useTrialBalance(companyId, period, year);

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trial Balance</h1>
          <p className="text-sm text-muted-foreground">
            View the trial balance and consolidated statements for your companies.
          </p>
        </div>
      </header>
      <div className="flex mb-6 gap-2">
        <button
          onClick={() => setActiveTab('trial')}
          className={`relative px-6 py-3 text-sm font-semibold transition-colors duration-200 focus:outline-none
            ${activeTab === 'trial'
              ? 'text-primary after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary'
              : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Trial Balance
        </button>
        <button
          onClick={() => setActiveTab('consolidated')}
          className={`relative px-6 py-3 text-sm font-semibold transition-colors duration-200 focus:outline-none
            ${activeTab === 'consolidated'
              ? 'text-primary after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary'
              : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Consolidated
        </button>
      </div>

      {activeTab === 'trial' && (
        <div className="grid w-full max-w-4xl gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Company</Label>
            <Select
              value={companyId ? String(companyId) : undefined}
              onValueChange={(val) => setCompanyId(Number(val))}
              disabled={loadingCards}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingCards ? "Loading..." : "Select Company"} />
              </SelectTrigger>
              <SelectContent>
                {companies.map((item) => (
                  <SelectItem key={item.company_id} value={String(item.company_id)}>
                    {item.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Period</Label>
            <Select value={period} onValueChange={(val) => setPeriod(val as PeriodType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Months</SelectLabel>
                  {PERIODS.filter(p => !p.startsWith('q') && p !== 'year' && p !== 'custom').map(p => (
                    <SelectItem key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Quarters</SelectLabel>
                  <SelectItem value="q1">Q1</SelectItem>
                  <SelectItem value="q2">Q2</SelectItem>
                  <SelectItem value="q3">Q3</SelectItem>
                  <SelectItem value="q4">Q4</SelectItem>
                </SelectGroup>
                <SelectItem value="year">Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Year</Label>
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>
        </div>
      )}

      {cardsError || tbError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {cardsError?.message || tbError?.message}
        </div>
      ) : null}

      {activeTab === 'trial' ? (
        loadingTB || !trialBalance ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
            {companyId ? "Loading trial balance..." : "Select a company to view its trial balance."}
          </div>
        ) : trialBalance.rows.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
            No saved GL data for this company and period.
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="border-b bg-muted/30 p-4">
              <h2 className="text-xl font-semibold">
                {trialBalance.company_name ?? "—"} Trial Balance
              </h2>
              <p className="text-sm text-muted-foreground">
                {trialBalance.period_label ?? `${period.toUpperCase()} ${year}`}
              </p>
            </div>
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow>
                  <TableHead className="w-1/5">Account</TableHead>
                  <TableHead className="w-1/5">Description</TableHead>
                  <TableHead className="w-1/5">Type</TableHead>
                  <TableHead className="w-1/5 text-right">Debit</TableHead>
                  <TableHead className="w-1/5 text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trialBalance.rows.map((row) => (
                  <TableRow key={row.account_number}>
                    <TableCell className="font-medium">{row.account_number}</TableCell>
                    <TableCell>{row.account_name}</TableCell>
                    <TableCell>{row.account_type ?? "-"}</TableCell>
                    <TableCell className="text-right">{formatMoney(row.debit)}</TableCell>
                    <TableCell className="text-right">{formatMoney(row.credit)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/20 font-bold">
                  <TableCell colSpan={3}>Totals</TableCell>
                  <TableCell className="text-right">{formatMoney(trialBalance.totals.debit)}</TableCell>
                  <TableCell className="text-right">{formatMoney(trialBalance.totals.credit)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        )
      ) : (
        <ConsolidatedTrialBalance />
      )}
    </div>
  );
}

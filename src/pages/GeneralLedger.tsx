// src/pages/GeneralLedger.tsx

import { useEffect, useMemo, useState } from "react";
import type { CompanyGLCard, GLExtractionFormat } from "@/types/gl";
import { useCompanyCards, useGLFormats, useAssignFormat, useGLUploadQueue } from "@/hooks/useGL";
import { GLUploadQueuePanel } from "@/components/GLUploadQueuePanel";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type PeriodType = "january" | "february" | "march" | "april" | "may" | "june" | "july" | "august" | "september" | "october" | "november" | "december" | "q1" | "q2" | "q3" | "q4" | "year" | "custom";

export default function GeneralLedger() {
  const [period, setPeriod] = useState<PeriodType>("q1");
  const [year, setYear] = useState<number>(2026);
  const [companyId, setCompanyId] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState("all");

  const { data: cards = [], isLoading: loadingCards, error: cardsError } = useCompanyCards(period, year);
  const { data: formats = [] } = useGLFormats();
  const {
    data: uploadQueueData,
    isLoading: isUploadQueueLoading,
    refetch: refetchUploadQueue,
  } = useGLUploadQueue(10);
  const assignFormatMutation = useAssignFormat();
  const uploadQueue = uploadQueueData?.jobs ?? [];

  const companies = useMemo(() => {
    const seen = new Map<number, { id: number; name: string; entity: string | null }>();
    for (const card of cards) {
      if (!seen.has(card.company_id)) {
        seen.set(card.company_id, {
          id: card.company_id,
          name: card.company_name,
          entity: card.entity,
        });
      }
    }
    return Array.from(seen.values());
  }, [cards]);

  const entities = useMemo(() => {
    const values = new Set<string>();
    for (const company of companies) {
      if (company.entity && company.entity.toLowerCase() !== "all") {
        values.add(company.entity);
      } else if (!company.entity) {
        values.add("No Entity");
      }
    }
    return ["all", ...Array.from(values)];
  }, [companies]);

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const matchCompany = companyId === "all" || card.company_id === Number(companyId);
      const matchEntity =
        entityFilter === "all" ||
        (entityFilter === "No Entity" ? !card.entity : card.entity === entityFilter);

      return matchCompany && matchEntity;
    });
  }, [cards, companyId, entityFilter]);

  return (
    <main className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">General Ledger Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            View GL imports and transactions by company, book, and period.
          </p>
        </div>
        <Button onClick={() => window.location.assign("/general-ledger/upload")}>
          Upload New GL
        </Button>
      </header>

      {assignFormatMutation.isError && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {assignFormatMutation.error?.message || "Failed to assign GL format"}
        </section>
      )}

      <GLUploadQueuePanel
        jobs={uploadQueue}
        isLoading={isUploadQueueLoading}
        onRefresh={() => void refetchUploadQueue()}
        onOpenPreview={(token) => {
          window.location.assign(`/general-ledger/upload?dry_run_preview_token=${encodeURIComponent(token)}`);
        }}
      />

      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Company</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={String(company.id)} value={String(company.id)}>
                    {company.name} ({company.entity || "No Entity"})
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
            <Label>Book / Entity</Label>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Books" />
              </SelectTrigger>
              <SelectContent>
                {entities.map((entity) => (
                  <SelectItem key={entity} value={entity}>
                    {entity === "all" ? "All Books" : entity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Companies" value={filteredCards.length} />
        <MetricCard
          label="Imports"
          value={filteredCards.reduce((sum, c) => sum + c.import_count, 0)}
        />
        <MetricCard
          label="GL Lines"
          value={filteredCards.reduce((sum, c) => sum + c.gl_entry_lines, 0)}
        />
        <MetricCard
          label="Bank Lines"
          value={filteredCards.reduce((sum, c) => sum + c.bank_lines, 0)}
        />
      </section>

      {cardsError ? (
        <EmptyState text={cardsError.message || "Failed to load GL cards"} />
      ) : loadingCards ? (
        <EmptyState text="Loading company GL cards..." />
      ) : filteredCards.length === 0 ? (
        <EmptyState text="No GL data found for this company and period." />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCards.map((card) => (
            <CompanyGLCardView
              key={card.company_id}
              card={card}
              period={period}
              year={year}
              formats={formats}
              isAssigning={assignFormatMutation.isPending && assignFormatMutation.variables?.companyId === card.company_id}
              onAssignFormat={(companyId, formatId) => assignFormatMutation.mutate({ companyId, formatId })}
            />
          ))}
        </section>
      )}
    </main>
  );
}

function CompanyGLCardView({
  card,
  period,
  year,
  formats,
  isAssigning,
  onAssignFormat,
}: {
  card: CompanyGLCard;
  period: PeriodType;
  year: number;
  formats: GLExtractionFormat[];
  isAssigning: boolean;
  onAssignFormat: (companyId: number, formatId: number) => void;
}) {
  const currentFormatId = card.default_format_id == null ? "" : String(card.default_format_id);
  const [selectedFormatId, setSelectedFormatId] = useState<string>(currentFormatId);
  const hasFormat = card.default_format_id != null;
  const canSaveFormat =
    selectedFormatId !== "" && selectedFormatId !== currentFormatId && !isAssigning;

  useEffect(() => {
    setSelectedFormatId(currentFormatId);
  }, [currentFormatId]);

  return (
    <Card className="flex flex-col">
      <CardContent className="flex-1 p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">{card.company_name}</h2>
          <p className="text-sm text-muted-foreground">
            {card.entity || "No Entity"} · {card.default_format_name || "No default format"}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <InfoStat label="Imports" value={String(card.import_count)} />
          <InfoStat label="GL Lines" value={String(card.gl_entry_lines)} />
          <InfoStat label="Bank Lines" value={String(card.bank_lines)} />
        </div>

        <div
          className={
            hasFormat
              ? "rounded-md border bg-muted/30 p-3"
              : "rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-400/40 dark:bg-amber-950/40"
          }
        >
          <p className={hasFormat ? "text-sm font-medium" : "text-sm font-medium text-amber-800 dark:text-amber-200"}>
            {hasFormat ? "Default GL format" : "No GL format assigned"}
          </p>
          <div className="mt-3 flex gap-2">
            <Select
              value={selectedFormatId || undefined}
              onValueChange={setSelectedFormatId}
              disabled={isAssigning || formats.length === 0}
            >
              <SelectTrigger className="flex-1 bg-background">
                <SelectValue placeholder="Select a format" />
              </SelectTrigger>
              <SelectContent>
                {formats.map((f) => (
                  <SelectItem key={String(f.id)} value={String(f.id)}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              size="sm"
              variant="outline"
              disabled={!canSaveFormat}
              onClick={() => onAssignFormat(card.company_id, Number(selectedFormatId))}
            >
              {isAssigning ? "Saving..." : hasFormat ? "Update" : "Assign"}
            </Button>
          </div>
        </div>
      </CardContent>

      <div className="border-t p-4">
        <Button
          variant="outline"
          className="w-full"
          disabled={!hasFormat}
          onClick={() =>
            window.location.assign(
              `/general-ledger/company/${card.company_id}?period=${period}&year=${year}`
            )
          }
        >
          {hasFormat ? "View Transactions" : "Assign format to view"}
        </Button>
      </div>
    </Card>
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

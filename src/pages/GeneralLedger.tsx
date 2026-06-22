// src/pages/GeneralLedger.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { GLService } from "../services/glService";
import type { CompanyGLCard, GLExtractionFormat } from "@/types/gl";

type PeriodType = "january" | "february" | "march" | "april" | "may" | "june" | "july" | "august" | "september" | "october" | "november" | "december" | "q1" | "q2" | "q3" | "q4" | "year" | "custom";

export default function GeneralLedger() {
  const [period, setPeriod] = useState<PeriodType>("q1");
  const [year, setYear] = useState<number>(2026);
  const [companyId, setCompanyId] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState("all");

  const [cards, setCards] = useState<CompanyGLCard[]>([]);
  const [formats, setFormats] = useState<GLExtractionFormat[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigningCompanyId, setAssigningCompanyId] = useState<number | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const loadCompanyCards = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await GLService.getCompanyCards({ period, year });
      setCards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load GL cards");
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [period, year]);

  useEffect(() => {
    void loadCompanyCards();
  }, [loadCompanyCards]);

  useEffect(() => {
    let isActive = true;

    async function loadFormats() {
      try {
        const data = await GLService.getFormats();
        if (isActive) setFormats(data);
      } catch (err) {
        if (isActive) {
          setError(
            err instanceof Error ? err.message : "Failed to load GL formats"
          );
        }
      }
    }

    void loadFormats();

    return () => {
      isActive = false;
    };
  }, []);

  async function handleAssignFormat(companyId: number, formatId: number) {
    setAssigningCompanyId(companyId);
    setError(null);

    try {
      await GLService.assignCompanyBook({ companyId, formatId });
      await loadCompanyCards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign GL format");
    } finally {
      setAssigningCompanyId(null);
    }
  }

  // The company + book/entity filters are derived from the cards themselves, so
  // the dropdowns always match the GL-enabled companies the backend returns.
  const companies = useMemo(() => {
    const seen = new Map<
      number,
      { id: number; name: string; entity: string | null }
    >();
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
    const values = new Set(companies.map((company) => company.entity || "No Entity"));
    return ["all", ...Array.from(values)];
  }, [companies]);

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const matchesCompany =
        companyId === "all" || card.company_id === Number(companyId);

      const matchesEntity =
        entityFilter === "all" ||
        (card.entity || "No Entity") === entityFilter;

      return matchesCompany && matchesEntity;
    });
  }, [cards, companyId, entityFilter]);

  return (
    <main className="space-y-6 p-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">General Ledger Dashboard</h1>
          <p className="text-sm text-gray-500">
            View GL imports and transactions by company, book, and period.
          </p>
        </div>

        <button
          className="rounded-md bg-black px-4 py-2 text-white"
          onClick={() => window.location.assign("/general-ledger/upload")}
        >
          Upload New GL
        </button>
      </header>

      {error && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </section>
      )}

      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <label className="space-y-1">
            <span className="text-sm font-medium">Company</span>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              <option value="all">All Companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name} ({company.entity || "No Entity"})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">Period</span>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodType)}
            >
              <optgroup label="Months">
                <option value="january">January</option>
                <option value="february">February</option>
                <option value="march">March</option>
                <option value="april">April</option>
                <option value="may">May</option>
                <option value="june">June</option>
                <option value="july">July</option>
                <option value="august">August</option>
                <option value="september">September</option>
                <option value="october">October</option>
                <option value="november">November</option>
                <option value="december">December</option>
              </optgroup>
              <optgroup label="Quarters">
                <option value="q1">Q1</option>
                <option value="q2">Q2</option>
                <option value="q3">Q3</option>
                <option value="q4">Q4</option>
              </optgroup>
              <option value="year">Year</option>
              <option value="custom">Custom</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">Year</span>
            <input
              className="w-full rounded-md border px-3 py-2"
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">Book / Entity</span>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
            >
              {entities.map((entity) => (
                <option key={entity} value={entity}>
                  {entity === "all" ? "All Books" : entity}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric label="Companies" value={filteredCards.length} />
        <Metric
          label="Imports"
          value={filteredCards.reduce((sum, card) => sum + card.import_count, 0)}
        />
        <Metric
          label="GL Lines"
          value={filteredCards.reduce((sum, card) => sum + card.gl_entry_lines, 0)}
        />
        <Metric
          label="Bank Lines"
          value={filteredCards.reduce((sum, card) => sum + card.bank_lines, 0)}
        />
      </section>

      {loading ? (
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
              isAssigning={assigningCompanyId === card.company_id}
              onAssignFormat={handleAssignFormat}
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
  const [selectedFormatId, setSelectedFormatId] = useState("");
  const hasFormat = card.default_format_id != null;

  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{card.company_name}</h2>
          <p className="text-sm text-gray-500">
            {card.entity || "No Entity"} ·{" "}
            {card.default_format_name || "No default format"}
          </p>
        </div>

        {card.import_count > 0 ? (
          <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
            Loaded
          </span>
        ) : (
          <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-700">
            Missing
          </span>
        )}
      </div>

      {!hasFormat && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-800">
            No GL format assigned
          </p>
          <div className="mt-3 flex gap-2">
            <select
              className="min-w-0 flex-1 rounded-md border bg-white px-3 py-2 text-sm"
              value={selectedFormatId}
              disabled={isAssigning || formats.length === 0}
              onChange={(event) => setSelectedFormatId(event.target.value)}
            >
              <option value="">
                {formats.length === 0 ? "No formats available" : "Select format"}
              </option>
              {formats.map((format) => (
                <option key={format.id} value={format.id}>
                  {format.name}
                </option>
              ))}
            </select>

            <button
              className="rounded-md bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
              disabled={!selectedFormatId || isAssigning}
              onClick={() =>
                onAssignFormat(card.company_id, Number(selectedFormatId))
              }
            >
              {isAssigning ? "Assigning..." : "Assign"}
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 rounded-md bg-gray-50 p-3 dark:bg-muted">
        <p className="text-sm font-medium">{card.period_label}</p>
        <p className="text-xs text-gray-500 dark:text-foreground">
          Last Import: {card.last_import_filename || "None"}
        </p>
        <p className="text-xs text-gray-500 dark:text-foreground">
          Imported At:{" "}
          {card.last_imported_at
            ? new Date(card.last_imported_at).toLocaleString()
            : "—"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <MiniMetric label="Imports" value={card.import_count} />
        <MiniMetric label="Entries" value={card.gl_entries} />
        <MiniMetric label="Lines" value={card.gl_entry_lines} />
        <MiniMetric label="Bank Lines" value={card.bank_lines} />
      </div>

      <div className="mt-4 border-t pt-4">
        <p className="text-xs uppercase text-gray-500">Total Amount</p>
        <p className="text-xl font-semibold">{formatMoney(card.total_amount)}</p>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          className="flex-1 rounded-md bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
          disabled={!hasFormat}
          onClick={() =>
            window.location.assign(
              `/general-ledger/company/${card.company_id}?period=${period}&year=${year}`
            )
          }
        >
          View Transactions
        </button>

        <button
          className="flex-1 rounded-md border px-3 py-2 text-sm disabled:opacity-50"
          disabled={!hasFormat}
          onClick={() =>
            window.location.assign(
              `/general-ledger/upload?company_id=${card.company_id}`
            )
          }
        >
          Upload GL
        </button>
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border bg-white p-10 text-center text-sm text-gray-500">
      {text}
    </div>
  );
}

function formatMoney(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// src/pages/GeneralLedger.tsx

import { useEffect, useMemo, useState } from "react";

type PeriodType = "january" | "q1" | "year" | "custom";

type Company = {
  id: number;
  name: string;
  entity: string | null;
  default_gl_format_id: number | null;
};

type CompanyGLCard = {
  company_id: number;
  company_name: string;
  entity: string | null;
  default_format_id: number | null;
  default_format_name: string | null;
  period_label: string;
  import_count: number;
  last_import_filename: string | null;
  last_imported_at: string | null;
  gl_entries: number;
  gl_entry_lines: number;
  bank_lines: number;
  total_amount: number;
};

const TEMP_COMPANIES: Company[] = [
  { id: 14, name: "ZenaTech, Inc", entity: "ZT", default_gl_format_id: null },
  { id: 8, name: "Smith", entity: "ZT", default_gl_format_id: 2 },
  { id: 25, name: "Morgan Land Services", entity: "ZT", default_gl_format_id: 1 },
  { id: 20, name: "Miller", entity: "ZT", default_gl_format_id: 2 },
  { id: 3, name: "KJM Land Surveying LLC", entity: "ZD", default_gl_format_id: 1 },
  { id: 7, name: "KJM Land Surveying LLC", entity: "ZT", default_gl_format_id: 1 },
];

export default function GeneralLedger() {
  const [period, setPeriod] = useState<PeriodType>("q1");
  const [year, setYear] = useState<number>(2026);
  const [companyId, setCompanyId] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState("all");

  const [companies, setCompanies] = useState<Company[]>([]);
  const [cards, setCards] = useState<CompanyGLCard[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    loadCompanyCards();
  }, [period, year]);

  async function loadCompanies() {
    // Later replace with:
    // const res = await fetch("/api/companies");
    // setCompanies(await res.json());

    setCompanies(TEMP_COMPANIES);
  }

  async function loadCompanyCards() {
    setLoading(true);

    try {
      const res = await fetch(
        `/api/gl/company-cards?period=${period}&year=${year}`
      );

      setCards(await res.json());
    } catch {
      // Temp fallback until backend endpoint is ready.
      setCards([]);
    } finally {
      setLoading(false);
    }
  }

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
              <option value="january">January</option>
              <option value="q1">Q1</option>
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
}: {
  card: CompanyGLCard;
  period: PeriodType;
  year: number;
}) {
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

      <div className="mb-4 rounded-md bg-gray-50 p-3">
        <p className="text-sm font-medium">{card.period_label}</p>
        <p className="text-xs text-gray-500">
          Last Import: {card.last_import_filename || "None"}
        </p>
        <p className="text-xs text-gray-500">
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
          className="flex-1 rounded-md bg-black px-3 py-2 text-sm text-white"
          onClick={() =>
            window.location.assign(
              `/general-ledger/company/${card.company_id}?period=${period}&year=${year}`
            )
          }
        >
          View Transactions
        </button>

        <button
          className="flex-1 rounded-md border px-3 py-2 text-sm"
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
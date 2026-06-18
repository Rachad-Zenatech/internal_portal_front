// src/pages/Reports.tsx
import { useState } from "react";
import { Download } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const QUARTERS = [1, 2, 3, 4];

export default function Reports() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [year, setYear] = useState(2026);
  const [quarter, setQuarter] = useState(1);

  const handleGenerateRecon = async () => {
    setIsGenerating(true);
    try {
      const params = new URLSearchParams({
        year: String(year),
        quarter: String(quarter),
      });
      const url = `${API_BASE_URL}/reports/reconciliation-excel?${params}`;
      
      window.open(url, '_blank');
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">
        Reports
      </h1>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 max-w-md shadow-sm">
        <h2 className="text-xl font-semibold mb-2 text-zinc-900 dark:text-zinc-100">Reconciliation Report</h2>
        <p className="text-zinc-500 mb-6 text-sm">
          Generate an Excel reconciliation report based on consolidated data for Q{quarter} {year}.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <label className="space-y-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Quarter
            </span>
            <select
              value={quarter}
              onChange={(event) => setQuarter(Number(event.target.value))}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {QUARTERS.map((q) => (
                <option key={q} value={q}>
                  Q{q}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Year
            </span>
            <input
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
        </div>

        <button
          onClick={handleGenerateRecon}
          disabled={isGenerating}
          className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {isGenerating ? "Generating..." : "Generate Reconciliation Report"}
        </button>
      </div>
    </div>
  );
}

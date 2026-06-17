// src/pages/Reports.tsx
import { useState } from "react";
import { Download } from "lucide-react";

export default function Reports() {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateRecon = async () => {
    setIsGenerating(true);
    try {
      const year = 2026;
      const quarter = 1;
      const url = `http://localhost:8000/reports/reconciliation-excel?year=${year}&quarter=${quarter}`;
      
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
          Generate an Excel reconciliation report based on the consolidated data for Q1 2026.
        </p>
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

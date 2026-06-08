import { useChartOfAccounts } from "@/hooks/useChartOfAccount";
import UploadCOACard from "@/components/ChartOfAccounts/UploadCOACard";
import AddAccountCard from "@/components/ChartOfAccounts/AddAccountCard";
import COATable from "@/components/ChartOfAccounts/COATable";

export default function ChartOfAccounts() {
  // Fetch the data once at the top level to pass down to the table
  const { data: result, isPending: loadingData } = useChartOfAccounts();

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* 1. HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-slate-500 mt-1">
            Manage the permanent account list used by the accounting system.
          </p>
        </div>
      </div>

      {/* 2. ACTION ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UploadCOACard />
        <AddAccountCard />
      </div>

      {/* 3. DATA TABLE */}
      <COATable result={result} loadingData={loadingData} />
    </div>
  );
}
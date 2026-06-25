import { useState } from "react";
import { useChartOfAccounts } from "@/hooks/useChartOfAccount";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import UploadCOADialog from "@/components/ChartOfAccounts/UploadCOADialog";
import AddAccountDialog from "@/components/ChartOfAccounts/AddAccountDialog";
import COATable from "@/components/ChartOfAccounts/COATable";

export default function ChartOfAccounts() {
  const { data: result, isPending: loadingData } = useChartOfAccounts();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredResult = result ? {
    ...result,
    chart_of_accounts: result.chart_of_accounts.filter(acc => 
      acc.account_number.toLowerCase().includes(searchQuery.toLowerCase()) || 
      acc.account_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  } : undefined;

  return (
    <div className="w-full space-y-8 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-slate-500 mt-1">
            Manage the permanent account list used by the accounting system.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <UploadCOADialog />
          <AddAccountDialog />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Search accounts..." 
            className="pl-9 bg-white" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <COATable result={filteredResult} loadingData={loadingData} />
    </div>
  );
}
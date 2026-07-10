import { useChartOfAccounts } from "@/hooks/useChartOfAccount";
import UploadCOADialog from "@/components/ChartOfAccounts/UploadCOADialog";
import AddAccountDialog from "@/components/ChartOfAccounts/AddAccountDialog";
import COATable from "@/components/ChartOfAccounts/COATable";

import { useAuth } from "@/lib/AuthContext";

export default function ChartOfAccounts() {
  const { data: result, isPending: loadingData } = useChartOfAccounts();
  const { hasPermission } = useAuth();
  
  const canUpdate = hasPermission("CONFIG_CHART_OF_ACCOUNTS_UPDATE");
  const canDelete = hasPermission("CONFIG_CHART_OF_ACCOUNTS_DELETE");
  const canCreate = hasPermission("CONFIG_CHART_OF_ACCOUNTS_CREATE");

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
          {(canUpdate || canDelete) && <UploadCOADialog />}
          {canCreate && <AddAccountDialog />}
        </div>
      </div>

      <COATable result={result} loadingData={loadingData} />
    </div>
  );
}
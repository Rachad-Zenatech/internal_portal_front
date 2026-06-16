import { useEffect, useState } from "react";
import {
  GLService,
  type ConsolidatedMatrixResponse,
} from "../services/glService";
import { Loader2, Network, Layers, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

function money(value: number) {
  if (!value || Math.abs(value) < 0.005) return "-";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function moneyTotal(value: number) {
  if (!value || Math.abs(value) < 0.005) value = 0;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getColorClass(value: number) {
  if (!value || Math.abs(value) < 0.005) return "text-slate-900";
  return value > 0 ? "text-blue-600" : "text-red-600";
}

function getTabIcon(name: string) {
  if (name.includes("DaaS")) return <Network className="mr-2 h-4 w-4" />;
  if (name.includes("SAS") || name.includes("SaaS")) return <Layers className="mr-2 h-4 w-4" />;
  if (name.includes("Elim")) return <Building2 className="mr-2 h-4 w-4" />;
  return null;
}

export default function ConsolidatedTrialBalanceMatrix() {
  const [data, setData] = useState<ConsolidatedMatrixResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [hiddenCompanies, setHiddenCompanies] = useState<Set<string>>(new Set());

  useEffect(() => {
    setHiddenCompanies(new Set());
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    GLService.getConsolidatedTrialBalanceMatrix()
      .then((res) => {
        setData(res);
        if (res.tabs.length > 0) {
          setActiveTab(res.tabs[0].name);
        }
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load matrix")
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-80" />
            <Skeleton className="h-5 w-64" />
          </div>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64 rounded-md" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Card className="overflow-hidden p-4 border-slate-200 shadow-sm space-y-4">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!data || data.tabs.length === 0) {
    return <div className="p-8 text-slate-500">No data available.</div>;
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Consolidated Trial Balance</h1>
          <p className="text-slate-500 mt-1">Chart of Accounts matrix by company group.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100/50">
          {data.tabs.map((tab) => (
            <TabsTrigger key={tab.name} value={tab.name} className="flex items-center">
              {getTabIcon(tab.name)}
              {tab.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {data.tabs.map((tab) => {
          const activeTabData = tab;
          const visibleColumns = activeTabData.columns.filter(c => !hiddenCompanies.has(c));
          
          return (
            <TabsContent key={tab.name} value={tab.name} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-slate-500 mr-2">Filter Columns:</span>
                  {activeTabData.columns.map((col) => {
                    const isHidden = hiddenCompanies.has(col);
                    return (
                      <button
                        key={col}
                        onClick={() => {
                          setHiddenCompanies((prev) => {
                            const next = new Set(prev);
                            if (next.has(col)) next.delete(col);
                            else next.add(col);
                            return next;
                          });
                        }}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                          isHidden
                            ? "bg-slate-200 border-slate-300 text-slate-900 hover:bg-slate-300"
                            : "bg-black border-black text-white hover:bg-slate-800"
                        }`}
                      >
                        {col}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Card className="overflow-hidden p-0 border-slate-200 shadow-sm">
                <Table className="m-0 relative border-collapse table-fixed" containerClassName="max-h-[calc(100vh-20rem)] w-full relative">
                    <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-sm">
                      <TableRow className="bg-slate-50 hover:bg-slate-50 border-b-slate-200">
                        <TableHead className="sticky left-0 z-30 w-[120px] min-w-[120px] bg-slate-50 font-semibold text-slate-700 shadow-[1px_0_0_0_#e2e8f0]">
                          Account
                        </TableHead>
                        <TableHead className="sticky left-[120px] z-30 w-[250px] min-w-[250px] bg-slate-50 font-semibold text-slate-700 shadow-[1px_0_0_0_#e2e8f0]">
                          Name
                        </TableHead>
                        {visibleColumns.map((col) => (
                          <TableHead key={col} className="w-[150px] min-w-[150px] whitespace-normal break-words border-r border-slate-200 text-center font-semibold text-slate-700 leading-tight py-2">
                            {col}
                          </TableHead>
                        ))}
                        <TableHead className="sticky right-0 z-30 w-[150px] min-w-[150px] bg-slate-50 text-right font-bold text-slate-900 shadow-[-1px_0_0_0_#e2e8f0]">
                          Total
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {activeTabData.accounts.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={visibleColumns.length + 3}
                            className="p-6 text-center text-slate-500"
                          >
                            No accounts mapped for this group.
                          </TableCell>
                        </TableRow>
                      ) : (
                        activeTabData.accounts.map((acct) => {
                          const rowTotal = visibleColumns.reduce(
                            (sum, col) => sum + (acct.balances[col] || 0),
                            0
                          );
                          return (
                            <TableRow key={acct.account_number} className="group hover:bg-slate-50 border-b-slate-100">
                              <TableCell className="sticky left-0 w-[120px] min-w-[120px] bg-white group-hover:bg-slate-50 shadow-[1px_0_0_0_#e2e8f0] font-medium text-slate-900">
                                {acct.account_number}
                              </TableCell>
                              <TableCell className="sticky left-[120px] w-[250px] min-w-[250px] bg-white group-hover:bg-slate-50 shadow-[1px_0_0_0_#e2e8f0] text-slate-600 truncate">
                                {acct.account_name}
                              </TableCell>
                              {visibleColumns.map((col) => {
                                const val = acct.balances[col] || 0;
                                return (
                                  <TableCell key={col} className="w-[150px] min-w-[150px] border-r border-slate-100 text-right text-slate-600">
                                    {money(val)}
                                  </TableCell>
                                );
                              })}
                              <TableCell className={`sticky right-0 w-[150px] min-w-[150px] bg-slate-50 shadow-[-1px_0_0_0_#e2e8f0] group-hover:bg-slate-100 text-right font-bold ${getColorClass(rowTotal)}`}>
                                {moneyTotal(rowTotal)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                    {activeTabData.accounts.length > 0 && (
                      <TableFooter className="sticky bottom-0 z-30 bg-slate-100 border-t-[24px] border-white">
                        <TableRow className="hover:bg-slate-100 border-t-[3px] border-slate-300">
                          <TableCell className="sticky left-0 z-40 w-[120px] min-w-[120px] bg-slate-100 shadow-[1px_0_0_0_#e2e8f0]"></TableCell>
                          <TableCell className="sticky left-[120px] z-40 w-[250px] min-w-[250px] bg-slate-100 text-right font-bold text-slate-900 shadow-[1px_0_0_0_#e2e8f0]">
                            Total:
                          </TableCell>
                          {visibleColumns.map((col) => {
                            const colTotal = activeTabData.accounts.reduce(
                              (sum, acct) => sum + (acct.balances[col] || 0),
                              0
                            );
                            return (
                              <TableCell key={col} className={`w-[150px] min-w-[150px] border-r border-slate-300 text-right font-bold ${getColorClass(colTotal)}`}>
                                {moneyTotal(colTotal)}
                              </TableCell>
                            );
                          })}
                          <TableCell className="sticky right-0 z-40 w-[150px] min-w-[150px] bg-slate-100 text-right font-bold shadow-[-1px_0_0_0_#e2e8f0]">
                            {(() => {
                              const grandTotal = activeTabData.accounts.reduce((sum, acct) => {
                                const rowSum = visibleColumns.reduce(
                                  (rSum, col) => rSum + (acct.balances[col] || 0),
                                  0
                                );
                                return sum + rowSum;
                              }, 0);
                              return (
                                <span className={getColorClass(grandTotal)}>
                                  {moneyTotal(grandTotal)}
                                </span>
                              );
                            })()}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    )}
                  </Table>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useConsolidatedMatrix } from "../hooks/useGL";
import { Network, Layers, Building2, Settings2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

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
  if (!value || Math.abs(value) < 0.005) return "text-foreground";
  return value > 0 ? "text-blue-600" : "text-red-600";
}

function getTabIcon(name: string) {
  if (name.includes("DaaS")) return <Network className="mr-2 h-4 w-4" />;
  if (name.includes("SAS") || name.includes("SaaS")) return <Layers className="mr-2 h-4 w-4" />;
  if (name.includes("Elim")) return <Building2 className="mr-2 h-4 w-4" />;
  return null;
}

export default function ConsolidatedTrialBalanceMatrix() {
  const [period, setPeriod] = useState<string>("annual");
  const [year, setYear] = useState<number>(2026);
  const { data, isLoading: loading, error } = useConsolidatedMatrix(period, year);
  const [activeTab, setActiveTab] = useState<string>("");
  const [hiddenCompanies, setHiddenCompanies] = useState<Set<string>>(new Set());

  useEffect(() => {
    setHiddenCompanies(new Set());
  }, [activeTab]);

  useEffect(() => {
    if (data && data.tabs.length > 0 && !activeTab) {
      setActiveTab(data.tabs[0].name);
    }
  }, [data, activeTab]);

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 text-foreground">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Consolidated Trial Balance</h1>
          <p className="text-slate-500 mt-1">Chart of Accounts matrix by company group.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full">
          <div className="w-full">
            {(!loading && !error && data && data.tabs.length > 0) ? (
              <TabsList variant="line" className="h-10 p-0 bg-transparent border-none">
                {data.tabs.map((tab) => (
                  <TabsTrigger key={tab.name} value={tab.name} className="flex items-center">
                    {getTabIcon(tab.name)}
                    {tab.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            ) : (
              <div className="h-10" />
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="w-64 rounded-md" />
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
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error.message || "Failed to load matrix"}
          </div>
        ) : !data || data.tabs.length === 0 ? (
          <div className="text-slate-500">No data available.</div>
        ) : (
          <>

        {data.tabs.map((tab) => {
          const activeTabData = tab;
          const visibleColumns = activeTabData.columns.filter(c => !hiddenCompanies.has(c));
          
          return (
            <TabsContent key={tab.name} value={tab.name} className="space-y-4 mt-0 outline-none transition-all duration-300 animate-in fade-in-30 slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 border-slate-200">
                        <Settings2 className="mr-2 h-4 w-4" />
                        Columns
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[200px]">
                      <DropdownMenuCheckboxItem
                        checked={hiddenCompanies.size === 0}
                        onSelect={(e) => e.preventDefault()}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setHiddenCompanies(new Set());
                          } else {
                            setHiddenCompanies(new Set(activeTabData.columns));
                          }
                        }}
                      >
                        Select All
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuSeparator />
                      {activeTabData.columns.map((col) => {
                        const isHidden = hiddenCompanies.has(col);
                        return (
                          <DropdownMenuCheckboxItem
                            key={col}
                            checked={!isHidden}
                            onSelect={(e) => e.preventDefault()}
                            onCheckedChange={(checked) => {
                              setHiddenCompanies((prev) => {
                                const next = new Set(prev);
                                if (!checked) next.add(col);
                                else next.delete(col);
                                return next;
                              });
                            }}
                          >
                            {col}
                          </DropdownMenuCheckboxItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-4">
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-[180px] bg-white border-slate-200">
                      <SelectValue placeholder="Select Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Yearly</SelectLabel>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Quarterly</SelectLabel>
                        <SelectItem value="q1">Q1</SelectItem>
                        <SelectItem value="q2">Q2</SelectItem>
                        <SelectItem value="q3">Q3</SelectItem>
                        <SelectItem value="q4">Q4</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Monthly</SelectLabel>
                        {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                          <SelectItem key={m} value={m.toLowerCase()}>{m}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  
                  <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                    <SelectTrigger className="w-[120px] bg-white border-slate-200">
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
              </div>

              <Card className="overflow-hidden p-0 border-slate-200 shadow-sm">
                <Table className="m-0 relative border-collapse table-fixed" containerClassName="max-h-[calc(100vh-20rem)] w-full relative">
                    <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-sm">
                      <TableRow className="bg-slate-50 hover:bg-slate-50 border-b-slate-200">
                        <TableHead className="sticky left-0 z-30 w-[120px] min-w-[120px] bg-slate-50 font-semibold text-foreground shadow-[1px_0_0_0_#e2e8f0] text-left border-r border-slate-200">
                          Account
                        </TableHead>
                        <TableHead className="sticky left-[120px] z-30 w-[250px] min-w-[250px] bg-slate-50 font-semibold text-foreground shadow-[1px_0_0_0_#e2e8f0] text-left border-r border-slate-200">
                          Name
                        </TableHead>
                        {visibleColumns.map((col) => (
                          <TableHead key={col} className="w-[150px] min-w-[150px] whitespace-normal break-words font-semibold text-foreground leading-tight py-2 text-left border-r border-slate-200">
                            {col}
                          </TableHead>
                        ))}
                        <TableHead className="sticky right-0 z-30 w-[150px] min-w-[150px] bg-slate-50 text-left font-bold text-foreground shadow-[-1px_0_0_0_#e2e8f0] border-l border-slate-200">
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
                              <TableCell className="sticky left-0 w-[120px] min-w-[120px] bg-white group-hover:bg-slate-50 shadow-[1px_0_0_0_#e2e8f0] font-medium text-foreground">
                                {acct.account_number}
                              </TableCell>
                              <TableCell className="sticky left-[120px] w-[250px] min-w-[250px] bg-white group-hover:bg-slate-50 shadow-[1px_0_0_0_#e2e8f0] text-foreground truncate">
                                {acct.account_name}
                              </TableCell>
                              {visibleColumns.map((col) => {
                                const val = acct.balances[col] || 0;
                                return (
                                  <TableCell key={col} className="w-[150px] min-w-[150px] text-right text-foreground">
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
                          <TableCell className="sticky left-[120px] z-40 w-[250px] min-w-[250px] bg-slate-100 text-right font-bold text-foreground shadow-[1px_0_0_0_#e2e8f0]">
                            Total:
                          </TableCell>
                          {visibleColumns.map((col) => {
                            const colTotal = activeTabData.accounts.reduce(
                              (sum, acct) => sum + (acct.balances[col] || 0),
                              0
                            );
                            return (
                              <TableCell key={col} className={`w-[150px] min-w-[150px] text-right font-bold ${getColorClass(colTotal)}`}>
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
          </>
        )}
      </Tabs>
    </div>
  );
}

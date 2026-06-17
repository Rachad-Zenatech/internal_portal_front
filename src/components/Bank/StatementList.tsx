import { useState, useMemo, Fragment } from "react";
import { X, Calendar, ChevronRight, Layers } from "lucide-react";
import { useStatements, useDeleteStatement, useBankAccounts } from "@/hooks/useBank";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ALL = "all";

const fmt = (n: number): string =>
  Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 });

const typeLabel = (t: string): string =>
  t ? t.charAt(0).toUpperCase() + t.slice(1) : "—";

interface Props {
  onSelect: (id: number) => void;
}

export default function StatementList({ onSelect }: Props) {
  const [selectedCompany, setSelectedCompany] = useState<string>(ALL);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});

  const toggleCompany = (companyName: string) => {
    setExpandedCompanies((prev) => ({
      ...prev,
      [companyName]: !prev[companyName]
    }));
  };

  const { data: accounts = [] } = useBankAccounts();
  const { data: statements = [], isLoading, error } = useStatements(accountId);
  const deleteStatement = useDeleteStatement();

  const companies = useMemo(() => {
    const names = accounts.map((a) => a.company_name);
    return Array.from(new Set(names));
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    if (selectedCompany === ALL) return [];
    return accounts.filter((a) => a.company_name === selectedCompany);
  }, [accounts, selectedCompany]);

  const handleCompanyChange = (company: string) => {
    if (company) {
      setSelectedCompany(company);
      setAccountId(null);
    }
  };

  const filteredStatements = useMemo(() => {
    return statements.filter((stmt) => selectedCompany === ALL || stmt.company_name === selectedCompany);
  }, [statements, selectedCompany]);

  const groupedStatements = useMemo(() => {
    const groups: Record<string, typeof statements> = {};
    for (const stmt of filteredStatements) {
      const c = stmt.company_name || "Unknown Company";
      if (!groups[c]) groups[c] = [];
      groups[c].push(stmt);
    }
    
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => {
        if (!a.statement_date) return 1;
        if (!b.statement_date) return -1;
        return new Date(b.statement_date).getTime() - new Date(a.statement_date).getTime();
      });
    }

    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {} as Record<string, typeof statements>);
  }, [filteredStatements]);

  const toggleItemStyles = 
    "px-3 transition-all data-[state=on]:bg-blue-50 data-[state=on]:text-blue-600 font-medium";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {/* Filters and Actions Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              className="justify-start gap-2 flex-wrap bg-transparent border-0"
              value={selectedCompany}
              onValueChange={handleCompanyChange}
            >
              <ToggleGroupItem value={ALL} className={toggleItemStyles}>
                All Companies
              </ToggleGroupItem>
              {companies.map((company) => (
                <ToggleGroupItem key={company} value={company} className={toggleItemStyles}>
                  {company}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            
            {selectedCompany !== ALL && filteredAccounts.length > 0 && (
              <>
                <div className="w-px h-6 bg-slate-200 mx-2" />
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  className="justify-start gap-2 flex-wrap"
                  value={accountId ? String(accountId) : ALL}
                  onValueChange={(val) => {
                    if (val) setAccountId(val === ALL ? null : Number(val));
                  }}
                >
                  <ToggleGroupItem value={ALL} className={toggleItemStyles}>
                    All Accounts
                  </ToggleGroupItem>
                  {filteredAccounts.map((a) => (
                    <ToggleGroupItem key={a.id} value={String(a.id)} className={toggleItemStyles}>
                      <span className="capitalize">{a.bank_name}</span> (****{a.account_number})
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm font-medium text-slate-500 bg-white px-3 py-1.5 border rounded-md">
            <span>{filteredStatements.length} Statements</span>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      )}
      
      {error && (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      )}
      
      {!isLoading && statements.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-white border rounded-xl border-dashed">
          <Layers className="h-12 w-12 mb-4 text-slate-200" />
          <p>No bank statements found.</p>
        </div>
      )}

      {/* Main Data Table */}
      {!isLoading && statements.length > 0 && (
        <div className="bg-white rounded-xl pb-4">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest pl-4">Company</TableHead>
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Bank & Account</TableHead>
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Statement Date</TableHead>
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Type</TableHead>
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest text-right">Beg Bal</TableHead>
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest text-right">Additions</TableHead>
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest text-right">Deductions</TableHead>
                <TableHead className="font-bold text-[10px] text-slate-400 uppercase tracking-widest text-right">End Bal</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedStatements).map(([companyName, companyStmts]) => {
                const isExpanded = expandedCompanies[companyName] ?? false;
                return (
                  <Fragment key={companyName}>
                    {/* Group Header Row */}
                    <TableRow 
                      className="cursor-pointer hover:bg-slate-50/50 border-b border-slate-50 transition-colors"
                      onClick={() => toggleCompany(companyName)}
                    >
                      <TableCell colSpan={9} className="py-3 pl-4">
                        <div className="flex items-center gap-4">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full hover:bg-slate-200 text-slate-500" tabIndex={-1}>
                            <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                          </Button>
                          <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">
                            {companyName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-700">{companyName}</span>
                          <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            {companyStmts.length} statements
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded Rows */}
                    {isExpanded && companyStmts.map((stmt) => (
                      <TableRow 
                        key={stmt.id}
                        className="cursor-pointer group hover:bg-slate-50 transition-colors border-b border-slate-50"
                        onClick={() => onSelect(stmt.id)}
                      >
                        <TableCell className="pl-16 py-3">
                          {/* Empty cell under company avatar */}
                        </TableCell>
                        
                        <TableCell className="py-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-700 capitalize">{stmt.bank_name}</span>
                            <span className="text-[11px] text-blue-600 font-medium">****{stmt.account_number}</span>
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-slate-500 text-sm py-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-slate-300" />
                            {stmt.statement_date}
                          </div>
                        </TableCell>
                        
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                              {typeLabel(stmt.statement_type)}
                            </span>
                            <span className="text-xs font-medium text-slate-400">
                              Q{stmt.statement_quarter} {stmt.statement_year}
                            </span>
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-right py-3">
                          <span className="font-medium text-slate-600 text-[13px]">${fmt(stmt.beginning_balance)}</span>
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <span className="font-medium text-green-600 text-[13px]">+${fmt(stmt.total_additions)}</span>
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <span className="font-medium text-red-600 text-[13px]">-${fmt(stmt.total_subtractions)}</span>
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <span className="font-bold text-slate-700 text-[15px]">${fmt(stmt.ending_balance)}</span>
                        </TableCell>
                        
                        <TableCell className="py-3 pr-4">
                          <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-full"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete statement?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this statement.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteStatement.mutate(stmt.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
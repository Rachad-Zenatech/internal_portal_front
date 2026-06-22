import { useState, useMemo, Fragment } from "react";
import { X, Calendar, ChevronRight, Layers, Settings2, Building2 } from "lucide-react";
import { useStatements, useDeleteStatement, useBankAccounts } from "@/hooks/useBank";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

const fmt = (n: number): string =>
  Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 });

const typeLabel = (t: string): string =>
  t ? t.charAt(0).toUpperCase() + t.slice(1) : "—";

interface Props {
  onSelect: (id: number) => void;
}

export default function StatementList({ onSelect }: Props) {
  const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [hiddenCompanies, setHiddenCompanies] = useState<Set<string>>(new Set());

  const allColumns = [
    "Company",
    "Bank & Account",
    "Statement Date",
    "Type",
    "Beg Bal",
    "Additions",
    "Deductions",
    "End Bal",
  ];

  const toggleCompany = (companyName: string) => {
    setExpandedCompanies((prev) => ({
      ...prev,
      [companyName]: !prev[companyName]
    }));
  };

  const { data: accounts = [] } = useBankAccounts();
  const { data: statements = [], isLoading, error } = useStatements(null);
  const deleteStatement = useDeleteStatement();

  const companies = useMemo(() => {
    const names = accounts.map((a) => a.company_name);
    return Array.from(new Set(names));
  }, [accounts]);

  const filteredStatements = useMemo(() => {
    return statements.filter((stmt) => !hiddenCompanies.has(stmt.company_name || "Unknown Company"));
  }, [statements, hiddenCompanies]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {/* Filters and Actions Row */}
        <div className="flex items-center justify-end gap-3">
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 border-border">
                <Building2 className="mr-2 h-4 w-4" />
                Company
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuCheckboxItem
                checked={companies.every((c) => !hiddenCompanies.has(c))}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={(checked) => {
                  setHiddenCompanies((prev) => {
                    const next = new Set(prev);
                    if (checked) {
                      companies.forEach((c) => next.delete(c));
                    } else {
                      companies.forEach((c) => next.add(c));
                    }
                    return next;
                  });
                }}
              >
                Select All
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {companies.map((company) => (
                <DropdownMenuCheckboxItem
                  key={company}
                  checked={!hiddenCompanies.has(company)}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={(checked) => {
                    setHiddenCompanies((prev) => {
                      const next = new Set(prev);
                      if (!checked) next.add(company);
                      else next.delete(company);
                      return next;
                    });
                  }}
                >
                  {company}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 border-border">
                <Settings2 className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuCheckboxItem
                checked={allColumns.every((col) => !hiddenColumns.has(col))}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={(checked) => {
                  setHiddenColumns((prev) => {
                    const next = new Set(prev);
                    if (checked) {
                      allColumns.forEach((c) => next.delete(c));
                    } else {
                      allColumns.forEach((c) => next.add(c));
                    }
                    return next;
                  });
                }}
              >
                Select All
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {allColumns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col}
                  checked={!hiddenColumns.has(col)}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={(checked) => {
                    setHiddenColumns((prev) => {
                      const next = new Set(prev);
                      if (!checked) next.add(col);
                      else next.delete(col);
                      return next;
                    });
                  }}
                >
                  {col}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
        <Card className="w-full mb-6">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <h3 className="text-lg font-semibold text-foreground">Failed to load data</h3>
            <p className="text-sm text-muted-foreground mt-1">{(error as Error).message}</p>
          </CardContent>
        </Card>
      )}
      
      {!isLoading && statements.length === 0 && (
        <Card className="w-full">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <h3 className="text-lg font-semibold text-foreground">No data</h3>
            <p className="text-sm text-muted-foreground mt-1">No bank statements found.</p>
          </CardContent>
        </Card>
      )}

      {/* Main Data Table */}
      {!isLoading && statements.length > 0 && (
        <div className="bg-card rounded-xl pb-4">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                {!hiddenColumns.has("Company") && <TableHead className="font-bold text-[10px] text-muted-foreground uppercase tracking-widest pl-4">Company</TableHead>}
                {!hiddenColumns.has("Bank & Account") && <TableHead className="font-bold text-[10px] text-muted-foreground uppercase tracking-widest">Bank & Account</TableHead>}
                {!hiddenColumns.has("Statement Date") && <TableHead className="font-bold text-[10px] text-muted-foreground uppercase tracking-widest">Statement Date</TableHead>}
                {!hiddenColumns.has("Type") && <TableHead className="font-bold text-[10px] text-muted-foreground uppercase tracking-widest">Type</TableHead>}
                {!hiddenColumns.has("Beg Bal") && <TableHead className="font-bold text-[10px] text-muted-foreground uppercase tracking-widest text-right">Beg Bal</TableHead>}
                {!hiddenColumns.has("Additions") && <TableHead className="font-bold text-[10px] text-muted-foreground uppercase tracking-widest text-right">Additions</TableHead>}
                {!hiddenColumns.has("Deductions") && <TableHead className="font-bold text-[10px] text-muted-foreground uppercase tracking-widest text-right">Deductions</TableHead>}
                {!hiddenColumns.has("End Bal") && <TableHead className="font-bold text-[10px] text-muted-foreground uppercase tracking-widest text-right">End Bal</TableHead>}
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
                      className="cursor-pointer hover:bg-muted/50 border-b border-border transition-colors"
                      onClick={() => toggleCompany(companyName)}
                    >
                      <TableCell colSpan={allColumns.length + 1 - hiddenColumns.size} className="py-3 pl-4">
                        <div className="flex items-center gap-4">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full hover:bg-muted text-muted-foreground" tabIndex={-1}>
                            <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                          </Button>
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {companyName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-foreground">{companyName}</span>
                          <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {companyStmts.length} statements
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded Rows */}
                    {isExpanded && companyStmts.map((stmt) => (
                      <TableRow 
                        key={stmt.id}
                        className="cursor-pointer group hover:bg-muted/30 transition-colors border-b border-border"
                        onClick={() => onSelect(stmt.id)}
                      >
                        {!hiddenColumns.has("Company") && (
                          <TableCell className="pl-16 py-3">
                            {/* Empty cell under company avatar */}
                          </TableCell>
                        )}
                        
                        {!hiddenColumns.has("Bank & Account") && (
                          <TableCell className="py-3">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground capitalize">{stmt.bank_name}</span>
                              <span className="text-[11px] text-primary font-medium">****{stmt.account_number}</span>
                            </div>
                          </TableCell>
                        )}
                        
                        {!hiddenColumns.has("Statement Date") && (
                          <TableCell className="text-muted-foreground text-sm py-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground/50" />
                              {stmt.statement_date}
                            </div>
                          </TableCell>
                        )}
                        
                        {!hiddenColumns.has("Type") && (
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                                {typeLabel(stmt.statement_type)}
                              </span>
                              <span className="text-xs font-medium text-muted-foreground">
                                Q{stmt.statement_quarter} {stmt.statement_year}
                              </span>
                            </div>
                          </TableCell>
                        )}
                        
                        {!hiddenColumns.has("Beg Bal") && (
                          <TableCell className="text-right py-3">
                            <span className="font-medium text-foreground/80 text-[13px]">${fmt(stmt.beginning_balance)}</span>
                          </TableCell>
                        )}
                        
                        {!hiddenColumns.has("Additions") && (
                          <TableCell className="text-right py-3">
                            <span className="font-medium text-green-600 dark:text-green-500 text-[13px]">+${fmt(stmt.total_additions)}</span>
                          </TableCell>
                        )}
                        
                        {!hiddenColumns.has("Deductions") && (
                          <TableCell className="text-right py-3">
                            <span className="font-medium text-red-600 dark:text-red-500 text-[13px]">-${fmt(stmt.total_subtractions)}</span>
                          </TableCell>
                        )}
                        
                        {!hiddenColumns.has("End Bal") && (
                          <TableCell className="text-right py-3">
                            <span className="font-bold text-foreground text-[15px]">${fmt(stmt.ending_balance)}</span>
                          </TableCell>
                        )}
                        
                        <TableCell className="py-3 pr-4">
                          <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
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

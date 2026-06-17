import { useState, useMemo } from "react";
import { X, Calendar, CreditCard, ChevronDown, ChevronRight } from "lucide-react";
import { useStatements, useDeleteStatement, useBankAccounts } from "@/hooks/useBank";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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

  // 1. Extract unique companies for the company toggle group
  const companies = useMemo(() => {
    const names = accounts.map((a) => a.company_name);
    return Array.from(new Set(names));
  }, [accounts]);

  // 2. Filter accounts based on the selected company
  const filteredAccounts = useMemo(() => {
    if (selectedCompany === ALL) return [];
    return accounts.filter((a) => a.company_name === selectedCompany);
  }, [accounts, selectedCompany]);

  // Handle company change: update selection and reset account filter
  const handleCompanyChange = (company: string) => {
    if (company) {
      setSelectedCompany(company);
      setAccountId(null); // Reset account selection when company changes
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
    
    // Sort statements in each group by descending statement_date
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => {
        if (!a.statement_date) return 1;
        if (!b.statement_date) return -1;
        return new Date(b.statement_date).getTime() - new Date(a.statement_date).getTime();
      });
    }

    // Sort keys alphabetically
    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {} as Record<string, typeof statements>);
  }, [filteredStatements]);

  // Shared styling for active toggle items (Primary background color when active)
  const toggleItemStyles = 
    "px-3 transition-all data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90";

  return (
    <div className="space-y-5">
      <div>
        {/* Company Toggle Section */}
        <div className="rounded-lg bg-muted/10 mb-3">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            className="justify-start gap-2 flex-wrap"
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
        </div>

        {/* Account Toggle Section (Visible only when a specific company is selected) */}
        {selectedCompany !== ALL && filteredAccounts.length > 0 && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              className="justify-start gap-2 flex-wrap"
              value={accountId ? String(accountId) : ALL}
              onValueChange={(val) => {
                if (val) {
                  setAccountId(val === ALL ? null : Number(val));
                }
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
          </div>
        )}
      </div>

      {/* Loading States (Updated to mirror the 3-column grid shape) */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      )}
      
      {/* Error handling */}
      {error && (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      )}
      
      {/* Empty State */}
      {!isLoading && statements.length === 0 && (
        <p className="text-sm text-muted-foreground">No statements found</p>
      )}

      {/* Statement Cards Grid Grouped by Company */}
      {Object.entries(groupedStatements).map(([companyName, companyStmts]) => {
        const isExpanded = !!expandedCompanies[companyName]; // Default to false
        return (
        <div key={companyName} className="space-y-4 mb-8">
          <div 
            className="flex items-center justify-between border-b pb-2 cursor-pointer hover:bg-muted/30 group px-2 rounded-t-md transition-colors"
            onClick={() => toggleCompany(companyName)}
          >
            <h3 className="text-xl font-bold text-foreground/80 group-hover:text-foreground transition-colors">{companyName}</h3>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 transition-transform duration-200" tabIndex={-1}>
              <ChevronRight className={`h-5 w-5 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
            </Button>
          </div>
          
          {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in zoom-in-95 duration-200">
            {companyStmts.map((stmt) => (
              <Card
                key={stmt.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(stmt.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(stmt.id);
                  }
                }}
                className="cursor-pointer flex flex-col justify-between transition-all hover:bg-muted/30 hover:shadow-md border-muted-foreground/15 shadow-sm relative"
              >
                <CardContent className="p-4 flex flex-col h-full gap-3">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Delete statement"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete statement?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this statement and all of
                          its transactions. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteStatement.mutate(stmt.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  {/* Header Container */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-foreground tracking-tight line-clamp-1">
                        {stmt.bank_name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                        <CreditCard className="h-3 w-3" /> ****{stmt.account_number}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 pr-6">
                      <span className="text-[10px] bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider">
                        {typeLabel(stmt.statement_type)}
                      </span>
                      <span className="text-[11px] font-bold text-primary">
                        Q{stmt.statement_quarter} {stmt.statement_year}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center text-xs border-y border-dashed py-2 text-muted-foreground mt-auto">
                    <div className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-500">
                      <Calendar className="h-3.5 w-3.5" />
                      {stmt.statement_date}
                    </div>
                  </div>

                  {/* Ledger Value Metrics Block */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Beg.</span>
                      <span className="font-medium">${fmt(stmt.beginning_balance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Add</span>
                      <span className="font-medium text-green-600">+{fmt(stmt.total_additions)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">End</span>
                      <span className="font-medium">${fmt(stmt.ending_balance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sub</span>
                      <span className="font-medium text-red-600">-{fmt(stmt.total_subtractions)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          )}
        </div>
      )})}
    </div>
  );
}
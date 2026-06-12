import { useState, useMemo } from "react";
import { X, Calendar, CreditCard } from "lucide-react";
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

  // Shared styling for active toggle items (Primary background color when active)
  const toggleItemStyles = 
    "px-3 transition-all data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90";

  return (
    <div className="p-4 space-y-5">
      <div>
        <h2 className="text-xl font-bold mb-3">Statements</h2>
        
        {/* Company Toggle Section */}
        <div className="rounded-lg border bg-muted/10 p-3 mb-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            Filter by Company:
          </div>
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
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              Filter by Account:
            </div>
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

      {/* Statement Cards Grid (3 Columns on Large Screens) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statements
          .filter((stmt) => selectedCompany === ALL || stmt.company_name === selectedCompany)
          .map((stmt) => (
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
              className="cursor-pointer flex flex-col justify-between transition-all hover:bg-muted/30 hover:shadow-md border-muted-foreground/15 shadow-sm"
            >
              <CardContent className="p-5 flex flex-col h-full justify-between gap-5">
                {/* Header Container */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    {/* Bigger Company Name Font */}
                    <h3 className="font-bold text-base text-foreground tracking-tight line-clamp-1">
                      {stmt.company_name}
                    </h3>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary uppercase tracking-wide">
                        Q{stmt.statement_quarter} {stmt.statement_year}
                      </span>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
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
                    </div>
                  </div>

                  {/* Enhanced & Emphasized Meta Fields */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm text-foreground/90">{stmt.bank_name}</span>
                      {/* statement_type: High visibility background badge */}
                      <span className="text-xs bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        {typeLabel(stmt.statement_type)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {/* account_number: Highlighted background wrapper with icon */}
                      <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded font-mono text-foreground font-semibold text-[13px]">
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                        ****{stmt.account_number}
                      </span>
                      
                      {/* statement_date: Clear layout item with calendar icon */}
                      <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 px-2 py-1 rounded font-medium text-[13px]">
                        <Calendar className="h-3.5 w-3.5" />
                        {stmt.statement_date}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ledger Value Metrics Block (Font Sizes Bumped) */}
                <div className="pt-3 border-t border-dashed space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Beginning Balance</span>
                    <span className="font-semibold text-foreground">${fmt(stmt.beginning_balance)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Additions</span>
                    <span className="font-bold text-green-600">+${fmt(stmt.total_additions)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtractions</span>
                    <span className="font-bold text-destructive">−${fmt(stmt.total_subtractions)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 font-bold border-t border-muted">
                    <span className="text-foreground text-sm">Ending Balance</span>
                    <span className="text-primary text-xl tracking-tight">${fmt(stmt.ending_balance)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
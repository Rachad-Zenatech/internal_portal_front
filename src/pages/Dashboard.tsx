// src/pages/Dashboard.tsx

import { useMemo, useState } from "react";
import SummaryCards from "@/components/Dashboard/SummaryCards";
import RevenueExpenseChart from "@/components/Dashboard/RevenueExpenseChart";
import BankBalancesChart from "@/components/Dashboard/BankBalancesChart";
import AccountTypeDonut from "@/components/Dashboard/AccountTypeDonut";
import RecentTransactionsTable from "@/components/Dashboard/RecentTransactionsTable";
import { useCompanies } from "@/hooks/useBank";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Dashboard() {
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const [companySelection, setCompanySelection] = useState("all");

  const selectedCompanyId =
    companySelection === "all" ? null : Number(companySelection);

  const selectedCompanyName = useMemo(() => {
    if (!selectedCompanyId) return "All companies";
    return (
      companies.find((company) => company.id === selectedCompanyId)?.name ??
      "Selected company"
    );
  }, [companies, selectedCompanyId]);

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6 flex flex-col h-full overflow-y-auto">
      <header className="flex flex-col gap-4 rounded-lg  p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{selectedCompanyName}</p>
        </div>

        <div className="space-y-2">
          <Label>Company</Label>
          <Select
            value={companySelection}
            onValueChange={setCompanySelection}
            disabled={companiesLoading}
          >
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue
                placeholder={
                  companiesLoading ? "Loading companies..." : "Select company"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={String(company.id)}>
                  {company.name}
                  {company.entity ? ` (${company.entity})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Top Row: Summary Cards */}
      <SummaryCards companyId={selectedCompanyId} />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Row 1: Revenue vs Expense & Account Donut */}
        <div className="xl:col-span-2 flex flex-col min-h-[400px]">
          <RevenueExpenseChart companyId={selectedCompanyId} />
        </div>
        <div className="flex flex-col">
          <AccountTypeDonut companyId={selectedCompanyId} />
        </div>

        {/* Row 2: Bank Balances & Recent Transactions */}
        <div className="xl:col-span-2 flex flex-col min-h-[400px]">
          <BankBalancesChart companyId={selectedCompanyId} />
        </div>
        <div className="flex flex-col min-h-[400px]">
          <RecentTransactionsTable companyId={selectedCompanyId} />
        </div>
      </div>
    </div>
  );
}

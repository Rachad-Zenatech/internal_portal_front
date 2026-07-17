// src/pages/Dashboard.tsx

import { useState } from "react";
import SummaryCards from "@/components/Dashboard/SummaryCards";
import RevenueExpenseChart from "@/components/Dashboard/RevenueExpenseChart";
import FinancialPosition from "@/components/Dashboard/FinancialPosition";
import BankBalancesChart from "@/components/Dashboard/BankBalancesChart";
import AccountTypeDonut from "@/components/Dashboard/AccountTypeDonut";
import RecentTransactionsTable from "@/components/Dashboard/RecentTransactionsTable";
import { useCompanies } from "@/hooks/useBank";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DashboardFilters } from "@/hooks/useDashboard";

export default function Dashboard() {
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const [companySelection, setCompanySelection] = useState("all");
  const [period, setPeriod] = useState("monthly");

  const selectedCompanyId =
    companySelection === "all" ? null : Number(companySelection);

  const filters: DashboardFilters = {
    companyId: selectedCompanyId,
  };

  return (
    <div className="w-full space-y-6 flex flex-col h-full overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out pb-10 bg-slate-50/50 dark:bg-transparent p-2 sm:p-6 lg:p-8 rounded-xl">
      
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200/60 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of financial position, bank activity, and accounting workflow.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={companySelection}
            onValueChange={setCompanySelection}
            disabled={companiesLoading}
          >
            <SelectTrigger className="w-[200px] h-9 bg-white border-slate-200">
              <SelectValue
                placeholder={
                  companiesLoading ? "Loading companies..." : "All Companies"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={String(company.id)}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={period}
            onValueChange={setPeriod}
          >
            <SelectTrigger className="w-[150px] h-9 bg-white border-slate-200">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="space-y-6">
        {/* Row 1: KPI Summary Cards */}
        <SummaryCards filters={filters} />

        {/* Row 2: Monthly P&L Trend & Financial Position */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col">
            <RevenueExpenseChart filters={filters} period={period} />
          </div>
          <div className="flex flex-col">
            <FinancialPosition filters={filters} />
          </div>
        </div>

        {/* Row 3: Bank Account Balances & Account Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col h-[400px]">
            <BankBalancesChart filters={filters} />
          </div>
          <div className="flex flex-col h-[400px]">
            <AccountTypeDonut filters={filters} />
          </div>
        </div>

        {/* Row 4: Recent Transactions Table */}
        <div className="grid grid-cols-1 gap-6">
          <div className="flex flex-col max-h-[400px]">
            <RecentTransactionsTable filters={filters} />
          </div>
        </div>
      </div>
    </div>
  );
}

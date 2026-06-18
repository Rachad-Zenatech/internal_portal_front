// src/pages/Dashboard.tsx

import SummaryCards from "@/components/Dashboard/SummaryCards";
import RevenueExpenseChart from "@/components/Dashboard/RevenueExpenseChart";
import BankBalancesChart from "@/components/Dashboard/BankBalancesChart";
import AccountTypeDonut from "@/components/Dashboard/AccountTypeDonut";
import RecentTransactionsTable from "@/components/Dashboard/RecentTransactionsTable";

export default function Dashboard() {
  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6 flex flex-col h-full overflow-y-auto">
      {/* Top Row: Summary Cards */}
      <SummaryCards />

      {/* Middle Row: Full Width Line Chart */}
      <div className="w-full">
        <RevenueExpenseChart />
      </div>

      {/* Bottom Row: Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Left Col: Bank Balances Bar Chart */}
        <div className="xl:col-span-2 flex flex-col h-full min-h-[400px]">
          <BankBalancesChart />
        </div>

        {/* Right Col: Pie Chart & Table Stacked */}
        <div className="flex flex-col gap-6 h-full">
          <div className="flex-none">
            <AccountTypeDonut />
          </div>
          <div className="flex-1 min-h-[250px]">
            <RecentTransactionsTable />
          </div>
        </div>
      </div>
    </div>
  );
}
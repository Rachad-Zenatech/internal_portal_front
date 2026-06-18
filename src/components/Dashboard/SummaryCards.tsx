import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, ThumbsDown, Wallet, Clock, TrendingUp } from "lucide-react";
import { useDashboardSummary } from "@/hooks/useDashboard";
import { Skeleton } from "@/components/ui/skeleton";

export default function SummaryCards() {
  const { data, isLoading, isError } = useDashboardSummary();

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(val || 0);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[120px] mb-2" />
              <Skeleton className="h-3 w-[140px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return <div className="text-red-500">Failed to load summary metrics.</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Assets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-slate-500">Total Assets</CardTitle>
          <div className="p-2 bg-blue-100 rounded-lg">
            <BarChart3 className="w-4 h-4 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(data.assets)}</div>
          <p className="flex items-center text-xs text-green-500 mt-1">
            <TrendingUp className="w-3 h-3 mr-1" />
            +{data.assetsChange}% from last month
          </p>
        </CardContent>
      </Card>

      {/* Total Liabilities */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-slate-500">Total Liabilities</CardTitle>
          <div className="p-2 bg-red-100 rounded-lg">
            <ThumbsDown className="w-4 h-4 text-red-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(data.liabilities)}</div>
          <p className="flex items-center text-xs text-green-500 mt-1">
            <TrendingUp className="w-3 h-3 mr-1" />
            +{data.liabilitiesChange}% from last month
          </p>
        </CardContent>
      </Card>

      {/* Total Equity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-slate-500">Total Equity</CardTitle>
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Wallet className="w-4 h-4 text-yellow-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(data.equity)}</div>
          <p className="flex items-center text-xs text-green-500 mt-1">
            <TrendingUp className="w-3 h-3 mr-1" />
            +{data.equityChange}% from last month
          </p>
        </CardContent>
      </Card>

      {/* Net Income */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-slate-500">Net Income (YTD)</CardTitle>
          <div className="p-2 bg-green-100 rounded-lg">
            <Clock className="w-4 h-4 text-green-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(data.netIncome)}</div>
          <p className="flex items-center text-xs text-green-500 mt-1">
            <TrendingUp className="w-3 h-3 mr-1" />
            +{data.netIncomeChange}% from last month
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

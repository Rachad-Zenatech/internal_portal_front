import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useBankBalancesChart } from "@/hooks/useDashboard";
import { Skeleton } from "@/components/ui/skeleton";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border shadow-md p-3 rounded-lg flex flex-col gap-1 text-sm">
        <p className="font-semibold">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-600">{entry.name}:</span>
            <span className="font-medium">${entry.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

type BankBalancesChartProps = {
  companyId?: number | null;
};

export default function BankBalancesChart({ companyId }: BankBalancesChartProps) {
  const { data, isLoading, isError } = useBankBalancesChart(companyId);

  const yAxisTickFormatter = (value: number) => {
    return `$${(value / 1000000).toFixed(1)}M`;
  };

  const xAxisTickFormatter = (value: string) => {
    // Truncate long account names for the x-axis
    if (value.length > 15) {
      return value.substring(0, 15) + "...";
    }
    return value;
  };

  if (isLoading) {
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <Skeleton className="h-6 w-[200px]" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return <div className="text-red-500">Failed to load bank balances data.</div>;
  }

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle>Bank Account Balances</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="account" 
                axisLine={false} 
                tickLine={false} 
                tickMargin={10} 
                tickFormatter={xAxisTickFormatter}
                tick={{ fill: "#64748b", fontSize: 11 }}
                interval={0}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tickMargin={10} 
                tickFormatter={yAxisTickFormatter}
                tick={{ fill: "#64748b", fontSize: 12 }}
                domain={[0, 1200000]}
                ticks={[0, 200000, 400000, 600000, 800000, 1000000, 1200000]}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
              <Legend verticalAlign="top" height={36} iconType="rect" wrapperStyle={{ paddingBottom: '20px' }} />
              <Bar 
                dataKey="beginning" 
                name="Beginning Balance" 
                fill="#1e3a8a" 
                radius={[2, 2, 0, 0]} 
                barSize={20}
              />
              <Bar 
                dataKey="ending" 
                name="Ending Balance" 
                fill="#60a5fa" 
                radius={[2, 2, 0, 0]} 
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

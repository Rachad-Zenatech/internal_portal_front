import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  useBankBalancesChart,
  type BankBalancePoint,
} from "@/hooks/useDashboard";
import { Skeleton } from "@/components/ui/skeleton";

type BankTooltipSeries = {
  color?: string;
  name: string;
  value: number;
  payload: BankBalancePoint;
};

type BankTooltipProps = {
  active?: boolean;
  payload?: BankTooltipSeries[];
  label?: string;
};

const CustomTooltip = ({ active, payload, label }: BankTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border shadow-md p-3 rounded-lg flex flex-col gap-1 text-sm">
        <p className="font-semibold">{label}</p>
        {payload.map((entry) => (
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

const CustomXAxisTick = ({ x, y, payload }: any) => {
  const value = payload.value as string;
  let lines: string[] = [];
  
  if (value.includes(" - ")) {
    const parts = value.split(" - ");
    lines = [
      parts[0].length > 20 ? parts[0].substring(0, 18) + "..." : parts[0],
      "#" + parts[1]
    ];
  } else {
    lines = [value.length > 20 ? value.substring(0, 18) + "..." : value];
  }
  
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        fill="#64748b"
        fontSize={11}
        transform="rotate(-35)"
      >
        {lines.map((line, index) => (
          <tspan x={0} dy={index === 0 ? 0 : 14} key={index}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
};

type BankBalancesChartProps = {
  companyId?: number | null;
};

export default function BankBalancesChart({ companyId }: BankBalancesChartProps) {
  const { data, isLoading, isError } = useBankBalancesChart(companyId);

  const yAxisTickFormatter = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${value}`;
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
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Bank Account Balances</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px] flex flex-col items-center justify-center p-6 text-center">
          <h3 className="text-lg font-semibold">No data</h3>
          <p className="text-sm text-muted-foreground mt-1">Failed to load bank balances.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader>
        <CardTitle>Bank Account Balances</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 pb-6 relative">
        {/* Custom Sticky Legend */}
        <div className="flex items-center gap-6 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#1e3a8a] rounded-[2px]" />
            <span className="text-xs font-semibold text-slate-600">Beginning Balance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#60a5fa] rounded-[2px]" />
            <span className="text-xs font-semibold text-slate-600">Ending Balance</span>
          </div>
        </div>

        <div className="flex-1 w-full min-h-0 flex relative">
          {/* Sticky Left Y-Axis */}
          <div className="w-[55px] shrink-0 h-full bg-card z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 20 }}>
                {/* Dummy XAxis to match bottom margin height perfectly */}
                <XAxis dataKey="account" tick={false} axisLine={false} tickLine={false} height={80} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tickMargin={10} 
                  tickFormatter={yAxisTickFormatter}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  width={55}
                />
                <Bar dataKey="beginning" fill="transparent" isAnimationActive={false} />
                <Bar dataKey="ending" fill="transparent" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Scrollable Chart Area */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar">
            <div style={{ minWidth: Math.max(800, data.length * 80), height: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="account" 
                    axisLine={false} 
                    tickLine={false} 
                    tickMargin={10} 
                    tick={<CustomXAxisTick />}
                    interval={0}
                    height={80}
                  />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="beginning" fill="#1e3a8a" radius={[2, 2, 0, 0]} barSize={20} />
                  <Bar dataKey="ending" fill="#60a5fa" radius={[2, 2, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

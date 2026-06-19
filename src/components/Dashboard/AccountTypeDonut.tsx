import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  useAccountDistribution,
  type AccountDistributionPoint,
} from "@/hooks/useDashboard";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["#22c55e", "#a855f7", "#eab308", "#3b82f6", "#f97316"];

type AccountTooltipPayload = {
  color?: string;
  payload: AccountDistributionPoint;
};

type AccountTooltipProps = {
  active?: boolean;
  payload?: AccountTooltipPayload[];
};

const CustomTooltip = ({ active, payload }: AccountTooltipProps) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    return (
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-lg p-3 rounded-lg flex flex-col gap-1 text-sm z-[100]">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: payload[0].color }} />
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{dataPoint.name}</span>
        </div>
        <div className="pl-5 text-zinc-600 dark:text-zinc-400">
          Value: <span className="font-medium text-zinc-900 dark:text-zinc-100">${dataPoint.value.toLocaleString()}</span>
        </div>
        <div className="pl-5 text-zinc-600 dark:text-zinc-400">
          Share: <span className="font-medium text-zinc-900 dark:text-zinc-100">{dataPoint.percentage}</span>
        </div>
      </div>
    );
  }
  return null;
};

type AccountTypeDonutProps = {
  companyId?: number | null;
};

export default function AccountTypeDonut({ companyId }: AccountTypeDonutProps) {
  const { data, isLoading, isError } = useAccountDistribution(companyId);

  if (isLoading) {
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <Skeleton className="h-6 w-[200px]" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full rounded-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return <div className="text-red-500">Failed to load account distribution.</div>;
  }

  // Calculate total for center label
  const total = data.reduce((acc, item) => acc + item.value, 0);

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle>Account Type Distribution: Trial Balance Snapshot</CardTitle>
      </CardHeader>
      <CardContent className="pb-0">
        <div className="h-[250px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((_entry: AccountDistributionPoint, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                content={<CustomTooltip />} 
                allowEscapeViewBox={{ x: true, y: true }}
                wrapperStyle={{ zIndex: 100 }}
              />
              <Legend 
                layout="vertical" 
                verticalAlign="middle" 
                align="right"
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', paddingLeft: '20px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Centered Total Label */}
          <div className="absolute top-1/2 left-[40%] transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-bold">100%</span>
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
              ${total.toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

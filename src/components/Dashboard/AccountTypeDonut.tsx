import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useAccountDistribution } from "@/hooks/useDashboard";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["#22c55e", "#a855f7", "#eab308", "#3b82f6", "#f97316"];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    return (
      <div className="bg-white border shadow-md p-3 rounded-lg flex flex-col gap-1 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: payload[0].color }} />
          <span className="font-semibold">{dataPoint.name}</span>
        </div>
        <div className="pl-5 text-slate-600">
          Value: <span className="font-medium">${dataPoint.value.toLocaleString()}</span>
        </div>
        <div className="pl-5 text-slate-600">
          Share: <span className="font-medium">{dataPoint.percentage}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function AccountTypeDonut() {
  const { data, isLoading, isError } = useAccountDistribution();

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
  const total = data.reduce((acc: number, item: any) => acc + item.value, 0);

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
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
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

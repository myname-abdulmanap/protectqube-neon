"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const energyData = [
  { day: "Sen", usage: 342, cost: 513000 },
  { day: "Sel", usage: 385, cost: 577500 },
  { day: "Rab", usage: 358, cost: 537000 },
  { day: "Kam", usage: 402, cost: 603000 },
  { day: "Jum", usage: 425, cost: 637500 },
  { day: "Sab", usage: 475, cost: 712500 },
  { day: "Min", usage: 445, cost: 667500 },
];

const chartConfig = {
  usage: {
    label: "Konsumsi (kWh)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function EnergyChart() {
  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={energyData} margin={{ left: 0, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`}
            width={40}
          />
          <ChartTooltip
            content={<ChartTooltipContent />}
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
          />
          <Bar
            dataKey="usage"
            fill="hsl(var(--chart-1))"
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

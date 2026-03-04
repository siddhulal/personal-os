"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface WeeklyChartProps {
  data: { week: string; completions: number }[];
  color: string;
}

export function WeeklyCompletionChart({ data, color }: WeeklyChartProps) {
  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
          />
          <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Bar dataKey="completions" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface MonthlyRateChartProps {
  data: { month: string; rate: number }[];
  color: string;
}

export function MonthlyRateChart({ data, color }: MonthlyRateChartProps) {
  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number) => [`${value.toFixed(1)}%`, "Rate"]}
          />
          <Area
            type="monotone"
            dataKey="rate"
            stroke={color}
            fill={color}
            fillOpacity={0.2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface DailyRateChartProps {
  data: { date: string; rate: number; completed: number; total: number }[];
}

export function DailyRateChart({ data }: DailyRateChartProps) {
  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            className="text-muted-foreground"
            interval={4}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number) => [`${value.toFixed(1)}%`, "Completion Rate"]}
          />
          <Area
            type="monotone"
            dataKey="rate"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.15}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

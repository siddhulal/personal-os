"use client";

import type { HabitCompletion } from "@/types";

interface HabitCalendarProps {
  completions: HabitCompletion[];
  color: string;
  days?: number;
}

export function HabitCalendar({ completions, color, days = 90 }: HabitCalendarProps) {
  const today = new Date();
  const completedDates = new Set(completions.map((c) => c.completedDate));

  // Generate date grid
  const cells: { date: string; completed: boolean; dayLabel: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    cells.push({
      date: dateStr,
      completed: completedDates.has(dateStr),
      dayLabel: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    });
  }

  // Split into weeks (7 per row)
  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">Last {days} Days</h4>
      <div className="flex flex-wrap gap-1">
        {cells.map((cell) => (
          <div
            key={cell.date}
            title={`${cell.dayLabel}: ${cell.completed ? "Completed" : "Missed"}`}
            className="w-3.5 h-3.5 rounded-sm transition-colors"
            style={{
              backgroundColor: cell.completed ? color : "hsl(var(--muted))",
              opacity: cell.completed ? 1 : 0.4,
            }}
          />
        ))}
      </div>
    </div>
  );
}

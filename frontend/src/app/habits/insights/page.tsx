"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Flame, Trophy, CalendarCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DailyRateChart } from "@/components/habits/HabitChart";
import { StreakBadge } from "@/components/habits/StreakBadge";
import { fetchHabitInsights } from "@/lib/api/habits";
import type { HabitInsights } from "@/types";

export default function HabitInsightsPage() {
  const { data: insights, isLoading } = useQuery<HabitInsights>({
    queryKey: ["habit-insights"],
    queryFn: fetchHabitInsights,
  });

  if (isLoading || !insights) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="h-8 w-16 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Link href="/habits">
            <Button variant="ghost" size="sm" className="mb-2 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Habits
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Habit Insights</h1>
          <p className="text-muted-foreground mt-1">
            Your habit performance at a glance
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <CalendarCheck className="h-4 w-4" />
                Active Habits
              </div>
              <p className="text-2xl font-bold">{insights.activeHabits}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                Overall Rate
              </div>
              <p className="text-2xl font-bold">
                {insights.overallCompletionRate.toFixed(0)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Flame className="h-4 w-4" />
                This Week
              </div>
              <p className="text-2xl font-bold">
                {insights.totalCompletionsThisWeek}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Trophy className="h-4 w-4" />
                This Month
              </div>
              <p className="text-2xl font-bold">
                {insights.totalCompletionsThisMonth}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Daily Completion Rate Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Daily Completion Rate (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DailyRateChart data={insights.dailyRates} />
          </CardContent>
        </Card>

        {/* Two column: Streaks + Best Performing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Streak Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Flame className="h-4 w-4" />
                Streak Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {insights.topStreaks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active streaks yet
                </p>
              ) : (
                <div className="space-y-3">
                  {insights.topStreaks.map((h, i) => (
                    <div key={h.habitId} className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground w-6">
                        {i + 1}
                      </span>
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: h.color }}
                      />
                      <Link
                        href={`/habits/${h.habitId}`}
                        className="flex-1 text-sm font-medium hover:underline truncate"
                      >
                        {h.name}
                      </Link>
                      <StreakBadge streak={h.currentStreak} />
                      <span className="text-xs text-muted-foreground">
                        Best: {h.longestStreak}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Best Performing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Best Performing (30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {insights.bestPerforming.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {insights.bestPerforming.map((h) => (
                    <div key={h.habitId} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: h.color }}
                          />
                          <Link
                            href={`/habits/${h.habitId}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {h.name}
                          </Link>
                        </div>
                        <span className="text-sm font-medium">
                          {h.completionRate.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(h.completionRate, 100)}%`,
                            backgroundColor: h.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

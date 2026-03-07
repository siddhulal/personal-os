"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAiChat, type PageAiAction } from "@/lib/ai-chat-context";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchAnalytics } from "@/lib/api/analytics";
import { generateWeeklyReview } from "@/lib/api/ai-copilot";
import type { AnalyticsData } from "@/types";
import {
  BarChart3,
  TrendingUp,
  Target,
  Flame,
  Brain,
  Clock,
  CheckSquare,
  FileText,
  Layers,
  Zap,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

function formatMinutesAsHours(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-24 bg-muted rounded animate-pulse mb-2" />
              <div className="h-3 w-32 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <div className="h-5 w-40 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-[160px] bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tooltip for the activity chart bars
// ---------------------------------------------------------------------------

interface TooltipData {
  date: string;
  tasks: number;
  notes: number;
  flashcards: number;
  pomodoros: number;
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [weeklyReview, setWeeklyReview] = useState<string | null>(null);

  const { data: analytics, isLoading, isError } = useQuery<AnalyticsData>({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics,
  });

  const reviewMutation = useMutation({
    mutationFn: generateWeeklyReview,
    onSuccess: (data) => {
      setWeeklyReview(data.content);
    },
  });

  // Compute max value for the daily activity chart
  const maxDailyTotal =
    analytics?.dailyActivity.reduce((max, day) => {
      const total = day.tasks + day.notes + day.flashcards + day.pomodoros;
      return Math.max(max, total);
    }, 0) ?? 1;

  // Compute max value for weekly trends
  const maxWeeklyProductivity =
    analytics?.weeklyTrends.reduce(
      (max, w) => Math.max(max, w.productivity),
      0
    ) ?? 1;

  // ── AI floating button actions ──────────────────────────────────────────────
  const { setPageActions, clearPageActions, openChat } = useAiChat();
  const analyticsRef = useRef(analytics);
  analyticsRef.current = analytics;

  useEffect(() => {
    const actions: PageAiAction[] = [
      {
        label: "Analyze My Productivity",
        action: "analyze_productivity",
        icon: TrendingUp,
        onAction: () => {
          const a = analyticsRef.current;
          const summary = a
            ? `Tasks completed: ${a.completedTasks}/${a.totalTasks}\nNotes written: ${a.totalNotes}\nFlashcards: ${a.totalFlashcards} (${a.flashcardsDue} due)\nFocus minutes: ${a.totalFocusMinutes}\nHabit completion rate: ${Math.round(a.habitCompletionRate)}%\nCurrent streak: ${a.currentStreak} days\nPomodoro sessions this week: ${a.pomodoroSessionsThisWeek}`
            : "No analytics data available yet.";
          openChat(
            `Analyze my productivity data and provide insights:\n\n${summary}\n\nIdentify my strongest areas, areas for improvement, and suggest specific actionable changes to boost my productivity.`
          );
        },
      },
      {
        label: "Set Productivity Goals",
        action: "set_goals",
        icon: Target,
        onAction: () => {
          const a = analyticsRef.current;
          const summary = a
            ? `Current stats:\n- Tasks: ${a.completedTasks}/${a.totalTasks} completed\n- Focus minutes: ${a.totalFocusMinutes}\n- Habit completion: ${Math.round(a.habitCompletionRate)}%\n- Current streak: ${a.currentStreak} days\n- Notes: ${a.totalNotes}`
            : "No data yet.";
          openChat(
            `Based on my current productivity levels, suggest realistic weekly productivity goals:\n\n${summary}\n\nFor each goal, explain why it matters and how to achieve it.`
          );
        },
      },
    ];
    setPageActions(actions);
    return () => clearPageActions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your productivity and progress across all modules
          </p>
        </div>

        {isLoading ? (
          <AnalyticsSkeleton />
        ) : isError ? (
          <div className="text-center py-16 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Failed to load analytics data.</p>
            <p className="text-sm mt-1">Please try refreshing the page.</p>
          </div>
        ) : analytics ? (
          <>
            {/* ======================================================= */}
            {/* Row 1 -- Key Metric Cards                                */}
            {/* ======================================================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Tasks */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Tasks
                  </CardTitle>
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.completedTasks}
                    <span className="text-base font-normal text-muted-foreground">
                      /{analytics.totalTasks}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analytics.totalTasks > 0
                      ? Math.round(
                          (analytics.completedTasks / analytics.totalTasks) * 100
                        )
                      : 0}
                    % completion rate
                  </p>
                  <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{
                        width: `${
                          analytics.totalTasks > 0
                            ? (analytics.completedTasks / analytics.totalTasks) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Active Projects */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Active Projects
                  </CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.activeProjects}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    out of {analytics.totalProjects} total projects
                  </p>
                  <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{
                        width: `${
                          analytics.totalProjects > 0
                            ? (analytics.activeProjects /
                                analytics.totalProjects) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Focus Time */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Focus Time
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatMinutesAsHours(analytics.totalFocusMinutes)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analytics.pomodoroSessionsThisWeek} sessions this week
                  </p>
                  <div className="mt-2 flex items-center gap-1">
                    <Zap className="h-3 w-3 text-orange-500" />
                    <span className="text-xs text-orange-600 font-medium">
                      {analytics.pomodoroSessionsThisWeek > 0
                        ? "Active"
                        : "No sessions yet"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Streak */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Streak</CardTitle>
                  <Flame className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold flex items-baseline gap-1">
                    {analytics.currentStreak}
                    <span className="text-sm font-normal text-muted-foreground">
                      days
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Longest: {analytics.longestStreak} days
                  </p>
                  <div className="mt-2 flex gap-0.5">
                    {[...Array(7)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 flex-1 rounded-sm ${
                          i < Math.min(analytics.currentStreak, 7)
                            ? "bg-orange-500"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ======================================================= */}
            {/* Row 2 -- Daily Activity Chart (last 30 days)             */}
            {/* ======================================================= */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Daily Activity
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Last 30 days
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-500" />
                    Tasks
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                    Notes
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm bg-purple-500" />
                    Flashcards
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm bg-orange-500" />
                    Pomodoros
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-[10px] text-muted-foreground">
                    <span>{maxDailyTotal}</span>
                    <span>{Math.round(maxDailyTotal / 2)}</span>
                    <span>0</span>
                  </div>

                  {/* Chart area */}
                  <div className="ml-10 relative">
                    {/* Horizontal grid lines */}
                    <div className="absolute inset-0 bottom-6 flex flex-col justify-between pointer-events-none">
                      <div className="border-b border-dashed border-muted" />
                      <div className="border-b border-dashed border-muted" />
                      <div className="border-b border-dashed border-muted" />
                    </div>

                    {/* Bars */}
                    <div className="flex items-end gap-[2px] h-[140px] relative">
                      {analytics.dailyActivity.map((day, idx) => {
                        const total =
                          day.tasks +
                          day.notes +
                          day.flashcards +
                          day.pomodoros;
                        const barHeight =
                          maxDailyTotal > 0
                            ? (total / maxDailyTotal) * 120
                            : 0;
                        const taskH =
                          total > 0 ? (day.tasks / total) * barHeight : 0;
                        const noteH =
                          total > 0 ? (day.notes / total) * barHeight : 0;
                        const flashH =
                          total > 0 ? (day.flashcards / total) * barHeight : 0;
                        const pomoH =
                          total > 0 ? (day.pomodoros / total) * barHeight : 0;

                        return (
                          <div
                            key={day.date}
                            className="flex-1 flex flex-col justify-end items-center cursor-pointer group relative"
                            onMouseEnter={(e) => {
                              const rect =
                                e.currentTarget.getBoundingClientRect();
                              setTooltip({
                                date: day.date,
                                tasks: day.tasks,
                                notes: day.notes,
                                flashcards: day.flashcards,
                                pomodoros: day.pomodoros,
                                x: rect.left + rect.width / 2,
                                y: rect.top,
                              });
                            }}
                            onMouseLeave={() => setTooltip(null)}
                          >
                            <div className="w-full flex flex-col justify-end rounded-t-sm overflow-hidden">
                              {pomoH > 0 && (
                                <div
                                  className="w-full bg-orange-500 transition-all duration-200 group-hover:opacity-80"
                                  style={{ height: `${pomoH}px` }}
                                />
                              )}
                              {flashH > 0 && (
                                <div
                                  className="w-full bg-purple-500 transition-all duration-200 group-hover:opacity-80"
                                  style={{ height: `${flashH}px` }}
                                />
                              )}
                              {noteH > 0 && (
                                <div
                                  className="w-full bg-emerald-500 transition-all duration-200 group-hover:opacity-80"
                                  style={{ height: `${noteH}px` }}
                                />
                              )}
                              {taskH > 0 && (
                                <div
                                  className="w-full bg-blue-500 transition-all duration-200 group-hover:opacity-80"
                                  style={{ height: `${taskH}px` }}
                                />
                              )}
                            </div>
                            {total === 0 && (
                              <div className="w-full h-[2px] bg-muted rounded-full" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* X-axis labels (every 5th day) */}
                    <div className="flex mt-1.5 h-4">
                      {analytics.dailyActivity.map((day, idx) => (
                        <div key={day.date} className="flex-1 text-center">
                          {idx % 5 === 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {formatDateLabel(day.date)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Floating tooltip */}
                  {tooltip && (
                    <div
                      className="fixed z-50 bg-popover text-popover-foreground border rounded-lg shadow-lg px-3 py-2 text-xs pointer-events-none"
                      style={{
                        left: `${tooltip.x}px`,
                        top: `${tooltip.y - 8}px`,
                        transform: "translate(-50%, -100%)",
                      }}
                    >
                      <p className="font-semibold mb-1">{tooltip.date}</p>
                      <div className="space-y-0.5">
                        <p className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-sm bg-blue-500" />
                          Tasks: {tooltip.tasks}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-sm bg-emerald-500" />
                          Notes: {tooltip.notes}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-sm bg-purple-500" />
                          Flashcards: {tooltip.flashcards}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-sm bg-orange-500" />
                          Pomodoros: {tooltip.pomodoros}
                        </p>
                      </div>
                      <p className="mt-1 pt-1 border-t font-medium">
                        Total:{" "}
                        {tooltip.tasks +
                          tooltip.notes +
                          tooltip.flashcards +
                          tooltip.pomodoros}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ======================================================= */}
            {/* Row 3 -- Weekly Trends & Module Stats                    */}
            {/* ======================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly Trends -- Horizontal bar chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Weekly Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.weeklyTrends.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No weekly data yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {analytics.weeklyTrends.map((week) => {
                        const barWidth =
                          maxWeeklyProductivity > 0
                            ? (week.productivity / maxWeeklyProductivity) * 100
                            : 0;

                        return (
                          <div key={week.week} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground font-medium min-w-[80px]">
                                {week.week}
                              </span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatMinutesAsHours(week.focusMinutes)}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {week.productivity} pts
                                </Badge>
                              </div>
                            </div>
                            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-500"
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Module Stats Grid */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    Module Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Notes Count */}
                    <div className="rounded-lg border bg-card p-3 space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span className="text-xs font-medium">Notes</span>
                      </div>
                      <p className="text-xl font-bold">
                        {analytics.totalNotes}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Total notes created
                      </p>
                    </div>

                    {/* Flashcards Due */}
                    <div className="rounded-lg border bg-card p-3 space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Layers className="h-4 w-4 text-purple-500" />
                        <span className="text-xs font-medium">Flashcards</span>
                      </div>
                      <p className="text-xl font-bold">
                        {analytics.flashcardsDue}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{analytics.totalFlashcards}
                        </span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Due for review
                      </p>
                    </div>

                    {/* Habits Completion */}
                    <div className="rounded-lg border bg-card p-3 space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Flame className="h-4 w-4 text-orange-500" />
                        <span className="text-xs font-medium">Habits</span>
                      </div>
                      <p className="text-xl font-bold">
                        {Math.round(analytics.habitCompletionRate)}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Completion rate ({analytics.totalHabits} active)
                      </p>
                    </div>

                    {/* Pomodoro Sessions */}
                    <div className="rounded-lg border bg-card p-3 space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-medium">Pomodoro</span>
                      </div>
                      <p className="text-xl font-bold">
                        {analytics.pomodoroSessionsThisWeek}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Sessions this week
                      </p>
                    </div>

                    {/* Tasks Completed */}
                    <div className="rounded-lg border bg-card p-3 space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CheckSquare className="h-4 w-4 text-green-500" />
                        <span className="text-xs font-medium">Completed</span>
                      </div>
                      <p className="text-xl font-bold">
                        {analytics.completedTasks}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Tasks done
                      </p>
                    </div>

                    {/* Projects */}
                    <div className="rounded-lg border bg-card p-3 space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Target className="h-4 w-4 text-indigo-500" />
                        <span className="text-xs font-medium">Projects</span>
                      </div>
                      <p className="text-xl font-bold">
                        {analytics.activeProjects}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{analytics.totalProjects}
                        </span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Active / Total
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ======================================================= */}
            {/* Row 4 -- AI Weekly Review                                */}
            {/* ======================================================= */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  AI Weekly Review
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => reviewMutation.mutate()}
                  disabled={reviewMutation.isPending}
                >
                  {reviewMutation.isPending ? (
                    <>
                      <span className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-1" />
                      Generate Review
                    </>
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                {reviewMutation.isError && (
                  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    Failed to generate review. Please check your AI settings and
                    try again.
                  </div>
                )}
                {weeklyReview ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {weeklyReview.split("\n").map((line, idx) => {
                      if (!line.trim()) return <br key={idx} />;
                      // Heading-like lines (starting with # or **)
                      if (line.startsWith("### ")) {
                        return (
                          <h4
                            key={idx}
                            className="text-sm font-bold mt-4 mb-1"
                          >
                            {line.replace("### ", "")}
                          </h4>
                        );
                      }
                      if (line.startsWith("## ")) {
                        return (
                          <h3
                            key={idx}
                            className="text-base font-bold mt-4 mb-1"
                          >
                            {line.replace("## ", "")}
                          </h3>
                        );
                      }
                      if (line.startsWith("# ")) {
                        return (
                          <h2
                            key={idx}
                            className="text-lg font-bold mt-4 mb-2"
                          >
                            {line.replace("# ", "")}
                          </h2>
                        );
                      }
                      // Bold lines
                      if (line.startsWith("**") && line.endsWith("**")) {
                        return (
                          <p key={idx} className="font-semibold mt-2">
                            {line.replace(/\*\*/g, "")}
                          </p>
                        );
                      }
                      // Bullet points
                      if (line.startsWith("- ") || line.startsWith("* ")) {
                        return (
                          <p
                            key={idx}
                            className="text-sm text-muted-foreground pl-4 py-0.5"
                          >
                            <span className="text-primary mr-1.5">
                              &bull;
                            </span>
                            {line.slice(2)}
                          </p>
                        );
                      }
                      // Regular paragraph
                      return (
                        <p
                          key={idx}
                          className="text-sm text-muted-foreground leading-relaxed"
                        >
                          {line}
                        </p>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">
                      Click &quot;Generate Review&quot; to get an AI-powered
                      summary of your week&apos;s productivity, accomplishments,
                      and suggestions.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No analytics data available yet.</p>
            <p className="text-sm mt-1">
              Start completing tasks, writing notes, and reviewing flashcards to
              see your stats.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

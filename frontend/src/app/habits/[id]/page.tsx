"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Flame, Trophy, Calendar, TrendingUp, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HabitCalendar } from "@/components/habits/HabitCalendar";
import { WeeklyCompletionChart, MonthlyRateChart } from "@/components/habits/HabitChart";
import { StreakBadge } from "@/components/habits/StreakBadge";
import { fetchHabit, fetchHabitStats, fetchCompletions, deleteHabit } from "@/lib/api/habits";
import type { Habit, HabitStats, HabitCompletion } from "@/types";

export default function HabitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => deleteHabit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["habits-today"] });
      toast.success("Habit deleted");
      router.push("/habits");
    },
    onError: () => toast.error("Failed to delete habit"),
  });

  const { data: habit } = useQuery<Habit>({
    queryKey: ["habit", id],
    queryFn: () => fetchHabit(id),
    enabled: !!id,
  });

  const { data: stats } = useQuery<HabitStats>({
    queryKey: ["habit-stats", id],
    queryFn: () => fetchHabitStats(id),
    enabled: !!id,
  });

  const today = new Date().toISOString().split("T")[0];
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: completions = [] } = useQuery<HabitCompletion[]>({
    queryKey: ["habit-completions", id],
    queryFn: () => fetchCompletions(id, ninetyDaysAgo, today),
    enabled: !!id,
  });

  if (!habit || !stats) {
    return (
      <AppShell>
        <div className="space-y-4">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: habit.color }}
              />
              <h1 className="text-3xl font-bold tracking-tight">{habit.name}</h1>
              <StreakBadge streak={habit.currentStreak} size="md" />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
          {habit.description && (
            <p className="text-muted-foreground mt-1">{habit.description}</p>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Flame className="h-4 w-4" />
                Current Streak
              </div>
              <p className="text-2xl font-bold">{stats.currentStreak} days</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Trophy className="h-4 w-4" />
                Longest Streak
              </div>
              <p className="text-2xl font-bold">{stats.longestStreak} days</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                Total Completions
              </div>
              <p className="text-2xl font-bold">{stats.totalCompletions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                30-Day Rate
              </div>
              <p className="text-2xl font-bold">{stats.completionRate.toFixed(0)}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Calendar Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Completion Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <HabitCalendar completions={completions} color={habit.color} />
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Weekly Completions</CardTitle>
            </CardHeader>
            <CardContent>
              <WeeklyCompletionChart data={stats.weeklyData} color={habit.color} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Monthly Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyRateChart data={stats.monthlyData} color={habit.color} />
            </CardContent>
          </Card>
        </div>

        {/* Recent Completions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Recent Completions ({completions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {completions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completions yet</p>
            ) : (
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {completions.slice(0, 30).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between py-1.5 px-2 rounded text-sm hover:bg-muted/50"
                  >
                    <span>
                      {new Date(c.completedDate).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.completedAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Habit</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{habit.name}&quot;? All
              completion history will be lost. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

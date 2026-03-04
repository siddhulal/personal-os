"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, CalendarCheck, LayoutGrid } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HabitCard } from "@/components/habits/HabitCard";
import { HabitCheckbox } from "@/components/habits/HabitCheckbox";
import { StreakBadge } from "@/components/habits/StreakBadge";
import { HabitForm, type HabitFormData } from "@/components/habits/HabitForm";
import {
  fetchHabits,
  fetchTodayHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  toggleHabitCompletion,
} from "@/lib/api/habits";
import type { Habit } from "@/types";
import Link from "next/link";

export default function HabitsPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data: todayHabits = [], isLoading: loadingToday } = useQuery<Habit[]>({
    queryKey: ["habits-today"],
    queryFn: fetchTodayHabits,
  });

  const { data: allHabits = [], isLoading: loadingAll } = useQuery<Habit[]>({
    queryKey: ["habits"],
    queryFn: fetchHabits,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => toggleHabitCompletion(id),
    onMutate: (id) => setTogglingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits-today"] });
      queryClient.invalidateQueries({ queryKey: ["habits"] });
    },
    onError: () => toast.error("Failed to toggle habit"),
    onSettled: () => setTogglingId(null),
  });

  const createMutation = useMutation({
    mutationFn: createHabit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["habits-today"] });
      toast.success("Habit created");
      setFormOpen(false);
    },
    onError: () => toast.error("Failed to create habit"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: HabitFormData }) =>
      updateHabit(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["habits-today"] });
      toast.success("Habit updated");
      setEditingHabit(null);
    },
    onError: () => toast.error("Failed to update habit"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHabit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["habits-today"] });
      toast.success("Habit deleted");
    },
    onError: () => toast.error("Failed to delete habit"),
  });

  function handleFormSubmit(data: HabitFormData) {
    if (editingHabit) {
      updateMutation.mutate({ id: editingHabit.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  function handleEdit(habit: Habit) {
    setEditingHabit(habit);
  }

  const completedCount = todayHabits.filter((h) => h.completedToday).length;
  const totalToday = todayHabits.length;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Habits</h1>
            <p className="text-muted-foreground mt-1">
              Build consistency, one day at a time
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/habits/insights">
              <Button variant="outline" size="sm">
                Insights
              </Button>
            </Link>
            <Button onClick={() => { setEditingHabit(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              New Habit
            </Button>
          </div>
        </div>

        <Tabs defaultValue="today" className="space-y-4">
          <TabsList>
            <TabsTrigger value="today" className="gap-2">
              <CalendarCheck className="h-4 w-4" />
              Today ({completedCount}/{totalToday})
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              All Habits
            </TabsTrigger>
          </TabsList>

          {/* Today Tab */}
          <TabsContent value="today" className="space-y-3">
            {loadingToday ? (
              <TodaySkeleton />
            ) : todayHabits.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarCheck className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-lg font-medium">No habits for today</p>
                <p className="text-sm mt-1">Create a habit to get started</p>
              </div>
            ) : (
              <>
                {/* Progress bar */}
                <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/20">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">Today&apos;s Progress</span>
                      <span>{completedCount}/{totalToday}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${totalToday > 0 ? (completedCount / totalToday) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Today's habit list */}
                <div className="space-y-2">
                  {todayHabits.map((habit) => (
                    <div
                      key={habit.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        habit.completedToday ? "bg-muted/30 opacity-75" : ""
                      }`}
                    >
                      <HabitCheckbox
                        checked={habit.completedToday}
                        color={habit.color}
                        onToggle={() => toggleMutation.mutate(habit.id)}
                        disabled={togglingId === habit.id}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/habits/${habit.id}`}
                            className={`text-sm font-medium hover:underline ${
                              habit.completedToday ? "line-through" : ""
                            }`}
                          >
                            {habit.name}
                          </Link>
                          <StreakBadge streak={habit.currentStreak} />
                        </div>
                        {habit.isMicroHabit && habit.microHabitCue && (
                          <p className="text-xs text-primary mt-0.5">
                            Cue: {habit.microHabitCue}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* All Habits Tab */}
          <TabsContent value="all" className="space-y-3">
            {loadingAll ? (
              <AllSkeleton />
            ) : allHabits.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <LayoutGrid className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-lg font-medium">No habits yet</p>
                <Button
                  variant="link"
                  onClick={() => { setEditingHabit(null); setFormOpen(true); }}
                >
                  Create your first habit
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allHabits.map((habit) => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    onToggle={(id) => toggleMutation.mutate(id)}
                    onEdit={handleEdit}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    toggling={togglingId === habit.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <HabitForm
        open={formOpen || !!editingHabit}
        onOpenChange={(open) => {
          if (!open) {
            setFormOpen(false);
            setEditingHabit(null);
          }
        }}
        onSubmit={handleFormSubmit}
        habit={editingHabit}
        loading={createMutation.isPending || updateMutation.isPending}
      />
    </AppShell>
  );
}

function TodaySkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
          <div className="w-7 h-7 rounded-full bg-muted animate-pulse" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AllSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="p-4 rounded-lg border">
          <div className="h-4 w-24 bg-muted rounded animate-pulse mb-2" />
          <div className="h-3 w-16 bg-muted rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

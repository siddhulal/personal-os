"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAiChat, type PageAiAction } from "@/lib/ai-chat-context";
import { toast } from "sonner";
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Zap,
  Clock,
  Target,
  CalendarClock,
  FileText,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchPomodoroSessions,
  createPomodoroSession,
  fetchPomodoroStats,
} from "@/lib/api/pomodoro";
import api from "@/lib/api";
import type { PomodoroSession, PomodoroStats, Task } from "@/types";

type TimerState = "IDLE" | "FOCUS" | "BREAK";

const FOCUS_PRESETS = [15, 25, 30, 45, 50];
const BREAK_PRESETS = [5, 10, 15];

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PomodoroPage() {
  const queryClient = useQueryClient();

  // Timer configuration
  const [focusDuration, setFocusDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  // Timer state
  const [timerState, setTimerState] = useState<TimerState>("IDLE");
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Data queries
  const { data: sessions = [], isLoading: loadingSessions } = useQuery<PomodoroSession[]>({
    queryKey: ["pomodoro-sessions"],
    queryFn: fetchPomodoroSessions,
  });

  const { data: stats } = useQuery<PomodoroStats>({
    queryKey: ["pomodoro-stats"],
    queryFn: fetchPomodoroStats,
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["tasks-for-pomodoro"],
    queryFn: async () => {
      const res = await api.get("/api/tasks?size=100");
      return res.data.content ?? [];
    },
  });

  // Save session mutation
  const saveMutation = useMutation({
    mutationFn: createPomodoroSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pomodoro-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["pomodoro-stats"] });
    },
    onError: () => toast.error("Failed to save session"),
  });

  // Compute total duration for current phase
  const totalSeconds =
    timerState === "BREAK" ? breakDuration * 60 : focusDuration * 60;

  // Progress for SVG ring (0 to 1)
  const progress =
    timerState === "IDLE" ? 0 : 1 - remainingSeconds / totalSeconds;

  // Handle timer completion
  const handleTimerComplete = useCallback(() => {
    if (timerState === "FOCUS") {
      // Save completed focus session
      const now = new Date().toISOString();
      saveMutation.mutate({
        taskId: selectedTaskId || undefined,
        durationMinutes: focusDuration,
        breakMinutes: breakDuration,
        status: "COMPLETED",
        startedAt: sessionStartedAt || now,
        completedAt: now,
        notes: notes || undefined,
      });
      toast.success("Focus session complete! Time for a break.");

      // Transition to break
      setTimerState("BREAK");
      setRemainingSeconds(breakDuration * 60);
      setIsPaused(false);
    } else if (timerState === "BREAK") {
      toast.success("Break is over! Ready for another round?");
      setTimerState("IDLE");
      setRemainingSeconds(focusDuration * 60);
      setIsPaused(false);
      setSessionStartedAt(null);
    }
  }, [
    timerState,
    focusDuration,
    breakDuration,
    selectedTaskId,
    notes,
    sessionStartedAt,
    saveMutation,
  ]);

  // Interval effect
  useEffect(() => {
    if (timerState !== "IDLE" && !isPaused) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            // Use setTimeout to avoid state update during render
            setTimeout(() => handleTimerComplete(), 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerState, isPaused, handleTimerComplete]);

  // Actions
  function handleStart() {
    setTimerState("FOCUS");
    setRemainingSeconds(focusDuration * 60);
    setIsPaused(false);
    setSessionStartedAt(new Date().toISOString());
  }

  function handlePauseResume() {
    setIsPaused((prev) => !prev);
  }

  function handleReset() {
    if (timerState === "FOCUS" && remainingSeconds < totalSeconds && sessionStartedAt) {
      // Save cancelled session
      const elapsed = totalSeconds - remainingSeconds;
      const elapsedMinutes = Math.max(1, Math.round(elapsed / 60));
      saveMutation.mutate({
        taskId: selectedTaskId || undefined,
        durationMinutes: elapsedMinutes,
        breakMinutes: 0,
        status: "CANCELLED",
        startedAt: sessionStartedAt,
        completedAt: new Date().toISOString(),
        notes: notes || undefined,
      });
    }
    setTimerState("IDLE");
    setRemainingSeconds(focusDuration * 60);
    setIsPaused(false);
    setSessionStartedAt(null);
  }

  // Update remaining when duration changes in IDLE
  useEffect(() => {
    if (timerState === "IDLE") {
      setRemainingSeconds(focusDuration * 60);
    }
  }, [focusDuration, timerState]);

  // ── AI floating button actions ──────────────────────────────────────────────
  const { setPageActions, clearPageActions, openChat } = useAiChat();

  const aiActionsContext = useMemo(() => {
    const todoTasks = tasks.filter(
      (t) => t.status === "TODO" || t.status === "IN_PROGRESS"
    );
    const taskSummary = todoTasks
      .slice(0, 10)
      .map((t) => `- [${t.priority}] ${t.title}`)
      .join("\n");

    const recentSessionsSummary = sessions
      .slice(0, 5)
      .map(
        (s) =>
          `- ${s.durationMinutes}min ${s.status.toLowerCase()}${s.taskTitle ? ` (${s.taskTitle})` : ""}${s.notes ? `: ${s.notes}` : ""}`
      )
      .join("\n");

    return { taskSummary, recentSessionsSummary };
  }, [tasks, sessions]);

  useEffect(() => {
    const actions: PageAiAction[] = [
      {
        label: "Plan Focus Session",
        action: "plan_focus_session",
        icon: CalendarClock,
        onAction: () => {
          openChat(
            `Help me plan my next focus session. Here are my current tasks:\n\n${aiActionsContext.taskSummary || "No tasks found."}\n\nBased on priorities and deadlines, what should I focus on next? Suggest a task and an appropriate focus duration.`
          );
        },
      },
      {
        label: "Session Summary",
        action: "session_summary",
        icon: FileText,
        onAction: () => {
          openChat(
            `Summarize my recent focus sessions:\n\n${aiActionsContext.recentSessionsSummary || "No recent sessions."}\n\nTotal sessions: ${stats?.totalSessions ?? 0}\nTotal focus minutes: ${stats?.totalMinutes ?? 0}\nSessions this week: ${stats?.sessionsThisWeek ?? 0}\n\nPlease provide insights on my productivity patterns and suggestions for improvement.`
          );
        },
      },
    ];
    setPageActions(actions);
    return () => clearPageActions();
  }, [setPageActions, clearPageActions, openChat, aiActionsContext, stats]);

  // SVG ring constants
  const radius = 120;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const strokeDashoffset = circumference - progress * circumference;

  const ringColor =
    timerState === "BREAK"
      ? "stroke-green-500"
      : timerState === "FOCUS"
      ? "stroke-primary"
      : "stroke-muted";

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Timer className="h-8 w-8" />
            Focus Timer
          </h1>
          <p className="text-muted-foreground mt-1">
            Stay focused with the Pomodoro technique
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalSessions ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total Sessions</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalMinutes ?? 0}</p>
                <p className="text-xs text-muted-foreground">Focus Minutes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Zap className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats?.averageMinutes ? Math.round(stats.averageMinutes) : 0}
                </p>
                <p className="text-xs text-muted-foreground">Avg Minutes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Coffee className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.sessionsThisWeek ?? 0}</p>
                <p className="text-xs text-muted-foreground">This Week</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timer Section */}
        <Card>
          <CardContent className="p-8 md:p-10">
            <div className="flex flex-col items-center gap-8">
              {/* State Badge */}
              <Badge
                variant={
                  timerState === "FOCUS"
                    ? "default"
                    : timerState === "BREAK"
                    ? "secondary"
                    : "outline"
                }
                className="text-sm px-4 py-1"
              >
                {timerState === "FOCUS"
                  ? "Focusing"
                  : timerState === "BREAK"
                  ? "Break Time"
                  : "Ready"}
              </Badge>

              {/* SVG Timer Ring */}
              <div className="relative">
                <svg
                  width={radius * 2}
                  height={radius * 2}
                  className="-rotate-90"
                >
                  <circle
                    cx={radius}
                    cy={radius}
                    r={normalizedRadius}
                    fill="none"
                    strokeWidth={stroke}
                    className="stroke-muted"
                  />
                  <circle
                    cx={radius}
                    cy={radius}
                    r={normalizedRadius}
                    fill="none"
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    className={`${ringColor} transition-[stroke-dashoffset] duration-1000 ease-linear`}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl md:text-6xl font-mono font-bold tracking-tight">
                    {formatTime(remainingSeconds)}
                  </span>
                  {timerState === "FOCUS" && selectedTask && (
                    <span className="text-xs text-muted-foreground mt-2 max-w-[180px] truncate text-center">
                      {selectedTask.title}
                    </span>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                {timerState === "IDLE" ? (
                  <Button size="lg" onClick={handleStart} className="gap-2 px-8">
                    <Play className="h-5 w-5" />
                    Start Focus
                  </Button>
                ) : (
                  <>
                    <Button
                      size="lg"
                      variant={isPaused ? "default" : "secondary"}
                      onClick={handlePauseResume}
                      className="gap-2"
                    >
                      {isPaused ? (
                        <>
                          <Play className="h-5 w-5" />
                          Resume
                        </>
                      ) : (
                        <>
                          <Pause className="h-5 w-5" />
                          Pause
                        </>
                      )}
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handleReset}
                      className="gap-2"
                    >
                      <RotateCcw className="h-5 w-5" />
                      Reset
                    </Button>
                  </>
                )}
              </div>

              {/* Configuration (only when IDLE) */}
              {timerState === "IDLE" && (
                <div className="w-full max-w-sm mx-auto space-y-5 pt-2 border-t">
                  {/* Focus Duration */}
                  <div className="space-y-2 pt-4">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      Focus Duration
                    </label>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {FOCUS_PRESETS.map((mins) => (
                        <Button
                          key={mins}
                          size="sm"
                          variant={focusDuration === mins ? "default" : "outline"}
                          onClick={() => setFocusDuration(mins)}
                          className="min-w-[48px]"
                        >
                          {mins}m
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Break Duration */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Coffee className="h-4 w-4 text-green-500" />
                      Break Duration
                    </label>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {BREAK_PRESETS.map((mins) => (
                        <Button
                          key={mins}
                          size="sm"
                          variant={breakDuration === mins ? "default" : "outline"}
                          onClick={() => setBreakDuration(mins)}
                          className="min-w-[48px]"
                        >
                          {mins}m
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Task Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Link to Task (optional)</label>
                    <Select
                      value={selectedTaskId ?? "none"}
                      onValueChange={(val) =>
                        setSelectedTaskId(val === "none" ? null : val)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a task..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No task</SelectItem>
                        {tasks.map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Session Notes */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Session Notes (optional)</label>
                    <Input
                      placeholder="What are you working on?"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Session History */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Sessions
          </h2>

          {loadingSessions ? (
            <SessionSkeleton />
          ) : sessions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Timer className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-lg font-medium">No sessions yet</p>
                <p className="text-sm mt-1">
                  Start your first focus session above
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 20).map((session) => (
                <Card key={session.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div
                      className={`p-2 rounded-lg ${
                        session.status === "COMPLETED"
                          ? "bg-green-500/10"
                          : session.status === "CANCELLED"
                          ? "bg-red-500/10"
                          : "bg-yellow-500/10"
                      }`}
                    >
                      {session.status === "COMPLETED" ? (
                        <Target className="h-4 w-4 text-green-500" />
                      ) : session.status === "CANCELLED" ? (
                        <RotateCcw className="h-4 w-4 text-red-500" />
                      ) : (
                        <Timer className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {session.durationMinutes} min focus
                        </span>
                        <Badge
                          variant={
                            session.status === "COMPLETED"
                              ? "default"
                              : session.status === "CANCELLED"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {session.status.toLowerCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(session.startedAt)}
                        </span>
                        {session.taskTitle && (
                          <span className="text-xs text-muted-foreground truncate">
                            -- {session.taskTitle}
                          </span>
                        )}
                      </div>
                      {session.notes && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {session.notes}
                        </p>
                      )}
                    </div>
                    {session.breakMinutes > 0 && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        +{session.breakMinutes}m break
                      </span>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function SessionSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-muted animate-pulse" />
            <div className="flex-1">
              <div className="h-4 w-24 bg-muted rounded animate-pulse mb-1" />
              <div className="h-3 w-36 bg-muted rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
